/**
 * POST .../record-donation
 * Records donation for a checked-in participant; updates donor history + inventory.
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin, isOrgAdmin } from '@/lib/rbac'
import DonationDrive from '@/lib/models/DonationDrive'
import Donor from '@/lib/models/Donor'
import BloodInventory from '@/lib/models/BloodInventory'
import { sendDonorStatusNotification } from '@/lib/notification-service'
import {
  recountDriveParticipantStats,
  resolveParticipantForAdmin,
} from '@/lib/drive-participant-helpers'
import { awardGratitudePointsForDonation } from '@/lib/gratitude-points/award-service'
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

    const body = await request.json()
    const {
      volume = 450,
      component = 'whole_blood',
      technician = '',
      notes = '',
      bloodWorkFindings = '',
      recommendations = '',
      eligibilityStatus = 'pending',
      screeningResults = {},
      sendNotification = true,
      bloodType: bloodTypeInput,
    } = body

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

    if (participant.participantRole === 'supporter') {
      return NextResponse.json(
        { error: 'Drive supporters cannot have donations recorded. They registered to help share the drive.' },
        { status: 400 }
      )
    }

    if (participant.status !== 'checked_in') {
      return NextResponse.json(
        { error: 'Donor must be checked in before recording donation' },
        { status: 400 }
      )
    }

    const donor = await Donor.findById(participant.donorId._id || participant.donorId)
    if (!donor) {
      return NextResponse.json({ error: 'Donor not found' }, { status: 404 })
    }

    let resolvedBloodType = donor.bloodType
    if (bloodTypeInput) {
      const normalizedInput = normalizeDonorBloodType(bloodTypeInput, donor.bloodType)
      if (!isConfirmedBloodType(normalizedInput)) {
        return NextResponse.json(
          { error: 'A confirmed blood type is required before recording the donation' },
          { status: 400 }
        )
      }
      resolvedBloodType = normalizedInput
    }

    if (!isConfirmedBloodType(resolvedBloodType)) {
      return NextResponse.json(
        {
          error:
            'Donor blood type is still unknown. Confirm blood type during screening before recording this donation.',
        },
        { status: 400 }
      )
    }

    const unitId = `UNIT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    const collectionDate = new Date()
    const expiryDate = new Date(collectionDate)
    expiryDate.setDate(expiryDate.getDate() + 35)

    const normalizedEligibilityStatus = ['eligible', 'temporarily_deferred', 'ineligible', 'pending'].includes(
      eligibilityStatus
    )
      ? eligibilityStatus
      : 'pending'

    const normalizedScreening = {
      hiv: screeningResults?.hiv || 'pending',
      hepatitisB: screeningResults?.hepatitisB || 'pending',
      hepatitisC: screeningResults?.hepatitisC || 'pending',
      syphilis: screeningResults?.syphilis || 'pending',
    }

    const positiveFindingDetected = Object.values(normalizedScreening).some((value) => value === 'positive')
    const pendingFindingDetected = Object.values(normalizedScreening).some(
      (value) => value === 'pending' || value === 'inconclusive'
    )

    const aggregateResult = pendingFindingDetected ? 'pending' : positiveFindingDetected ? 'positive' : 'negative'

    const bloodWorkSummary = [
      `HIV: ${normalizedScreening.hiv}`,
      `Hepatitis B: ${normalizedScreening.hepatitisB}`,
      `Hepatitis C: ${normalizedScreening.hepatitisC}`,
      `Syphilis: ${normalizedScreening.syphilis}`,
    ].join(', ')

    const bloodUnit = await BloodInventory.create({
      organizationId: drive.organizationId,
      unitId,
      bloodType: resolvedBloodType,
      component,
      volume,
      donorId: donor._id,
      donorName: `${donor.firstName} ${donor.lastName}`,
      donorEmail: donor.email,
      collectionDate,
      collectionFacility: drive.location,
      technician,
      expiryDate,
      status: 'available',
      driveId: drive._id,
      driveName: drive.name,
      testedFor: {
        hiv: true,
        hepatitisB: true,
        hepatitisC: true,
        syphilis: true,
        testDate: collectionDate,
        testResults: aggregateResult,
      },
      qualityNotes: bloodWorkFindings || undefined,
      notes,
    })

    const today = new Date()
    const nextEligible = new Date(today)
    nextEligible.setDate(nextEligible.getDate() + 56)

    const historyEntry = {
      date: today,
      driveId: drive._id,
      driveName: drive.name,
      volume,
      bloodType: resolvedBloodType,
      unitId: bloodUnit.unitId,
      eligibilityStatus: normalizedEligibilityStatus,
      bloodWorkSummary,
      notes,
    }

    const newTotal = (donor.totalDonations || 0) + 1

    await Donor.updateOne(
      { _id: donor._id },
      {
        $set: {
          status: 'completed',
          bloodType: resolvedBloodType,
          lastDonationDate: today,
          nextEligibleDate: nextEligible,
          totalDonations: newTotal,
        },
        $push: { donationHistory: historyEntry },
      }
    )

    participant.status = 'completed'
    await participant.save()

    await recountDriveParticipantStats(drive._id)

    let gratitudePoints = null
    try {
      gratitudePoints = await awardGratitudePointsForDonation({
        donor,
        unitId: bloodUnit.unitId,
        organizationId: drive.organizationId.toString(),
        eligibilityStatus: normalizedEligibilityStatus,
        driveName: drive.name,
      })
    } catch (gpErr) {
      console.warn('[Record Donation] Gratitude points:', gpErr.message)
    }

    const bloodTypeNewlyConfirmed = !isConfirmedBloodType(donor.bloodType)

    if (sendNotification) {
      try {
        const donorForNotification = {
          ...donor.toObject(),
          bloodType: resolvedBloodType,
          totalDonations: newTotal,
          lastDonationDate: today,
          nextEligibleDate: nextEligible,
        }

        await sendDonorStatusNotification(donorForNotification, drive, 'completed', {
          donationDate: today,
          eligibilityStatus: normalizedEligibilityStatus,
          bloodWorkFindings: bloodWorkFindings || bloodWorkSummary,
          recommendations,
          unitId: bloodUnit.unitId,
          gratitudePoints,
          bloodType: resolvedBloodType,
          bloodTypeNewlyConfirmed,
          nextEligibleDate: nextEligible,
        })
      } catch (notifErr) {
        console.warn('[Record Donation] Failed to send notification:', notifErr.message)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Donation recorded successfully',
      data: {
        donorId: donor._id.toString(),
        participantId: participant._id.toString(),
        donorName: `${donor.firstName} ${donor.lastName}`,
        unitId: bloodUnit.unitId,
        bloodType: resolvedBloodType,
        volume,
        totalDonations: newTotal,
        nextEligibleDate: nextEligible,
        notificationSent: sendNotification,
        gratitudePoints,
      },
    })
  } catch (error) {
    console.error('POST record-donation error:', error)
    return NextResponse.json(
      { error: 'Failed to record donation', details: error.message },
      { status: 500 }
    )
  }
}
