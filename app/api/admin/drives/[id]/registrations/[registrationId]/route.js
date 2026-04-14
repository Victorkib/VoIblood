/**
 * PUT /api/admin/drives/[id]/registrations/[registrationId]
 * Update registration status with drive stats tracking and notifications
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin, isOrgAdmin } from '@/lib/rbac'
import DonationDrive from '@/lib/models/DonationDrive'
import Donor from '@/lib/models/Donor'
import { sendDonorStatusNotification } from '@/lib/notification-service'

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
    const { id: driveId, registrationId } = await params
    const body = await request.json()
    const { status, sendNotification = true } = body

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

    // Find the donor registration
    const donor = await Donor.findById(registrationId)
    if (!donor || donor.driveToken !== drive.registrationToken) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    // Track old status for stats updates
    const oldStatus = donor.status

    // USE MONGODB NATIVE UPDATEONE to bypass Mongoose schema cache
    // This ensures organizationId and driveId are saved even if the model cache is stale
    const updateResult = await Donor.updateOne(
      { _id: registrationId },
      {
        $set: {
          status,
          organizationId: drive.organizationId,
          driveId: drive._id,
        }
      }
    )

    console.log('[Registration API] Update result:', updateResult)

    // Update drive stats counters
    await updateDriveStats(drive, oldStatus, status)

    // Send notification to donor (if enabled)
    if (sendNotification) {
      try {
        await sendDonorStatusNotification(donor, drive, status)
      } catch (notifErr) {
        console.warn('[Registration API] Failed to send notification:', notifErr.message)
      }
    }

    console.log('[Registration API] Updated status:', registrationId, 'from', oldStatus, 'to', status)

    return NextResponse.json({
      success: true,
      message: `Registration status updated to ${status}`,
      data: {
        registrationId,
        oldStatus,
        newStatus: status,
        notificationSent: sendNotification,
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
 * Update drive stats counters when donor status changes
 */
async function updateDriveStats(drive, oldStatus, newStatus) {
  if (!drive.stats) {
    drive.stats = { clicks: 0, registrations: 0, confirmed: 0, completed: 0 }
  }

  // Decrement old status counter
  if (oldStatus === 'confirmed') {
    drive.stats.confirmed = Math.max(0, (drive.stats.confirmed || 0) - 1)
  }

  // Increment new status counter
  if (newStatus === 'confirmed') {
    drive.stats.confirmed = (drive.stats.confirmed || 0) + 1
  } else if (newStatus === 'completed') {
    drive.stats.completed = (drive.stats.completed || 0) + 1
  }

  await drive.save()
}

/**
 * POST /api/admin/drives/[id]/registrations/bulk-checkin
 * Check in all registered donors with notifications
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
    const { id: driveId } = await params

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

    // Find all donors eligible for check-in
    const donors = await Donor.find({
      driveToken: drive.registrationToken,
      status: { $in: ['registered', 'confirmed'] }
    })

    // USE MONGODB NATIVE UPDATEMANY to bypass Mongoose schema cache
    // This ensures organizationId and driveId are saved for all donors
    const updateResult = await Donor.updateMany(
      {
        driveToken: drive.registrationToken,
        status: { $in: ['registered', 'confirmed'] }
      },
      {
        $set: {
          status: 'checked_in',
          organizationId: drive.organizationId,
          driveId: drive._id,
        }
      }
    )

    const checkedInCount = updateResult.modifiedCount || 0

    console.log('[Registration API] Bulk check-in update:', updateResult)

    // Update drive stats
    await updateDriveStatsBulk(drive, checkedInCount)

    console.log('[Registration API] Bulk checked in', checkedInCount, 'donors for drive:', driveId)

    return NextResponse.json({
      success: true,
      message: 'Bulk check-in completed',
      checkedIn: checkedInCount,
    })
  } catch (error) {
    console.error('POST /api/admin/drives/[id]/registrations/bulk-checkin error:', error)
    return NextResponse.json(
      { error: 'Failed to check in donors' },
      { status: 500 }
    )
  }
}

/**
 * Update drive stats for bulk check-in
 */
async function updateDriveStatsBulk(drive, count) {
  if (!drive.stats) {
    drive.stats = { clicks: 0, registrations: 0, confirmed: 0, completed: 0 }
  }

  // Move confirmed count to completed (they're now checked in)
  drive.stats.confirmed = Math.max(0, (drive.stats.confirmed || 0) - count)
  await drive.save()
}
