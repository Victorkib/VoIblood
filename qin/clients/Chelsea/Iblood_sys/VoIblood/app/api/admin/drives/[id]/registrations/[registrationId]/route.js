/**
 * PUT /api/admin/drives/[id]/registrations/[registrationId]
 * Update registration status
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin, isOrgAdmin } from '@/lib/rbac'
import DonationDrive from '@/lib/models/DonationDrive'
import Donor from '@/lib/models/Donor'

export async function PUT(request, { params }) {
  try {
    await connectDB()

    const user = await getCurrentUser(request.cookies)
    if (!user || (!isSuperAdmin(user.role) && !isOrgAdmin(user.role))) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Unwrap params Promise (Next.js 15 requirement)
    const { id:driveId, registrationId } = await params
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    const validStatuses = ['registered', 'confirmed', 'checked_in', 'cancelled', 'no_show']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Get drive and check permissions
    const drive = await DonationDrive.findById(driveId)
    if (!drive) {
      return NextResponse.json(
        { error: 'Drive not found' },
        { status: 404 }
      )
    }

    if (!isSuperAdmin(user.role) && drive.organizationId.toString() !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Find and update the donor registration
    const donor = await Donor.findById(registrationId)
    if (!donor || donor.driveToken !== drive.registrationToken) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    // Update the donor status
    donor.status = status
    await donor.save()

    console.log('[Registration API] Updated status:', registrationId, 'to:', status)

    return NextResponse.json({
      success: true,
      message: `Registration status updated to ${status}`,
      data: {
        registrationId,
        status,
        updatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('PUT /api/admin/drives/[id]/registrations/[registrationId] error:', error)
    return NextResponse.json(
      { error: 'Failed to update registration status' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/drives/[id]/registrations/bulk-checkin
 * Check in all registered donors
 */

export async function POST(request, { params }) {
  try {
    await connectDB()

    const user = await getCurrentUser(request.cookies)
    if (!user || (!isSuperAdmin(user.role) && !isOrgAdmin(user.role))) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Unwrap params Promise (Next.js 15 requirement)
    const { id:driveId } = await params

    // Get drive and check permissions
    const drive = await DonationDrive.findById(driveId)
    if (!drive) {
      return NextResponse.json(
        { error: 'Drive not found' },
        { status: 404 }
      )
    }

    if (!isSuperAdmin(user.role) && drive.organizationId.toString() !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Update all registered donors to checked_in status
    const result = await Donor.updateMany(
      { 
        driveToken: drive.registrationToken,
        status: { $in: ['registered', 'confirmed'] }
      },
      { 
        status: 'checked_in',
        updatedAt: new Date()
      }
    )

    console.log('[Registration API] Bulk checked in', result.modifiedCount, 'donors for drive:', driveId)

    return NextResponse.json({
      success: true,
      message: 'Bulk check-in completed',
      checkedIn: result.modifiedCount,
    })
  } catch (error) {
    console.error('POST /api/admin/drives/[id]/registrations/bulk-checkin error:', error)
    return NextResponse.json(
      { error: 'Failed to check in donors' },
      { status: 500 }
    )
  }
}
