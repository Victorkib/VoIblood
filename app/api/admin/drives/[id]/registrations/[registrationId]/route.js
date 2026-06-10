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
import {
  isConfirmedBloodType,
  normalizeDonorBloodType,
} from '@/lib/donor-blood-types'

export async function PUT(request, { params }) {
  try {
    await connectDB()

    const user = await getCurrentUser(request.cookies)
    if (!user || (!isSuperAdmin(user.role) && !isOrgAdmin(user.role))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id: driveId, registrationId } = await params
    const body = await request.json()
    const { status, sendNotification = true, bloodType: bloodTypeInput } = body

    if (!status && bloodTypeInput == null) {
      return NextResponse.json({ error: 'Status or bloodType is required' }, { status: 400 })
    }

    const validStatuses = ['registered', 'confirmed', 'declined', 'checked_in', 'cancelled', 'no_show']
    if (status && !validStatuses.includes(status)) {
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

    if (
      participant.participantRole === 'supporter' &&
      status &&
      ['checked_in', 'completed', 'no_show'].includes(status)
    ) {
      return NextResponse.json(
        {
          error:
            'Drive supporters are not in the donation queue. They help by sharing the drive — not by checking in for collection.',
        },
        { status: 400 }
      )
    }

    const oldStatus = participant.status
    if (status) {
      participant.status = status
      await participant.save()
    }

    const donor = await Donor.findById(participant.donorId._id || participant.donorId)
    let bloodTypeUpdated = false

    if (donor) {
      if (bloodTypeInput != null) {
        const normalizedBloodType = normalizeDonorBloodType(bloodTypeInput, donor.bloodType)
        if (!isConfirmedBloodType(normalizedBloodType)) {
          return NextResponse.json(
            { error: 'A confirmed blood type is required (not unknown)' },
            { status: 400 }
          )
        }
        donor.bloodType = normalizedBloodType
        await donor.save()
        bloodTypeUpdated = true
      }

      if (status) {
        await syncDonorWithParticipant(donor, participant, drive)
      }
    }

    await recountDriveParticipantStats(drive._id)

    if (sendNotification && donor && status && status !== 'declined') {
      try {
        await sendDonorStatusNotification(donor, drive, status)
      } catch (notifErr) {
        console.warn('[Registration API] Failed to send notification:', notifErr.message)
      }
    }

    return NextResponse.json({
      success: true,
      message: status
        ? `Registration status updated to ${status}`
        : 'Donor blood type updated during screening',
      data: {
        registrationId: participant._id.toString(),
        oldStatus,
        newStatus: status || participant.status,
        bloodType: donor?.bloodType,
        bloodTypeUpdated,
        notificationSent: sendNotification && status && status !== 'declined',
        updatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('PUT /api/admin/drives/[id]/registrations/[registrationId] error:', error)
    return NextResponse.json({ error: 'Failed to update registration status' }, { status: 500 })
  }
}
