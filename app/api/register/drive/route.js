/**
 * GET /api/register/drive?token={token}
 * Get drive details by registration token (public, no auth required)
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import DonationDrive from '@/lib/models/DonationDrive'

export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Registration token is required' },
        { status: 400 }
      )
    }

    // Find drive by registration token
    const drive = await DonationDrive.findOne({
      registrationToken: token,
      isActive: true,
    })
      .populate('organizationId', 'name address city phone')
      .lean()

    if (!drive) {
      return NextResponse.json(
        { error: 'Invalid or expired registration link' },
        { status: 404 }
      )
    }

    // Check if registration is still open
    const isRegistrationOpen = drive.status === 'active' && 
      (!drive.registrationDeadline || new Date() < drive.registrationDeadline)

    if (!isRegistrationOpen) {
      return NextResponse.json(
        { error: 'Registration for this drive is closed' },
        { status: 400 }
      )
    }

    // Return drive details (safe public data only)
    return NextResponse.json({
      success: true,
      data: {
        id: drive._id.toString(),
        name: drive.name,
        description: drive.description,
        date: drive.date,
        startTime: drive.startTime,
        endTime: drive.endTime,
        location: drive.location,
        address: drive.address,
        city: drive.city,
        organization: drive.organizationId,
        targetDonors: drive.targetDonors,
        registrationDeadline: drive.registrationDeadline,
        stats: drive.stats || { registrations: 0, confirmed: 0, completed: 0, clicks: 0 },
      },
    })
  } catch (error) {
    console.error('GET /api/register/drive error:', error)
    return NextResponse.json(
      { error: 'Failed to load drive details' },
      { status: 500 }
    )
  }
}
