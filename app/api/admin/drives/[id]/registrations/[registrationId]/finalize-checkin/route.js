/**
 * POST .../finalize-checkin — mark participant (and donor context) as checked_in.
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Donor from '@/lib/models/Donor'
import DonationDrive from '@/lib/models/DonationDrive'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin, isOrgAdmin } from '@/lib/rbac'
import {
  recountDriveParticipantStats,
  resolveParticipantForAdmin,
  syncDonorWithParticipant,
} from '@/lib/drive-participant-helpers'
import {
  isConfirmedBloodType,
  normalizeDonorBloodType,
} from '@/lib/donor-blood-types'

export async function POST(request, { params }) {
  try {
    await connectDB()

    const resolvedParams = await params
    const { id: driveId, registrationId } = resolvedParams

    const user = await getCurrentUser(request.cookies)
    if (!user || (!isSuperAdmin(user.role) && !isOrgAdmin(user.role))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const drive = await DonationDrive.findById(driveId)
    if (!drive) {
      return NextResponse.json({ error: 'Drive not found' }, { status: 404 })
    }

    if (!isSuperAdmin(user.role) && drive.organizationId.toString() !== user.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { bloodType: bloodTypeInput } = body

    const participant = await resolveParticipantForAdmin(drive, registrationId)
    if (!participant) {
      return NextResponse.json({ error: 'Donor registration not found' }, { status: 404 })
    }

    participant.status = 'checked_in'
    await participant.save()

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

      await syncDonorWithParticipant(donor, participant, drive)
    }

    await recountDriveParticipantStats(drive._id)

    return NextResponse.json({
      success: true,
      message: 'Donor checked in successfully',
      data: {
        participantId: participant._id.toString(),
        donorId: donor?._id?.toString(),
        status: participant.status,
        bloodType: donor?.bloodType,
        bloodTypeUpdated,
      },
    })
  } catch (error) {
    console.error('POST finalize-checkin error:', error)
    return NextResponse.json({ error: 'Failed to finalize check-in' }, { status: 500 })
  }
}
