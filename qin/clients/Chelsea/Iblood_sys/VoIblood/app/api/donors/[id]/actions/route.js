/**
 * POST /api/donors/[id]/actions
 * Special donor actions: record-donation, defer, reactivate
 * Request body: { action, ...actionSpecificFields }
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Donor from '@/lib/models/Donor'

export async function POST(request, { params }) {
  try {
    await connectDB()

    const { id } = params
    const { action, ...actionData } = await request.json()

    const donor = await Donor.findById(id)

    if (!donor) {
      return NextResponse.json(
        { error: 'Donor not found' },
        { status: 404 }
      )
    }

    let message = ''
    let result = null

    switch (action) {
      case 'record-donation':
        await donor.recordDonation()
        message = 'Donation recorded successfully'
        result = donor
        break

      case 'defer':
        const { reason, daysDeferred = 90 } = actionData
        if (!reason) {
          return NextResponse.json(
            { error: 'Deferral reason is required' },
            { status: 400 }
          )
        }
        await donor.deferDonor(reason, daysDeferred)
        message = 'Donor deferred successfully'
        result = donor
        break

      case 'reactivate':
        await donor.reactivateDonor()
        message = 'Donor reactivated successfully'
        result = donor
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
    console.error('POST /api/donors/[id]/actions error:', error)
    return NextResponse.json(
      { error: 'Failed to perform action', details: error.message },
      { status: 500 }
    )
  }
}
