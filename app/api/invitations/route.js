/**
 * Invitations API Routes
 * POST /api/invitations - Create invitation
 * GET /api/invitations - List invitations (for admin/super_admin)
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Invitation from '@/lib/models/Invitation'
import User from '@/lib/models/User'
import Organization from '@/lib/models/Organization'
import { getRateLimitInfo, createRateLimitError } from '@/lib/rate-limiter'
import { logAuditEvent, AUDIT_ACTIONS, AUDIT_SEVERITY, getAuditContextFromRequest } from '@/lib/audit-logger'
import { hasAdminAccess, isSuperAdmin } from '@/lib/rbac'

/**
 * POST /api/invitations
 * Create a new invitation
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
    const inviter = await User.findOne({ supabaseId: session.user.supabaseId })

    if (!inviter) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (!hasAdminAccess(inviter)) {
      return NextResponse.json(
        { error: 'Insufficient permissions - only admins can send invitations' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, role, organizationId, message, department, title } = body

    // Validation
    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      )
    }

    if (!['org_admin', 'manager', 'staff', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Get organization
    let organization
    if (organizationId) {
      organization = await Organization.findById(organizationId)
      if (!organization) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        )
      }
    } else {
      // Use inviter's organization
      if (!inviter.organizationId) {
        return NextResponse.json(
          { error: 'You are not assigned to an organization' },
          { status: 400 }
        )
      }
      organization = await Organization.findById(inviter.organizationId)
    }

    // Check if user already exists with this email
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser && existingUser.organizationId && existingUser.accountStatus === 'active') {
      return NextResponse.json(
        { error: 'User is already a member of an organization' },
        { status: 409 }
      )
    }

    // Create invitation
    const invitation = await Invitation.createInvitation({
      email: email.toLowerCase(),
      role,
      organizationId: organization._id,
      invitedBy: inviter._id,
      message,
      department,
      title,
    })

    // TODO: Send invitation email
    // await sendInvitationEmail(invitation, organization)

    // Log audit event
    await logAuditEvent({
      action: 'users.invite',
      userId: inviter._id.toString(),
      organizationId: organization._id.toString(),
      resourceType: 'invitation',
      resourceId: invitation._id.toString(),
      severity: AUDIT_SEVERITY.MEDIUM,
      description: `Invitation sent to ${email} as ${role}`,
      metadata: { email, role, department, title },
      ...getAuditContextFromRequest(request),
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Invitation sent successfully',
        data: {
          id: invitation._id,
          email: invitation.email,
          role: invitation.role,
          department: invitation.department,
          title: invitation.title,
          expiresAt: invitation.expiresAt,
          organization: {
            id: organization._id,
            name: organization.name,
          },
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Invitation creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create invitation' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/invitations
 * List invitations based on user role
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
    const email = searchParams.get('email')

    let invitations

    if (isSuperAdmin(user.role)) {
      // Super admin can see all invitations
      invitations = await Invitation.findByOrganization(user.organizationId || '*', {
        status: status || undefined,
        page,
        limit,
      })
    } else if (hasAdminAccess(user)) {
      // Org admin can see invitations for their organization
      invitations = await Invitation.findByOrganization(user.organizationId, {
        status: status || undefined,
        page,
        limit,
      })
    } else {
      // Regular users can only see their own pending invitations
      invitations = await Invitation.findPendingForEmail(user.email)
    }

    return NextResponse.json({
      success: true,
      data: invitations,
      pagination: {
        page,
        limit,
        total: invitations.length,
      },
    })
  } catch (error) {
    console.error('Invitations GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}
