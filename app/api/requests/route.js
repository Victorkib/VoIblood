/**
 * GET /api/requests - List all requests with filtering
 * POST /api/requests - Create a new blood request
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Request from '@/lib/models/Request'
import Organization from '@/lib/models/Organization'
import crypto from 'crypto'
import {
  resolveOrgContext,
  assertAnyOrgCapability,
  assertOrgCapability,
  ORG_CAPABILITIES,
} from '@/lib/api/org-capability-guard'
import { getRateLimitInfo, createRateLimitError } from '@/lib/rate-limiter'
import { sendBloodRequestNotification } from '@/lib/email-service'
import { logAuditEvent, AUDIT_ACTIONS, AUDIT_SEVERITY, getAuditContextFromRequest } from '@/lib/audit-logger'

/**
 * GET /api/requests
 * Query Parameters:
 * - organizationId (required)
 * - status
 * - urgency
 * - search
 * - page
 * - limit
 */
export async function GET(request) {
  const rateLimitInfo = getRateLimitInfo(request, 'create')
  if (!rateLimitInfo.allowed) {
    return NextResponse.json(createRateLimitError(rateLimitInfo), { status: 429 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    const ctx = await resolveOrgContext(request, organizationId)
    if (ctx.error) return ctx.error
    const denied = assertAnyOrgCapability(
      ctx.organization,
      [ORG_CAPABILITIES.REQUEST_BLOOD, ORG_CAPABILITIES.FULFILL_REQUESTS],
      ctx.user
    )
    if (denied) return denied

    await connectDB()
    const status = searchParams.get('status')
    const urgency = searchParams.get('urgency')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      )
    }

    const org = await Organization.findById(organizationId).select('type').lean()
    const isHospital = org?.type === 'hospital'
    const query = isHospital
      ? { requestingOrganizationId: organizationId }
      : { sourceOrganizationId: organizationId }

    if (status) query.status = status
    if (urgency) query.urgency = urgency

    if (search) {
      const searchRegex = new RegExp(search, 'i')
      query.$or = [
        { requestId: searchRegex },
        { patientName: searchRegex },
        { requestingOrganizationName: searchRegex },
      ]
    }

    const skip = (page - 1) * limit

    const requests = await Request.find(query)
      .populate('sourceOrganizationId', 'name type city')
      .populate('requestingOrganizationId', 'name type city')
      .populate('approvedBy', 'fullName email')
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await Request.countDocuments(query)

    return NextResponse.json({
      success: true,
      data: requests.map((req) => {
        const sourceOrgName =
          req.sourceOrganizationId?.name ||
          req.sourceOrganizationName ||
          'Unknown organization'
        const requestingOrgName =
          req.requestingOrganizationId?.name ||
          req.requestingOrganizationName ||
          'Unknown organization'
        return {
          ...req.toObject(),
          sourceOrganizationName: sourceOrgName,
          requestingOrganizationName: requestingOrgName,
          counterpartOrganizationName: isHospital ? sourceOrgName : requestingOrgName,
        }
      }),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('GET /api/requests error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch requests', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/requests
 * Create a new blood request
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      sourceOrganizationId,
      requestingOrganizationId,
      requestingOrganizationName,
      contactPerson,
      contactPhone,
      contactEmail,
      patientName,
      patientAge,
      diagnosis,
      urgency = 'routine',
      bloodRequirements,
      requiredDate,
      notes,
    } = body

    // Validate required fields
    if (
      !sourceOrganizationId ||
      !requestingOrganizationId ||
      !requestingOrganizationName ||
      !contactPerson ||
      !contactPhone ||
      !patientName ||
      !diagnosis ||
      !bloodRequirements ||
      !Array.isArray(bloodRequirements) ||
      bloodRequirements.length === 0 ||
      !requiredDate
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const postCtx = await resolveOrgContext(request, requestingOrganizationId)
    if (postCtx.error) return postCtx.error
    const postDenied = assertOrgCapability(
      postCtx.organization,
      ORG_CAPABILITIES.REQUEST_BLOOD,
      postCtx.user
    )
    if (postDenied) return postDenied

    await connectDB()

    // Check if organizations exist
    const sourceOrg = await Organization.findById(sourceOrganizationId)
    const requestingOrg = await Organization.findById(requestingOrganizationId)

    if (!sourceOrg || !requestingOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const parsedPatientAge = Number(patientAge)

    // Generate unique request ID
    const requestId = `REQ-${Date.now()}-${crypto.randomUUID().split('-')[0].toUpperCase()}`

    // Create request
    const newRequest = await Request.create({
      requestId,
      sourceOrganizationId,
      requestingOrganizationId,
      requestingOrganizationName: requestingOrganizationName || requestingOrg.name,
      contactPerson,
      contactPhone,
      contactEmail,
      patientName,
      patientAge: Number.isFinite(parsedPatientAge) ? parsedPatientAge : undefined,
      diagnosis,
      urgency,
      bloodRequirements: bloodRequirements.map((item) => ({
        bloodType: item.bloodType,
        component: item.component || 'whole_blood',
        quantity: Number(item.quantity) || 1,
        requested: Number(item.quantity) || 1,
        fulfilled: 0,
      })),
      requiredDate,
      notes,
      createdBy: postCtx.user?._id,
    })

    // Send notification email (non-blocking)
    try {
      await sendBloodRequestNotification(newRequest, sourceOrganizationId)
    } catch (emailErr) {
      console.warn('Failed to send blood request notification email:', emailErr.message)
      // Don't fail the request if email fails
    }

    // Log audit event (non-blocking)
    try {
      const auditContext = getAuditContextFromRequest(request)
      await logAuditEvent({
        action: AUDIT_ACTIONS.REQUEST_CREATE,
        userId: postCtx.user?._id || 'system',
        organizationId: sourceOrganizationId,
        resourceType: 'request',
        resourceId: newRequest._id.toString(),
        severity: AUDIT_SEVERITY.HIGH, // Blood requests are critical
        changes: {
          created: {
            requestId: newRequest.requestId,
            patientName: newRequest.patientName,
            urgency: newRequest.urgency,
            bloodRequirements: newRequest.bloodRequirements,
          },
        },
        description: `Blood request created: ${newRequest.patientName} - ${newRequest.urgency} (${newRequest.bloodRequirements.length} types)`,
        ...auditContext,
      })
    } catch (auditErr) {
      console.warn('Failed to log audit event:', auditErr.message)
      // Don't fail the request if audit logging fails
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Request created successfully',
        data: newRequest,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/requests error:', error)
    return NextResponse.json(
      { error: 'Failed to create request', details: error.message },
      { status: 500 }
    )
  }
}
