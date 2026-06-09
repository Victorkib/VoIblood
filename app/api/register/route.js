/**
 * GET /api/register/drive - Get drive details by token
 * POST /api/register - Register donor
 * 
 * POST Features:
 * - Verification token validation (ensures OTP was verified)
 * - Duplicate prevention
 * - Age validation
 * - Drive status validation
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import DonationDrive from '@/lib/models/DonationDrive'
import Donor from '@/lib/models/Donor'
import VerificationToken from '@/lib/models/VerificationToken'
import { normalizeDonorBloodType, isConfirmedBloodType } from '@/lib/donor-blood-types'
import { getAppUrl } from '@/lib/app-url'

const ACTIVE_DRIVE_PARTICIPANT_STATUSES = new Set([
  'registered',
  'confirmed',
  'checked_in',
  'completed',
])

/**
 * GET /api/register/drive?token=xxx
 * Get drive details for public registration
 */
export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Registration token required' },
        { status: 400 }
      )
    }

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
        targetDonors: drive.targetDonors,
        whatsappGroupLink: drive.whatsappGroupLink,
        stats: drive.stats,
        organization: drive.organizationId,
      },
    })
  } catch (error) {
    console.error('GET /api/register/drive error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch drive details' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/register
 * Register new donor from public form
 */
export async function POST(request) {
  const startTime = Date.now()
  
  try {
    await connectDB()

    const body = await request.json()
    const {
      driveToken,
      verificationToken,
      firstName,
      lastName,
      email,
      phone,
      bloodType,
      dateOfBirth,
      gender,
      weight,
      hasDonatedBefore,
      lastDonationDate,
      medicalConditions,
      medications,
      consentGiven,
    } = body

    console.log('[Register API] Registration request received:', {
      driveToken: driveToken ? 'present' : 'missing',
      verificationToken: verificationToken ? 'present' : 'missing',
      email,
      phone,
      timestamp: new Date().toISOString()
    })

    // Validation - Required fields
    if (!driveToken || !firstName || !lastName || !email || !phone) {
      console.log('[Register API] Validation failed: Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!consentGiven) {
      console.log('[Register API] Validation failed: Consent not given')
      return NextResponse.json(
        { error: 'Consent is required' },
        { status: 400 }
      )
    }

    // CRITICAL: Validate verification token (ensures OTP was verified)
    if (!verificationToken) {
      console.log('[Register API] Validation failed: No verification token provided')
      return NextResponse.json(
        { 
          error: 'OTP verification required. Please verify your phone/email first.',
          otpRequired: true,
        },
        { status: 400 }
      )
    }

    console.log('[Register API] Validating verification token...')
    
    const tokenValidation = await VerificationToken.validateToken(verificationToken)
    
    if (!tokenValidation.success) {
      console.log('[Register API] Token validation failed:', tokenValidation.error)
      return NextResponse.json(
        { 
          error: tokenValidation.error || 'Invalid or expired verification token',
          tokenExpired: tokenValidation.error?.includes('expired'),
        },
        { status: 400 }
      )
    }

    // Verify that the token matches the provided contact info
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '')
    const normalizedEmail = email.toLowerCase().trim()
    
    const tokenPhone = tokenValidation.phone?.replace(/[\s\-\(\)]/g, '')
    const tokenEmail = tokenValidation.email?.toLowerCase().trim()
    
    if (tokenPhone !== normalizedPhone && tokenEmail !== normalizedEmail) {
      console.log('[Register API] Token contact mismatch:', {
        tokenPhone,
        tokenEmail,
        providedPhone: normalizedPhone,
        providedEmail: normalizedEmail,
      })
      return NextResponse.json(
        { 
          error: 'Verification token does not match provided contact information',
          contactMismatch: true,
        },
        { status: 400 }
      )
    }

    console.log('[Register API] Verification token validated successfully')

    // Find drive
    const drive = await DonationDrive.findOne({
      registrationToken: driveToken,
      isActive: true,
    })

    if (!drive) {
      console.log('[Register API] Drive not found for token:', driveToken)
      return NextResponse.json(
        { error: 'Invalid registration link' },
        { status: 400 }
      )
    }

    // Check if registration is still open
    const isRegistrationOpen = drive.status === 'active' &&
      (!drive.registrationDeadline || new Date() < drive.registrationDeadline)

    if (!isRegistrationOpen) {
      console.log('[Register API] Registration closed for drive:', drive.name)
      return NextResponse.json(
        { error: 'Registration for this drive is closed' },
        { status: 400 }
      )
    }

    // Check if donor already exists with this phone/email
    const existingDonor = await Donor.findOne({
      $or: [
        { email: normalizedEmail },
        { phone: normalizedPhone },
      ],
      organizationId: drive.organizationId,
    })

    const resolvedBloodType = normalizeDonorBloodType(bloodType)

    if (existingDonor) {
      console.log('[Register API] Returning donor found:', existingDonor._id)

      const DriveParticipant = (await import('@/lib/models/DriveParticipant')).default
      const { upsertParticipant, syncDonorWithParticipant } = await import(
        '@/lib/drive-participant-helpers'
      )

      const participant = await DriveParticipant.findOne({
        donorId: existingDonor._id,
        driveId: drive._id,
      })
        .select('status source')
        .lean()

      const appUrl = getAppUrl(request)

      if (participant && ACTIVE_DRIVE_PARTICIPANT_STATUSES.has(participant.status)) {
        const { createDriveRsvpToken, buildRsvpUrl } = await import('@/lib/rsvp-jwt')
        const { getOrCreateRsvpSmsLink } = await import('@/lib/rsvp-sms-link')
        let rsvpUrl = null
        let rsvpShortUrl = null
        try {
          const rsvpToken = await createDriveRsvpToken(String(existingDonor._id), String(drive._id))
          rsvpUrl = buildRsvpUrl(rsvpToken, appUrl)
          const short = await getOrCreateRsvpSmsLink(String(existingDonor._id), String(drive._id))
          rsvpShortUrl = short.url
        } catch (e) {
          console.warn('[Register API] Could not build RSVP URL:', e.message)
        }

        const profileUrl = existingDonor.donorToken
          ? `${appUrl}/donor/${existingDonor.donorToken}`
          : null

        let message =
          "You're already on the roster for this drive. Use your donor profile or RSVP page to review details."

        if (participant.status === 'completed') {
          message =
            'Our records show you already completed this drive. Open your donor profile for your history and next eligible date.'
        }

        return NextResponse.json(
          {
            error: 'Already registered for this drive',
            duplicate: true,
            sameDrive: true,
            message,
            participantStatus: participant.status,
            rsvpUrl,
            rsvpShortUrl,
            profileUrl,
            donorId: existingDonor._id.toString(),
            donorToken: existingDonor.donorToken || null,
          },
          { status: 409 }
        )
      }

      const donorUpdates = {
        driveId: drive._id,
        driveToken,
        hasDonatedBefore: Boolean(hasDonatedBefore) || existingDonor.hasDonatedBefore,
        isVerified: true,
        status: 'registered',
      }

      if (lastDonationDate) {
        donorUpdates.lastDonationDate = new Date(lastDonationDate)
      }
      if (medicalConditions) donorUpdates.medicalConditions = medicalConditions
      if (medications) donorUpdates.medications = medications
      if (
        isConfirmedBloodType(resolvedBloodType) ||
        existingDonor.bloodType === 'unknown'
      ) {
        donorUpdates.bloodType = resolvedBloodType
      }

      await Donor.updateOne({ _id: existingDonor._id }, { $set: donorUpdates })

      const participantDoc = await upsertParticipant(drive._id, existingDonor._id, {
        source: 'public',
        status: 'registered',
      })

      const refreshedDonor = await Donor.findById(existingDonor._id)
      await syncDonorWithParticipant(refreshedDonor, participantDoc, drive)
      await VerificationToken.useToken(verificationToken)

      const profileUrl = refreshedDonor.donorToken
        ? `${appUrl}/donor/${refreshedDonor.donorToken}`
        : null

      if (refreshedDonor.email && profileUrl) {
        try {
          const Organization = (await import('@/lib/models/Organization')).default
          const org = await Organization.findById(drive.organizationId).select('name').lean()
          const { sendDonorDriveRegistrationEmail } = await import('@/lib/org-onboarding/emails')
          await sendDonorDriveRegistrationEmail({
            to: refreshedDonor.email,
            donorName: `${refreshedDonor.firstName} ${refreshedDonor.lastName}`,
            driveName: drive.name,
            profileUrl,
            organizationName: org?.name || '',
          })
        } catch (emailErr) {
          console.warn('[Register API] Returning donor welcome email failed:', emailErr.message)
        }
      }

      const duration = Date.now() - startTime
      console.log('[Register API] Returning donor enrolled for drive in', duration, 'ms')

      return NextResponse.json({
        success: true,
        returningDonor: true,
        message: `Welcome back! You're registered for ${drive.name}.`,
        data: {
          donorId: refreshedDonor._id.toString(),
          donorToken: refreshedDonor.donorToken,
          fullName: `${refreshedDonor.firstName} ${refreshedDonor.lastName}`,
          bloodType: refreshedDonor.bloodType,
          profileUrl,
        },
      }, { status: 200 })
    }

    // Calculate age
    if (!dateOfBirth) {
      return NextResponse.json(
        { error: 'Date of birth is required' },
        { status: 400 }
      )
    }

    const birthDate = new Date(dateOfBirth)
    const age = new Date().getFullYear() - birthDate.getFullYear()

    if (age < 18 || age > 65) {
      console.log('[Register API] Age validation failed:', age)
      return NextResponse.json(
        { error: 'Donor must be between 18 and 65 years old' },
        { status: 400 }
      )
    }

    // Generate donor token for access
    const crypto = require('crypto')
    const donorToken = crypto.randomBytes(16).toString('hex')

    // Create donor
    const donorData = {
      firstName,
      lastName,
      email: normalizedEmail,
      phone: normalizedPhone,
      bloodType: resolvedBloodType,
      dateOfBirth: birthDate,
      gender,
      weight: weight ? parseFloat(weight) : null,
      hasDonatedBefore,
      lastDonationDate: lastDonationDate ? new Date(lastDonationDate) : null,
      medicalConditions: medicalConditions || '',
      medications: medications || '',
      consentGiven,
      driveToken,
      driveId: drive._id,
      organizationId: drive.organizationId,
      isVerified: true, // OTP verified
      status: 'registered',
      donorToken, // Set the generated donor token
    }

    console.log('[Register API] Creating donor with data:', {
      ...donorData,
      email: '***',
      phone: '***',
    })

    const donor = await Donor.create(donorData)

    console.log('[Register API] Donor created successfully:', donor._id)

    const { upsertParticipant } = await import('@/lib/drive-participant-helpers')
    await upsertParticipant(drive._id, donor._id, { source: 'public', status: 'registered' })

    await VerificationToken.useToken(verificationToken)
    console.log('[Register API] Verification token marked as used')

    const appUrl = getAppUrl(request)
    const profileUrl = donor.donorToken ? `${appUrl}/donor/${donor.donorToken}` : null

    if (donor.email && profileUrl) {
      try {
        const Organization = (await import('@/lib/models/Organization')).default
        const org = await Organization.findById(drive.organizationId).select('name').lean()
        const { sendDonorDriveRegistrationEmail } = await import('@/lib/org-onboarding/emails')
        await sendDonorDriveRegistrationEmail({
          to: donor.email,
          donorName: `${firstName} ${lastName}`,
          driveName: drive.name,
          profileUrl,
          organizationName: org?.name || '',
        })
      } catch (emailErr) {
        console.warn('[Register API] Donor welcome email failed:', emailErr.message)
      }
    }

    const duration = Date.now() - startTime
    console.log('[Register API] Registration completed successfully in', duration, 'ms')

    return NextResponse.json({
      success: true,
      message: 'Registration successful! Check your email for your donor profile link.',
      data: {
        donorId: donor._id.toString(),
        donorToken: donor.donorToken,
        fullName: `${firstName} ${lastName}`,
        bloodType: resolvedBloodType,
        profileUrl,
      },
    }, { status: 201 })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[Register API] Unexpected error after', duration, 'ms:', error)
    console.error('[Register API] Error stack:', error.stack)
    
    return NextResponse.json(
      { 
        error: 'Registration failed: ' + error.message,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}
