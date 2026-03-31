/**
 * POST /api/register/track - Track link clicks and registrations
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import DonationDrive from '@/lib/models/DonationDrive'

export async function POST(request) {
  try {
    await connectDB()

    const body = await request.json()
    const { token, action } = body

    if (!token || !action) {
      return NextResponse.json(
        { error: 'Token and action required' },
        { status: 400 }
      )
    }

    const drive = await DonationDrive.findOne({ registrationToken: token })

    if (!drive) {
      return NextResponse.json(
        { error: 'Drive not found' },
        { status: 404 }
      )
    }

    // Track action
    if (action === 'click') {
      await drive.incrementClicks()
    }

    return NextResponse.json({
      success: true,
      message: 'Tracked successfully',
    })
  } catch (error) {
    console.error('POST /api/register/track error:', error)
    return NextResponse.json(
      { error: 'Failed to track action' },
      { status: 500 }
    )
  }
}
