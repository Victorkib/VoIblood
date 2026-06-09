/**
 * POST /api/requests/[id]/actions
 * Special request actions: approve, reject, allocate, fulfill, deliver, cancel
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Request from '@/lib/models/Request'
import BloodInventory from '@/lib/models/BloodInventory'
import { getCurrentUser, canAccessOrganization } from '@/lib/session'
import {
  hasOrgCapability,
  ORG_CAPABILITIES,
  isSuperAdmin,
} from '@/lib/rbac'
import Organization from '@/lib/models/Organization'
import {
  logAuditEvent,
  AUDIT_ACTIONS,
  AUDIT_SEVERITY,
  getAuditContextFromRequest,
} from '@/lib/audit-logger'

function buildTransferredUnitId(baseUnitId) {
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `${baseUnitId}-TX-${suffix}`
}

async function transferAllocatedUnits({
  req,
  request,
  user,
  sourceOrg,
  requestingOrg,
}) {
  const allocatedUnits = await BloodInventory.find({
    _id: { $in: req.allocatedUnits },
    organizationId: req.sourceOrganizationId,
  })

  if (allocatedUnits.length !== req.allocatedUnits.length) {
    throw new Error('One or more allocated units are missing in source inventory')
  }

  const auditContext = getAuditContextFromRequest(request)

  for (const sourceUnit of allocatedUnits) {
    const existingTransferredUnit = await BloodInventory.findOne({
      organizationId: req.requestingOrganizationId,
      'transfer.receivedFromUnitId': sourceUnit.unitId,
      'transfer.transferredRequestId': req._id,
    })

    if (existingTransferredUnit) {
      if (!sourceUnit.transfer?.isTransferredOut) {
        sourceUnit.transfer = {
          ...(sourceUnit.transfer || {}),
          isTransferredOut: true,
          transferredOutAt: sourceUnit.transfer?.transferredOutAt || new Date(),
          transferredToOrganizationId: req.requestingOrganizationId,
          transferredRequestId: req._id,
        }
        sourceUnit.reservedBy = null
        if (sourceUnit.status === 'reserved') {
          sourceUnit.status = 'used'
          sourceUnit.usedDate = sourceUnit.usedDate || new Date()
          sourceUnit.usedAt = sourceUnit.usedAt || 'Transferred to requesting organization'
        }
        await sourceUnit.save()
      }
      continue
    }

    const transferredUnit = await BloodInventory.create({
      unitId: buildTransferredUnitId(sourceUnit.unitId),
      bloodType: sourceUnit.bloodType,
      component: sourceUnit.component,
      volume: sourceUnit.volume,
      donorId: sourceUnit.donorId,
      donorName: sourceUnit.donorName,
      donorEmail: sourceUnit.donorEmail,
      collectionDate: sourceUnit.collectionDate,
      collectionFacility: sourceUnit.collectionFacility,
      technician: sourceUnit.technician,
      testedFor: sourceUnit.testedFor,
      expiryDate: sourceUnit.expiryDate,
      storageLocation: sourceUnit.storageLocation,
      temperature: sourceUnit.temperature,
      status: 'available',
      organizationId: req.requestingOrganizationId,
      driveId: sourceUnit.driveId,
      driveName: sourceUnit.driveName,
      qualityNotes: sourceUnit.qualityNotes,
      hematocritLevel: sourceUnit.hematocritLevel,
      plateletCount: sourceUnit.plateletCount,
      notes: `Transferred from ${sourceOrg?.name || 'source org'} unit ${sourceUnit.unitId} for request ${req.requestId}`,
      transfer: {
        isTransferredOut: false,
        receivedFromOrganizationId: req.sourceOrganizationId,
        receivedFromUnitId: sourceUnit.unitId,
        receivedAt: new Date(),
        transferredRequestId: req._id,
      },
    })

    sourceUnit.status = 'used'
    sourceUnit.usedDate = new Date()
    sourceUnit.usedAt = 'Transferred to requesting organization'
    sourceUnit.transfer = {
      ...(sourceUnit.transfer || {}),
      isTransferredOut: true,
      transferredOutAt: new Date(),
      transferredToOrganizationId: req.requestingOrganizationId,
      transferredRequestId: req._id,
    }
    sourceUnit.notes = sourceUnit.notes
      ? `${sourceUnit.notes}\nTransferred to ${requestingOrg?.name || 'requesting org'} as ${transferredUnit.unitId} for request ${req.requestId}`
      : `Transferred to ${requestingOrg?.name || 'requesting org'} as ${transferredUnit.unitId} for request ${req.requestId}`
    sourceUnit.reservedBy = null
    await sourceUnit.save()

    await logAuditEvent({
      action: AUDIT_ACTIONS.INVENTORY_UPDATE,
      userId: user._id,
      organizationId: req.sourceOrganizationId.toString(),
      resourceType: 'inventory',
      resourceId: sourceUnit._id.toString(),
      severity: AUDIT_SEVERITY.HIGH,
      changes: {
        fromStatus: 'reserved',
        toStatus: 'used',
        transferOut: true,
        transferredToOrganizationId: req.requestingOrganizationId.toString(),
        transferredUnitId: transferredUnit.unitId,
        requestId: req.requestId,
      },
      description: `Transferred unit ${sourceUnit.unitId} to ${requestingOrg?.name || 'requesting org'} for request ${req.requestId}`,
      ...auditContext,
    })

    await logAuditEvent({
      action: AUDIT_ACTIONS.INVENTORY_CREATE,
      userId: user._id,
      organizationId: req.requestingOrganizationId.toString(),
      resourceType: 'inventory',
      resourceId: transferredUnit._id.toString(),
      severity: AUDIT_SEVERITY.HIGH,
      changes: {
        receivedFromOrganizationId: req.sourceOrganizationId.toString(),
        sourceUnitId: sourceUnit.unitId,
        createdUnitId: transferredUnit.unitId,
        requestId: req.requestId,
      },
      description: `Received transferred unit ${transferredUnit.unitId} from ${sourceOrg?.name || 'source org'} for request ${req.requestId}`,
      ...auditContext,
    })
  }
}

export async function POST(request, { params }) {
  try {
    await connectDB()

    const resolvedParams = await params
    const { id } = resolvedParams
    const { action, ...actionData } = await request.json()

    const user = await getCurrentUser(request.cookies)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const req = await Request.findById(id)

    if (!req) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    const sourceOrg = await Organization.findById(req.sourceOrganizationId).lean()
    const requestingOrg = await Organization.findById(req.requestingOrganizationId).lean()

    const canAsSupplier =
      isSuperAdmin(user.role) ||
      canAccessOrganization(user, req.sourceOrganizationId.toString())
    const canAsRequester =
      isSuperAdmin(user.role) ||
      canAccessOrganization(user, req.requestingOrganizationId.toString())
    const supplierAllowed = hasOrgCapability(
      sourceOrg,
      ORG_CAPABILITIES.FULFILL_REQUESTS
    )
    const requesterAllowed = hasOrgCapability(
      requestingOrg,
      ORG_CAPABILITIES.REQUEST_BLOOD
    )

    let message = ''
    let result = null

    switch (action) {
      case 'approve':
        if (!canAsSupplier || !supplierAllowed) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
        const { userId: approveUserId } = actionData
        if (!approveUserId && !user?._id) {
          return NextResponse.json(
            { error: 'User ID is required for approval' },
            { status: 400 }
          )
        }
        await req.approve(approveUserId || user._id)
        message = 'Request approved successfully'
        result = req
        break

      case 'reject':
        if (!canAsSupplier || !supplierAllowed) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
        const { reason, userId: rejectUserId } = actionData
        if (!reason || (!rejectUserId && !user?._id)) {
          return NextResponse.json(
            { error: 'Rejection reason and user ID are required' },
            { status: 400 }
          )
        }
        await req.reject(rejectUserId || user._id, reason)
        message = 'Request rejected successfully'
        result = req
        break

      case 'allocate':
        if (!canAsSupplier || !supplierAllowed) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
        const { unitIds } = actionData
        if (!unitIds || !Array.isArray(unitIds) || unitIds.length === 0) {
          return NextResponse.json(
            { error: 'Unit IDs are required' },
            { status: 400 }
          )
        }

        // Validate units exist and are available
        const units = await BloodInventory.find({
          _id: { $in: unitIds },
          organizationId: req.sourceOrganizationId,
        })
        if (units.length !== unitIds.length) {
          return NextResponse.json(
            { error: 'One or more units not found in your inventory' },
            { status: 404 }
          )
        }

        // Reserve all units
        for (const unit of units) {
          if (unit.status !== 'available') {
            return NextResponse.json(
              { error: `Unit ${unit.unitId} is not available` },
              { status: 400 }
            )
          }
          await unit.reserve(id)
        }

        await req.allocateUnits(unitIds)
        message = 'Units allocated successfully'
        result = req
        break

      case 'fulfill':
        if (!canAsSupplier || !supplierAllowed) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
        if (req.allocatedUnits.length === 0) {
          return NextResponse.json(
            { error: 'No units allocated for this request' },
            { status: 400 }
          )
        }
        // Fulfillment is finalized only at delivery confirmation.
        // Keep this action as a readiness checkpoint.
        await req.markReadyForDelivery()
        message = 'Request is ready for delivery. Confirm delivery to complete fulfillment.'
        result = req
        break

      case 'deliver':
        if (!canAsSupplier || !supplierAllowed) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
        if (req.status !== 'ready_for_delivery') {
          return NextResponse.json(
            { error: 'Request must be marked ready for delivery before confirming delivery' },
            { status: 400 }
          )
        }
        const { deliveredBy } = actionData
        if (!deliveredBy) {
          return NextResponse.json(
            { error: 'Delivered by information is required' },
            { status: 400 }
          )
        }
        await transferAllocatedUnits({ req, request, user, sourceOrg, requestingOrg })
        if (req.status !== 'fulfilled') {
          await req.markFulfilled()
        }
        await req.markDelivered(deliveredBy)
        message = 'Request marked as delivered'
        result = req
        break

      case 'cancel':
        if (!canAsRequester || !requesterAllowed) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
        const { cancelReason = '' } = actionData
        await req.cancel(cancelReason)
        message = 'Request cancelled successfully'
        result = req
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message,
      data: result,
    })
  } catch (error) {
    console.error('POST /api/requests/[id]/actions error:', error)
    return NextResponse.json(
      { error: 'Failed to perform action', details: error.message },
      { status: 500 }
    )
  }
}
