/**
 * GET /api/rsvp?t=... | ?c=... — preview drive + donor (JWT or short SMS code)
 * POST /api/rsvp — body: { token } OR { code }, plus { action }
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import DonationDrive from '@/lib/models/DonationDrive'
import Donor from '@/lib/models/Donor'
import { verifyDriveRsvpToken } from '@/lib/rsvp-jwt'
import { resolveRsvpSmsCode } from '@/lib/rsvp-sms-link'
import { getDonationEligibilitySummary } from '@/lib/drive-outreach'
import { syncDonorWithParticipant, upsertParticipant } from '@/lib/drive-participant-helpers'
import { resolveRegistrationUrl } from '@/lib/app-url'

async function resolveDonorAndDriveIds(token, code) {
  if (code) {
    const resolved = await resolveRsvpSmsCode(String(code).trim())
    if (!resolved) {
      const err = new Error('INVALID_CODE')
      err.code = 'INVALID_CODE'
      throw err
    }
    return resolved
  }
  if (token) {
    return verifyDriveRsvpToken(token)
  }
  const err = new Error('MISSING_IDENTIFIER')
  err.code = 'MISSING_IDENTIFIER'
  throw err
}

export async function GET(request) {
  try {
    await connectDB()
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('t')
    const code = searchParams.get('c')

    if (!token && !code) {
      return NextResponse.json({ error: 'Missing token or code' }, { status: 400 })
    }

    let donorId
    let driveId
    try {
      ;({ donorId, driveId } = await resolveDonorAndDriveIds(token, code))
    } catch (e) {
      if (e.code === 'INVALID_CODE' || e.code === 'MISSING_IDENTIFIER') {
        return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 })
      }
      throw e
    }

    const drive = await DonationDrive.findById(driveId).populate('organizationId', 'name').lean()
    if (!drive || !drive.isActive) {
      return NextResponse.json({ error: 'Drive not found' }, { status: 404 })
    }

    const orgId =
      drive.organizationId && typeof drive.organizationId === 'object' && drive.organizationId._id
        ? drive.organizationId._id.toString()
        : drive.organizationId.toString()

    const donor = await Donor.findById(donorId).lean()
    if (!donor || donor.organizationId.toString() !== orgId) {
      return NextResponse.json({ error: 'Donor not found for this drive' }, { status: 404 })
    }

    const isRegistrationOpen =
      drive.status === 'active' &&
      (!drive.registrationDeadline || new Date() < new Date(drive.registrationDeadline))

    const eligibility = getDonationEligibilitySummary(donor, drive.date)

    const DriveParticipant = (await import('@/lib/models/DriveParticipant')).default
    const existing = await DriveParticipant.findOne({ driveId: drive._id, donorId: donor._id })
      .select('status source')
      .lean()

    return NextResponse.json({
      success: true,
      data: {
        drive: {
          id: drive._id.toString(),
          name: drive.name,
          description: drive.description,
          date: drive.date,
          startTime: drive.startTime,
          endTime: drive.endTime,
          location: drive.location,
          address: drive.address,
          city: drive.city,
          whatsappGroupLink: drive.whatsappGroupLink || '',
          registrationUrl: resolveRegistrationUrl(drive, request),
          organizationName: drive.organizationId?.name || '',
        },
        donor: {
          firstName: donor.firstName,
          lastName: donor.lastName,
          bloodType: donor.bloodType || '',
        },
        eligibility: {
          eligible: eligibility.eligible,
          reasonCode: eligibility.reasonCode,
          nextEligibleDisplay: eligibility.nextEligibleDisplay,
          headline: eligibility.supporterHeadline,
          subhead: eligibility.supporterSubhead,
        },
        isRegistrationOpen,
        existingParticipation: existing
          ? { status: existing.status, source: existing.source }
          : null,
        auth: code ? { type: 'code', value: String(code).trim().toLowerCase() } : { type: 'token', value: token },
      },
    })
  } catch (e) {
    console.error('GET /api/rsvp error:', e)
    return NextResponse.json({ error: 'Failed to load RSVP' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await connectDB()
    const body = await request.json()
    const { token, code, action } = body || {}

    if ((!token && !code) || !action) {
      return NextResponse.json({ error: 'Provide token or code, and action' }, { status: 400 })
    }

    if (!['confirm', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    let donorId
    let driveId
    try {
      ;({ donorId, driveId } = await resolveDonorAndDriveIds(token, code))
    } catch (e) {
      if (e.code === 'INVALID_CODE' || e.code === 'MISSING_IDENTIFIER') {
        return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 })
      }
      throw e
    }

    const drive = await DonationDrive.findById(driveId)
    if (!drive || !drive.isActive) {
      return NextResponse.json({ error: 'Drive not found' }, { status: 404 })
    }

    const isRegistrationOpen =
      drive.status === 'active' &&
      (!drive.registrationDeadline || new Date() < new Date(drive.registrationDeadline))

    if (!isRegistrationOpen) {
      return NextResponse.json({ error: 'Registration for this drive is closed' }, { status: 400 })
    }

    const donor = await Donor.findById(donorId)
    if (!donor || donor.organizationId.toString() !== drive.organizationId.toString()) {
      return NextResponse.json({ error: 'Donor not found for this drive' }, { status: 404 })
    }

    if (action === 'confirm') {
      const eligibility = getDonationEligibilitySummary(donor, drive.date)
      if (!eligibility.eligible) {
        return NextResponse.json(
          {
            error: 'not_eligible',
            message:
              eligibility.reasonCode === 'record_cancelled'
                ? 'Your donor profile needs review with the center before we can book you for this drive. You can still share the public link with others.'
                : `Our records indicate you are not yet eligible for a whole-blood donation${eligibility.nextEligibleDisplay ? ` until ${eligibility.nextEligibleDisplay}` : ''}. Please use the share link to invite others instead.`,
            eligibility,
          },
          { status: 409 }
        )
      }

      const participant = await upsertParticipant(drive._id, donor._id, {
        source: 'outreach',
        status: 'confirmed',
      })
      participant.respondedAt = new Date()
      await participant.save()
      const donorFresh = await Donor.findById(donor._id)
      await syncDonorWithParticipant(donorFresh, participant, drive)

      return NextResponse.json({
        success: true,
        message: "You're on the list — thank you for confirming!",
        data: {
          status: participant.status,
          donorProfileUrl: donor.donorToken
            ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/donor/${donor.donorToken}`
            : null,
        },
      })
    }

    const participant = await upsertParticipant(drive._id, donor._id, {
      source: 'outreach',
      status: 'declined',
    })
    participant.respondedAt = new Date()
    await participant.save()

    return NextResponse.json({
      success: true,
      message: 'Thanks for letting us know. Hope to see you at a future drive!',
      data: { status: participant.status },
    })
  } catch (e) {
    console.error('POST /api/rsvp error:', e)
    return NextResponse.json({ error: 'RSVP failed' }, { status: 500 })
  }
}
