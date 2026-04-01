/**
 * GET /api/donors - List all donors with filtering and pagination
 * POST /api/donors - Create a new donor
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Donor from '@/lib/models/Donor'
import Organization from '@/lib/models/Organization'
import { getRateLimitInfo, createRateLimitError } from '@/lib/rate-limiter'
import { sendDonorRegistrationEmail } from '@/lib/email-service'
import { logAuditEvent, AUDIT_ACTIONS, AUDIT_SEVERITY, getAuditContextFromRequest } from '@/lib/audit-logger'
import { canPerformAction, hasOrgCapability, ORG_CAPABILITIES } from '@/lib/rbac'
import { getCurrentUser, getOrganizationFilter } from '@/lib/session'

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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Build query
    const query = { organizationId }

    if (bloodType) query.bloodType = bloodType
    if (status) query.donationStatus = status

    if (search) {
      const searchRegex = new RegExp(search, 'i')
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ]
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

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !bloodType || !dateOfBirth || !gender) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Check if donor already exists
    const existingDonor = await Donor.findOne({ email, organizationId })
    if (existingDonor) {
      return NextResponse.json(
        { error: 'Donor with this email already exists in this organization' },
        { status: 409 }
      )
    }

    // Create donor
    const crypto = require('crypto')
    const donorToken = crypto.randomBytes(16).toString('hex')
    
    const donor = await Donor.create({
      ...body,
      organizationId,
      donorToken, // Explicitly set donorToken since we removed the pre-save hook
    })

    // Update organization stats
    organization.totalDonorsRegistered = (organization.totalDonorsRegistered || 0) + 1
    await organization.save()

    // Send registration confirmation email (non-blocking)
    try {
      await sendDonorRegistrationEmail(donor, organizationId)
    } catch (emailErr) {
      console.warn('Failed to send donor registration email:', emailErr.message)
      // Don't fail the request if email fails
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
