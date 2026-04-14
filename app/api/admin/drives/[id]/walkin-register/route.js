/**
 * POST /api/admin/drives/[id]/walkin-register
 * 
 * Register a walk-in donor directly at the drive.
 * Walk-ins bypass the online registration flow and are
 * immediately added as checked_in donors.
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin, isOrgAdmin } from '@/lib/rbac'
import DonationDrive from '@/lib/models/DonationDrive'
import Donor from '@/lib/models/Donor'

export async function POST(request, { params }) {
  try {
    await connectDB()

    // Unwrap params (Next.js 15+ requirement)
    const resolvedParams = await params
    const { id: driveId } = resolvedParams

    // Get user from session
    const user = await getCurrentUser(request.cookies)
    if (!user || (!isSuperAdmin(user.role) && !isOrgAdmin(user.role))) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get request body
    const body = await request.json()
    const {
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
      notes,
    } = body

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !bloodType || !dateOfBirth || !gender) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get the drive
    const drive = await DonationDrive.findById(driveId)
    if (!drive) {
      return NextResponse.json(
        { error: 'Drive not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (!isSuperAdmin(user.role) && drive.organizationId.toString() !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if donor already exists with this email/phone in the organization
    const normalizedEmail = email.toLowerCase().trim()
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '')

    const existingDonor = await Donor.findOne({
      organizationId: drive.organizationId,
      $or: [
        { email: normalizedEmail },
        { phone: normalizedPhone },
      ],
    })

    if (existingDonor) {
      return NextResponse.json(
        {
          error: 'Donor already registered with this email or phone',
          donorId: existingDonor._id.toString(),
          duplicate: true,
        },
        { status: 409 }
      )
    }

    // Calculate age
    const birthDate = new Date(dateOfBirth)
    const age = new Date().getFullYear() - birthDate.getFullYear()

    if (age < 18 || age > 65) {
      return NextResponse.json(
        { error: 'Donor must be between 18 and 65 years old' },
        { status: 400 }
      )
    }

    // Generate donor token
    const crypto = require('crypto')
    const donorToken = crypto.randomBytes(16).toString('hex')

    // Create donor directly as checked_in
    const donor = await Donor.create({
      firstName,
      lastName,
      email: normalizedEmail,
      phone: normalizedPhone,
      bloodType,
      dateOfBirth: birthDate,
      gender,
      weight: weight ? parseFloat(weight) : null,
      hasDonatedBefore: hasDonatedBefore || false,
      lastDonationDate: lastDonationDate ? new Date(lastDonationDate) : null,
      medicalConditions: medicalConditions || '',
      medications: medications || '',
      consentGiven: true, // Implied by showing up
      driveToken: drive.registrationToken,
      driveId: drive._id,
      organizationId: drive.organizationId,
      status: 'checked_in', // Walk-ins are immediately checked in
      isVerified: true,
      donorToken,
      registrationType: 'walk_in',
      notes: notes || '',
    })

    // Update drive registration count
    if (!drive.stats) {
      drive.stats = { clicks: 0, registrations: 0, confirmed: 0, completed: 0 }
    }
    drive.stats.registrations = (drive.stats.registrations || 0) + 1
    await drive.save()

    return NextResponse.json({
      success: true,
      message: 'Walk-in donor registered successfully',
      data: {
        donorId: donor._id.toString(),
        donorToken: donor.donorToken,
        status: donor.status,
        profileUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/donor/${donor.donorToken}`,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/drives/[id]/walkin-register error:', error)
    return NextResponse.json(
      { error: 'Failed to register walk-in donor' },
      { status: 500 }
    )
  }
}
