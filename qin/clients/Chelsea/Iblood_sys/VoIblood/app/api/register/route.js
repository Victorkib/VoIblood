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

    if (existingDonor) {
      console.log('[Register API] Duplicate donor found:', existingDonor._id)
      return NextResponse.json(
        { 
          error: 'You are already registered with this email or phone',
          duplicate: true,
          donorId: existingDonor._id.toString(),
        },
        { status: 409 }
      )
    }

    // Calculate age
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
      bloodType,
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
    console.log('[Register API] Donor driveToken:', donor.driveToken)
    console.log('[Register API] Donor donorToken:', donor.donorToken)
    console.log('[Register API] Donor driveId:', donor.driveId)

    // Mark verification token as used
    await VerificationToken.useToken(verificationToken)
    console.log('[Register API] Verification token marked as used')

    // Update drive stats
    if (drive.stats) {
      drive.stats.registrations = (drive.stats.registrations || 0) + 1
      await drive.save()
      console.log('[Register API] Drive stats updated:', drive.stats.registrations)
    }

    const duration = Date.now() - startTime
    console.log('[Register API] Registration completed successfully in', duration, 'ms')

    return NextResponse.json({
      success: true,
      message: 'Registration successful! You can now access your donor profile.',
      data: {
        donorId: donor._id.toString(),
        donorToken: donor.donorToken,
        fullName: `${firstName} ${lastName}`,
        bloodType,
        profileUrl: donor.donorToken ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/donor/${donor.donorToken}` : null,
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
