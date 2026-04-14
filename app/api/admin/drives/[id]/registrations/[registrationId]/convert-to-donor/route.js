/**
 * POST /api/admin/drives/[id]/registrations/[registrationId]/convert-to-donor
 * 
 * Converts a drive registration into a donor record
 * This is called when a donor is checked-in at a drive
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Donor from '@/lib/models/Donor'
import DonationDrive from '@/lib/models/DonationDrive'
import { getCurrentUser } from '@/lib/session'
import { canPerformAction } from '@/lib/rbac'
import { logAuditEvent, AUDIT_ACTIONS, AUDIT_SEVERITY, getAuditContextFromRequest } from '@/lib/audit-logger'
import { sendDonorRegistrationEmail } from '@/lib/email-service'

export async function POST(request, { params }) {
  try {
    await connectDB()

    // Get user from session
    const user = await getCurrentUser(request.cookies)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check permissions
    if (!canPerformAction(user, 'create', 'donors')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create donors' },
        { status: 403 }
      )
    }

    const { id: driveId, registrationId } = params

    // Get the drive
    const drive = await DonationDrive.findById(driveId)
    if (!drive) {
      return NextResponse.json(
        { error: 'Drive not found' },
        { status: 404 }
      )
    }

    // Find the registration in the drive
    const registration = drive.regions?.find(r => r._id.toString() === registrationId.toString())
    
    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    // Check if donor already exists with this email
    const existingDonor = await Donor.findOne({ 
      email: registration.email.toLowerCase(),
      organizationId: drive.organizationId 
    })

    if (existingDonor) {
      return NextResponse.json(
        { 
          error: 'Donor already exists',
          donor: existingDonor,
          message: 'This person is already registered as a donor'
        },
        { status: 409 }
      )
    }

    // Create donor from registration data
    const crypto = require('crypto')
    const donorToken = crypto.randomBytes(16).toString('hex')

    const donor = await Donor.create({
      firstName: registration.fullName.split(' ')[0],
      lastName: registration.fullName.split(' ').slice(1).join(' '),
      email: registration.email.toLowerCase(),
      phone: registration.phone,
      bloodType: registration.bloodType,
      dateOfBirth: new Date(registration.dateOfBirth),
      gender: registration.gender,
      weight: registration.weight || undefined,
      hasDonatedBefore: registration.hasDonatedBefore || false,
      lastDonationDate: registration.lastDonationDate || null,
      medicalConditions: registration.medicalConditions || '',
      medications: registration.medications || '',
      consentGiven: true, // Already consented during registration
      driveToken: drive.token,
      status: 'checked_in', // Start as checked-in since they're at the drive
      isVerified: true, // Verified at the drive
      organizationId: drive.organizationId,
      donorToken,
    })

    // Update drive stats
    drive.totalDonorsRegistered = (drive.totalDonorsRegistered || 0) + 1
    await drive.save()

    // Send donor registration email
    try {
      await sendDonorRegistrationEmail(donor, drive.organizationId)
    } catch (emailErr) {
      console.warn('Failed to send donor registration email:', emailErr.message)
    }

    // Log audit event
    try {
      await logAuditEvent({
        action: AUDIT_ACTIONS.DONOR_CREATE,
        userId: user._id.toString(),
        organizationId: drive.organizationId.toString(),
        resourceType: 'donor',
        resourceId: donor._id.toString(),
        severity: AUDIT_SEVERITY.MEDIUM,
        description: `Donor created from drive registration: ${registration.fullName}`,
        metadata: {
          driveId: drive._id.toString(),
          driveName: drive.name,
          registrationId: registration._id.toString(),
          convertedFrom: 'drive_registration',
        },
      })
    } catch (auditErr) {
      console.warn('Failed to log audit event:', auditErr.message)
    }

    return NextResponse.json({
      success: true,
      message: 'Donor created successfully from drive registration',
      data: donor,
    }, { status: 201 })

  } catch (error) {
    console.error('Convert registration to donor error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to convert registration to donor' },
      { status: 500 }
    )
  }
}
