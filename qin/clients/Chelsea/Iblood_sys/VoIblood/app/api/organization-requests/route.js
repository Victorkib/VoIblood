/**
 * Organization Requests API Routes
 * POST /api/organization-requests - Create request to join org
 * GET /api/organization-requests - List requests
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import OrganizationRequest from '@/lib/models/OrganizationRequest'
import User from '@/lib/models/User'
import Organization from '@/lib/models/Organization'
import { getRateLimitInfo, createRateLimitError } from '@/lib/rate-limiter'
import { logAuditEvent, AUDIT_ACTIONS, AUDIT_SEVERITY, getAuditContextFromRequest } from '@/lib/audit-logger'
import { hasAdminAccess, isSuperAdmin } from '@/lib/rbac'

/**
 * POST /api/organization-requests
 * Create a request to join an organization
 */
export async function POST(request) {
  const rateLimitInfo = getRateLimitInfo(request, 'create')
  if (!rateLimitInfo.allowed) {
    return NextResponse.json(createRateLimitError(rateLimitInfo), { status: 429 })
  }

  try {
    await connectDB()

    // Get user from session
    const sessionCookie = request.cookies.get('auth-session')
    if (!sessionCookie?.value) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const session = JSON.parse(sessionCookie.value)
    const user = await User.findOne({ supabaseId: session.user.supabaseId })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user already has an organization
    if (user.organizationId && user.accountStatus === 'active') {
      return NextResponse.json(
        { error: 'You are already a member of an organization' },
        { status: 409 }
      )
    }

    const body = await request.json()
    const {
      organizationId,
      requestedRole,
      motivation,
      preferredDepartment,
      reason,
      experience,
      availability,
    } = body

    // Validation
    if (!organizationId || !motivation) {
      return NextResponse.json(
        { error: 'Organization ID and motivation are required' },
        { status: 400 }
      )
    }

    if (!['org_admin', 'manager', 'staff', 'viewer', 'any'].includes(requestedRole || 'staff')) {
      return NextResponse.json(
        { error: 'Invalid requested role' },
        { status: 400 }
      )
    }

    // Get organization
    const organization = await Organization.findById(organizationId)
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Update user's bio/title snapshot
    user.bio = body.userBio || user.bio
    user.title = body.userTitle || user.title
    await user.save()

    // Create request
    const orgRequest = await OrganizationRequest.createRequest({
      userId: user._id,
      organizationId,
      requestedRole: requestedRole || 'staff',
      motivation,
      userBio: user.bio,
      userTitle: user.title,
      preferredDepartment,
      reason,
      experience,
      availability: availability || 'full-time',
    })

    // TODO: Send notification to org admins
    // await sendOrgRequestNotification(orgRequest, organization)

    // Log audit event
    await logAuditEvent({
      action: 'users.create',
      userId: user._id.toString(),
      organizationId,
      resourceType: 'organization_request',
      resourceId: orgRequest._id.toString(),
      severity: AUDIT_SEVERITY.MEDIUM,
      description: `User ${user.fullName} requested to join ${organization.name}`,
      metadata: {
        requestedRole,
        preferredDepartment,
        availability,
      },
      ...getAuditContextFromRequest(request),
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Request submitted successfully',
        data: {
          id: orgRequest._id,
          status: orgRequest.status,
          requestedRole: orgRequest.requestedRole,
          expiresAt: orgRequest.expiresAt,
          organization: {
            id: organization._id,
            name: organization.name,
            type: organization.type,
          },
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Organization request creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create request' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/organization-requests
 * List requests based on user role
 */
export async function GET(request) {
  const rateLimitInfo = getRateLimitInfo(request, 'read')
  if (!rateLimitInfo.allowed) {
    return NextResponse.json(createRateLimitError(rateLimitInfo), { status: 429 })
  }

  try {
    await connectDB()

    // Get user from session
    const sessionCookie = request.cookies.get('auth-session')
    if (!sessionCookie?.value) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const session = JSON.parse(sessionCookie.value)
    const user = await User.findOne({ supabaseId: session.user.supabaseId })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')

    let requests

    if (isSuperAdmin(user.role)) {
      // Super admin can see all requests across all orgs
      const query = {}
      if (status) query.status = status
      
      requests = await OrganizationRequest.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId', 'fullName email bio title')
        .populate('organizationId', 'name type city state')
    } else if (hasAdminAccess(user)) {
      // Org admin can see requests for their organization
      requests = await OrganizationRequest.findPendingForOrganization(user.organizationId, {
        page,
        limit,
      })
    } else {
      // Regular users can only see their own requests
      requests = await OrganizationRequest.findByUser(user._id, {
        status: status || undefined,
        page,
        limit,
      })
    }

    return NextResponse.json({
      success: true,
      data: requests,
      pagination: {
        page,
        limit,
        total: requests.length,
      },
    })
  } catch (error) {
    console.error('Organization requests GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization requests' },
      { status: 500 }
    )
  }
}
