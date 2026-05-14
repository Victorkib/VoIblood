/**
 * GET /api/donors - List all donors with filtering and pagination
 * POST /api/donors - Create a new donor
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Donor from '@/lib/models/Donor'
import Organization from '@/lib/models/Organization'
import { getRateLimitInfo, createRateLimitError } from '@/lib/rate-limiter'
import { sendDonorRegistrationEmail, sendDonorAdminQuickWelcomeEmail } from '@/lib/email-service'
import { logAuditEvent, AUDIT_ACTIONS, AUDIT_SEVERITY, getAuditContextFromRequest } from '@/lib/audit-logger'
import { canPerformAction, hasOrgCapability, ORG_CAPABILITIES } from '@/lib/rbac'
import { getCurrentUser } from '@/lib/session'
import {
  findDuplicateDonorForOrganization,
  normalizeDonorEmail,
  isValidDonorEmail,
  isPlaceholderOrDisposableEmail,
} from '@/lib/donor-dedupe'

/**
 * GET /api/donors
 * Query parameters:
 * - organizationId (optional - auto-detected from session if not provided)
 * - bloodType (optional)
 * - status (optional)
 * - search (optional) - searches firstName, lastName, email, phone
 * - page (optional, default: 1)
 * - limit (optional, default: 10)
 */
export async function GET(request) {
  // Check rate limit
  const rateLimitInfo = getRateLimitInfo(request, 'default')
  if (!rateLimitInfo.allowed) {
    return NextResponse.json(createRateLimitError(rateLimitInfo), { status: 429 })
  }

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

    const { searchParams } = new URL(request.url)
    let organizationId = searchParams.get('organizationId')

    // Auto-detect organization from user session if not provided
    if (!organizationId) {
      if (!user.organizationId) {
        return NextResponse.json(
          { error: 'You are not assigned to any organization' },
          { status: 403 }
        )
      }
      organizationId = user.organizationId.toString()
    }

    // Super admins can access any organization
    if (user.role !== 'super_admin' && user.organizationId?.toString() !== organizationId) {
      return NextResponse.json(
        { error: 'Access denied - cannot access resources from another organization' },
        { status: 403 }
      )
    }

    // Check if user has permission
    if (!canPerformAction(user, 'view', 'donors')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view donors' },
        { status: 403 }
      )
    }

    // Check if organization has capability to manage donors
    const organization = await Organization.findById(organizationId)
    if (organization && !hasOrgCapability(organization, ORG_CAPABILITIES.MANAGE_DONORS)) {
      return NextResponse.json(
        { error: 'This organization does not have donor management capabilities' },
        { status: 403 }
      )
    }

    const bloodType = searchParams.get('bloodType')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const driveId = searchParams.get('driveId') // New: filter by drive
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Build query - include donors with organizationId OR driveToken matching org's drives
    // This ensures drive registrants appear even if organizationId wasn't set initially
    const DonationDrive = (await import('@/lib/models/DonationDrive')).default
    const orgDrives = await DonationDrive.find({ organizationId })
    const orgDriveTokens = orgDrives.map(d => d.registrationToken)

    // Donors belong to the org either directly (organizationId) or via a drive registration (driveToken).
    const visibilityOr = [
      { organizationId },
      { driveToken: { $in: orgDriveTokens } },
    ]

    const query = {}

    if (search) {
      const searchRegex = new RegExp(search, 'i')
      const searchOr = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ]
      // AND: must be visible to this org AND match search (do not widen $or across orgs)
      query.$and = [{ $or: visibilityOr }, { $or: searchOr }]
    } else {
      query.$or = visibilityOr
    }

    if (bloodType) query.bloodType = bloodType
    if (status) query.status = status

    // Filter by specific drive if provided
    if (driveId) {
      const drive = await DonationDrive.findById(driveId)
      if (drive) {
        query.driveToken = drive.registrationToken
      }
    }

    // Calculate skip
    const skip = (page - 1) * limit

    // Execute query with pagination
    const donors = await Donor.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    // Get total count
    const total = await Donor.countDocuments(query)

    return NextResponse.json({
      success: true,
      data: donors,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('GET /api/donors error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch donors', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/donors
 * Create a new donor
 */
export async function POST(request) {
  // Check rate limit for creates
  const rateLimitInfo = getRateLimitInfo(request, 'create')
  if (!rateLimitInfo.allowed) {
    return NextResponse.json(createRateLimitError(rateLimitInfo), { status: 429 })
  }

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

    const body = await request.json()
    const { firstName, lastName, email, phone, bloodType, dateOfBirth, gender } = body
    const skipWelcomeEmail = Boolean(body.skipWelcomeEmail)

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !bloodType || !dateOfBirth || !gender) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const normEmail = normalizeDonorEmail(email)
    if (!isValidDonorEmail(normEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    if (isPlaceholderOrDisposableEmail(normEmail)) {
      return NextResponse.json(
        { error: 'Please use a real contact email. Temporary or disposable addresses are not allowed.' },
        { status: 400 }
      )
    }

    // Get organization ID from user session
    let organizationId = body.organizationId || user.organizationId?.toString()
    
    if (!organizationId) {
      return NextResponse.json(
        { error: 'You are not assigned to any organization' },
        { status: 403 }
      )
    }

    // RBAC check - user must have donor.create permission
    if (!canPerformAction(user, 'create', 'donors')) {
      return NextResponse.json(
        { error: 'Forbidden - insufficient permissions to create donors' },
        { status: 403 }
      )
    }

    // Super admins can create in any org, others only in their own
    if (user.role !== 'super_admin' && user.organizationId?.toString() !== organizationId) {
      return NextResponse.json(
        { error: 'Access denied - cannot create donors in another organization' },
        { status: 403 }
      )
    }

    // Check if organization exists
    const organization = await Organization.findById(organizationId)
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Check if organization has donor management capability
    if (!hasOrgCapability(organization, ORG_CAPABILITIES.MANAGE_DONORS)) {
      return NextResponse.json(
        { error: 'This organization does not have donor management capabilities' },
        { status: 403 }
      )
    }

    const duplicate = await findDuplicateDonorForOrganization(Donor, organizationId, {
      email: normEmail,
      phone,
      firstName,
      lastName,
      dateOfBirth,
    })
    if (duplicate?.donor) {
      return NextResponse.json(
        {
          error: 'A donor who appears to be the same person already exists in this organization.',
          reason: duplicate.reason,
          donorId: duplicate.donor._id?.toString?.(),
        },
        { status: 409 }
      )
    }

    // Create donor
    const crypto = require('crypto')
    const donorToken = crypto.randomBytes(16).toString('hex')

    const allowedRegistrationTypes = ['online', 'walk_in', 'admin_quick']
    const registrationType = allowedRegistrationTypes.includes(body.registrationType)
      ? body.registrationType
      : 'online'

    const donor = await Donor.create({
      firstName,
      lastName,
      email: normEmail,
      phone,
      bloodType,
      dateOfBirth,
      gender,
      weight: body.weight,
      medicalConditions: body.medicalConditions,
      medications: body.medications,
      hasDonatedBefore: body.hasDonatedBefore,
      lastDonationDate: body.lastDonationDate,
      driveToken: body.driveToken,
      driveId: body.driveId,
      status: body.status || 'registered',
      registrationType,
      notes: body.notes,
      consentGiven: body.consentGiven !== false,
      isVerified: body.isVerified === true,
      organizationId,
      donorToken,
    })

    // Update organization stats
    organization.totalDonorsRegistered = (organization.totalDonorsRegistered || 0) + 1
    await organization.save()

    // Welcome / confirmation email (non-blocking)
    if (!skipWelcomeEmail) {
      try {
        if (donor.registrationType === 'admin_quick') {
          await sendDonorAdminQuickWelcomeEmail({
            to: donor.email,
            donorName: `${donor.firstName} ${donor.lastName}`,
            donorToken: donor.donorToken,
            organizationName: organization.name,
          })
        } else {
          await sendDonorRegistrationEmail({
            to: donor.email,
            donorName: `${donor.firstName} ${donor.lastName}`,
            driveName: body.driveName || organization.name || 'Blood donation program',
            appointmentDate: body.appointmentDate || undefined,
          })
        }
      } catch (emailErr) {
        console.warn('Failed to send donor welcome email:', emailErr.message)
      }
    }

    // Log audit event (non-blocking)
    try {
      const auditContext = getAuditContextFromRequest(request)
      await logAuditEvent({
        action: AUDIT_ACTIONS.DONOR_CREATE,
        userId: body.userId || 'system',
        organizationId,
        resourceType: 'donor',
        resourceId: donor._id.toString(),
        severity: AUDIT_SEVERITY.MEDIUM,
        changes: {
          created: {
            firstName: donor.firstName,
            lastName: donor.lastName,
            bloodType: donor.bloodType,
            email: donor.email,
          },
        },
        description: `New donor registered: ${donor.firstName} ${donor.lastName} (${donor.bloodType})`,
        ...auditContext,
      })
    } catch (auditErr) {
      console.warn('Failed to log audit event:', auditErr.message)
      // Don't fail the request if audit logging fails
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Donor created successfully',
        data: donor,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/donors error:', error)
    return NextResponse.json(
      { error: 'Failed to create donor', details: error.message },
      { status: 500 }
    )
  }
}
