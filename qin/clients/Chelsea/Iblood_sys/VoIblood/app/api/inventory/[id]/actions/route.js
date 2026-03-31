/**
 * POST /api/inventory/[id]/actions
 * Special inventory actions: reserve, mark-used, discard
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import BloodInventory from '@/lib/models/BloodInventory'
import Organization from '@/lib/models/Organization'

export async function POST(request, { params }) {
  try {
    await connectDB()

    const { id } = params
    const { action, ...actionData } = await request.json()

    const unit = await BloodInventory.findById(id)

    if (!unit) {
      return NextResponse.json(
        { error: 'Blood unit not found' },
        { status: 404 }
      )
    }

    let message = ''
    let result = null

    switch (action) {
      case 'reserve':
        const { requestId } = actionData
        if (!requestId) {
          return NextResponse.json(
            { error: 'Request ID is required' },
            { status: 400 }
          )
        }
        await unit.reserve(requestId)
        message = 'Blood unit reserved successfully'
        result = unit
        break

      case 'mark-used':
        const { facility } = actionData
        if (!facility) {
          return NextResponse.json(
            { error: 'Facility information is required' },
            { status: 400 }
          )
        }
        await unit.markAsUsed(facility)
        message = 'Blood unit marked as used'
        result = unit
        break

      case 'discard':
        const { reason, notes = '' } = actionData
        if (!reason) {
          return NextResponse.json(
            { error: 'Discard reason is required' },
            { status: 400 }
          )
        }
        await unit.discard(reason, notes)
        
        // Update organization stock levels
        const organization = await Organization.findById(unit.organizationId)
        if (organization) {
          const totalUnits = await BloodInventory.countDocuments({
            organizationId: unit.organizationId,
            status: 'available',
          })
          organization.totalBloodUnitsInStock = totalUnits
          await organization.save()
        }

        message = 'Blood unit discarded successfully'
        result = unit
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
    console.error('POST /api/inventory/[id]/actions error:', error)
    return NextResponse.json(
      { error: 'Failed to perform action', details: error.message },
      { status: 500 }
    )
  }
}
