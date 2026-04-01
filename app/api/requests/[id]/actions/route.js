/**
 * POST /api/requests/[id]/actions
 * Special request actions: approve, reject, allocate, fulfill, deliver, cancel
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Request from '@/lib/models/Request'
import BloodInventory from '@/lib/models/BloodInventory'

export async function POST(request, { params }) {
  try {
    await connectDB()

    const { id } = params
    const { action, ...actionData } = await request.json()

    const req = await Request.findById(id)

    if (!req) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    let message = ''
    let result = null

    switch (action) {
      case 'approve':
        const { userId: approveUserId } = actionData
        if (!approveUserId) {
          return NextResponse.json(
            { error: 'User ID is required for approval' },
            { status: 400 }
          )
        }
        await req.approve(approveUserId)
        message = 'Request approved successfully'
        result = req
        break

      case 'reject':
        const { reason, userId: rejectUserId } = actionData
        if (!reason || !rejectUserId) {
          return NextResponse.json(
            { error: 'Rejection reason and user ID are required' },
            { status: 400 }
          )
        }
        await req.reject(rejectUserId, reason)
        message = 'Request rejected successfully'
        result = req
        break

      case 'allocate':
        const { unitIds } = actionData
        if (!unitIds || !Array.isArray(unitIds) || unitIds.length === 0) {
          return NextResponse.json(
            { error: 'Unit IDs are required' },
            { status: 400 }
          )
        }

        // Validate units exist and are available
        const units = await BloodInventory.find({ _id: { $in: unitIds } })
        if (units.length !== unitIds.length) {
          return NextResponse.json(
            { error: 'One or more units not found' },
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
        if (req.allocatedUnits.length === 0) {
          return NextResponse.json(
            { error: 'No units allocated for this request' },
            { status: 400 }
          )
        }
        await req.markFulfilled()
        message = 'Request marked as fulfilled'
        result = req
        break

      case 'deliver':
        const { deliveredBy } = actionData
        if (!deliveredBy) {
          return NextResponse.json(
            { error: 'Delivered by information is required' },
            { status: 400 }
          )
        }
        await req.markDelivered(deliveredBy)
        message = 'Request marked as delivered'
        result = req
        break

      case 'cancel':
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
