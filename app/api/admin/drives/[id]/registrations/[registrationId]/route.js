/**
 * PUT /api/admin/drives/[id]/registrations/[registrationId]
 * Update participant (registration) status with notifications + drive stats recount.
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin, isOrgAdmin } from '@/lib/rbac'
import DonationDrive from '@/lib/models/DonationDrive'
import Donor from '@/lib/models/Donor'
import { sendDonorStatusNotification } from '@/lib/notification-service'
import {
  recountDriveParticipantStats,
  resolveParticipantForAdmin,
  syncDonorWithParticipant,
} from '@/lib/drive-participant-helpers'

export async function PUT(request, { params }) {
  try {
    await connectDB()

    const user = await getCurrentUser(request.cookies)
    if (!user || (!isSuperAdmin(user.role) && !isOrgAdmin(user.role))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id: driveId, registrationId } = await params
    const body = await request.json()
    const { status, sendNotification = true } = body

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    const validStatuses = ['registered', 'confirmed', 'declined', 'checked_in', 'cancelled', 'no_show']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const drive = await DonationDrive.findById(driveId)
    if (!drive) {
      return NextResponse.json({ error: 'Drive not found' }, { status: 404 })
    }

    if (!isSuperAdmin(user.role) && drive.organizationId.toString() !== user.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const participant = await resolveParticipantForAdmin(drive, registrationId)
    if (!participant) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    const oldStatus = participant.status
    participant.status = status
    await participant.save()

    const donor = await Donor.findById(participant.donorId._id || participant.donorId)
    if (donor) {
      await syncDonorWithParticipant(donor, participant, drive)
    }

    await recountDriveParticipantStats(drive._id)

    if (sendNotification && donor && status !== 'declined') {
      try {
        await sendDonorStatusNotification(donor, drive, status)
      } catch (notifErr) {
        console.warn('[Registration API] Failed to send notification:', notifErr.message)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Registration status updated to ${status}`,
      data: {
        registrationId: participant._id.toString(),
        oldStatus,
        newStatus: status,
        notificationSent: sendNotification && status !== 'declined',
        updatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('PUT /api/admin/drives/[id]/registrations/[registrationId] error:', error)
    return NextResponse.json({ error: 'Failed to update registration status' }, { status: 500 })
  }
}
