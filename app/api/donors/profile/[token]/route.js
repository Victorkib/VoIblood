/**
 * GET /api/donors/profile/[token] - Get donor profile by donorToken
 *
 * Public endpoint - no authentication required
 * Uses donorToken (stored in localStorage after registration)
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Donor from '@/lib/models/Donor'
import DriveParticipant from '@/lib/models/DriveParticipant'
import { GRATITUDE_POINTS_PER_DONATION, REDEMPTION_DISCLAIMER } from '@/lib/gratitude-points/constants'
import { findWalletForDonor } from '@/lib/gratitude-points/wallet-service'

/**
 * GET /api/donors/profile/[token]
 */
export async function GET(request, { params }) {
  try {
    await connectDB()

    const resolvedParams = await params
    const { token } = resolvedParams

    if (!token) {
      return NextResponse.json({ error: 'Donor token required' }, { status: 400 })
    }

    const donor = await Donor.findOne({ donorToken: token }).lean()

    if (!donor) {
      return NextResponse.json(
        { error: 'Donor profile not found. Please check your donor ID.' },
        { status: 404 }
      )
    }

    const totalDonations = donor.donationHistory?.length || 0
    const lastDonationDate = donor.lastDonationDate || null

    let nextEligibleDate = null
    if (lastDonationDate) {
      const lastDonation = new Date(lastDonationDate)
      nextEligibleDate = new Date(lastDonation)
      nextEligibleDate.setDate(nextEligibleDate.getDate() + 56)
    }

    const rows = await DriveParticipant.find({ donorId: donor._id })
      .populate(
        'driveId',
        'name date startTime endTime location city status whatsappGroupLink registrationUrl'
      )
      .sort({ updatedAt: -1 })
      .limit(30)
      .lean()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    let createToken
    let buildUrl
    let getOrCreateShort
    try {
      ;({
        createDriveRsvpToken: createToken,
        buildRsvpUrl: buildUrl,
      } = await import('@/lib/rsvp-jwt'))
      ;({ getOrCreateRsvpSmsLink: getOrCreateShort } = await import('@/lib/rsvp-sms-link'))
    } catch {
      createToken = null
      buildUrl = null
      getOrCreateShort = null
    }

    const driveParticipations = []
    for (const row of rows) {
      const d = row.driveId
      if (!d || !d._id) continue

      let rsvpUrl = null
      let rsvpShortUrl = null
      if (createToken && buildUrl) {
        try {
          const rsvpToken = await createToken(String(donor._id), String(d._id))
          rsvpUrl = buildUrl(rsvpToken, appUrl)
        } catch (e) {
          console.warn('[donors/profile] RSVP token failed:', e.message)
        }
      }
      if (getOrCreateShort) {
        try {
          const short = await getOrCreateShort(String(donor._id), String(d._id))
          rsvpShortUrl = short.url
        } catch (e) {
          console.warn('[donors/profile] Short RSVP link failed:', e.message)
        }
      }

      driveParticipations.push({
        driveId: d._id.toString(),
        driveName: d.name,
        driveDate: d.date,
        startTime: d.startTime || '',
        endTime: d.endTime || '',
        location: d.location || '',
        city: d.city || '',
        driveStatus: d.status,
        participantStatus: row.status,
        source: row.source,
        registrationUrl: d.registrationUrl || '',
        whatsappGroupLink: d.whatsappGroupLink || '',
        rsvpUrl,
        rsvpShortUrl,
      })
    }

    const upcomingDriveParticipations = driveParticipations.filter(
      (p) =>
        p.driveStatus === 'active' &&
        !['completed', 'no_show', 'cancelled'].includes(p.participantStatus)
    )

    let gratitudeWallet = null
    try {
      const wallet = await findWalletForDonor(donor)
      if (wallet) {
        gratitudeWallet = {
          balance: wallet.balance,
          lifetimeEarned: wallet.lifetimeEarned,
          lifetimeRedeemed: wallet.lifetimeRedeemed,
          pointsPerDonation: GRATITUDE_POINTS_PER_DONATION,
          disclaimer: REDEMPTION_DISCLAIMER,
        }
      }
    } catch {
      gratitudeWallet = null
    }

    const donorData = {
      id: donor._id.toString(),
      donorToken: donor.donorToken,
      firstName: donor.firstName,
      lastName: donor.lastName,
      fullName: `${donor.firstName} ${donor.lastName}`,
      email: donor.email,
      phone: donor.phone,
      bloodType: donor.bloodType,
      dateOfBirth: donor.dateOfBirth,
      gender: donor.gender,
      weight: donor.weight,
      hasDonatedBefore: donor.hasDonatedBefore,
      lastDonationDate: donor.lastDonationDate,
      medicalConditions: donor.medicalConditions,
      medications: donor.medications,
      totalDonations,
      nextEligibleDate,
      isVerified: donor.isVerified,
      status: donor.status,
      registeredAt: donor.createdAt,
      driveId: donor.driveId?.toString(),
      organizationId: donor.organizationId?.toString(),
      driveParticipations,
      upcomingDriveParticipations,
      gratitudeWallet,
    }

    return NextResponse.json({
      success: true,
      data: donorData,
    })
  } catch (error) {
    console.error('GET /api/donors/profile/[token] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch donor profile', details: error.message },
      { status: 500 }
    )
  }
}
