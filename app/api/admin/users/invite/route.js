/**
 * POST /api/admin/users/invite
 * Send invitation to user (super_admin or org_admin)
 * 
 * This:
 * 1. Creates invitation in database
 * 2. Generates unique token
 * 3. Returns invitation link (to be sent via email)
 * 
 * Super admins: Can invite to any organization
 * Org admins: Can only invite to their own organization
 * 
 * User clicks link → Creates account → Auto-assigned to organization
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Invitation from '@/lib/models/Invitation'
import Organization from '@/lib/models/Organization'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin, isOrgAdmin } from '@/lib/rbac'
import { sendInvitationEmail } from '@/lib/email-service'

export async function POST(request) {
  try {
    await connectDB()

    // Verify admin access (super_admin or org_admin)
    const currentUser = await getCurrentUser(request.cookies)
    if (!currentUser || (!isSuperAdmin(currentUser.role) && !isOrgAdmin(currentUser.role))) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      email,
      role,
      organizationId,
      department,
      title,
      message,
    } = body

    console.log('[Invite API] Received body:', body)

    // Validation
    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['org_admin', 'manager', 'staff', 'viewer']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be org_admin, manager, staff, or viewer' },
        { status: 400 }
      )
    }

    // Get organization
    let orgId = organizationId
    if (!orgId) {
      // Use current user's organization if not specified
      if (!currentUser.organizationId) {
        return NextResponse.json(
          { error: 'Organization must be specified' },
          { status: 400 }
        )
      }
      orgId = currentUser.organizationId
    } else {
      // Verify org_admin can only invite to their own organization
      if (!isSuperAdmin(currentUser.role) && currentUser.organizationId !== orgId) {
        return NextResponse.json(
          { error: 'You can only invite users to your own organization' },
          { status: 403 }
        )
      }
    }

    console.log('[Invite API] Using organizationId:', orgId)

    const organization = await Organization.findById(orgId)
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Check if user already exists
    const User = (await import('@/lib/models/User')).default
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser && existingUser.organizationId) {
      return NextResponse.json(
        { error: 'User is already a member of an organization' },
        { status: 409 }
      )
    }

    // Check for existing pending invitation
    const existingInvitation = await Invitation.findOne({
      email: email.toLowerCase(),
      organizationId: organization._id,
      status: 'pending',
    })

    if (existingInvitation) {
      return NextResponse.json({
        success: true,
        message: 'Invitation already sent to this email',
        data: {
          invitation: {
            id: existingInvitation._id.toString(),
            email: existingInvitation.email,
            role: existingInvitation.role,
            organization: {
              id: organization._id.toString(),
              name: organization.name,
            },
            expiresAt: existingInvitation.expiresAt,
            invitationLink: `${process.env.NEXT_PUBLIC_APP_URL}/auth/signup?token=${existingInvitation.token}`,
          },
        },
      })
    }

    // Create invitation
    console.log('[Invite API] Creating invitation...')
    const invitation = await Invitation.createInvitation({
      email: email.toLowerCase(),
      role,
      organizationId: orgId,
      invitedBy: currentUser._id,
      message: message || `You've been invited to join ${organization.name} as ${role.replace('_', ' ')}`,
      department: department || null,
      title: title || null,
    })
    console.log('[Invite API] Invitation created:', invitation._id)

    // Generate invitation link
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/signup?token=${invitation.token}`

    // Send invitation email
    console.log('[Invite API] Sending invitation email to:', email)
    try {
      await sendInvitationEmail({
        email: email.toLowerCase(),
        inviterName: currentUser.fullName,
        role,
        token: invitation.token,
        expiresAt: invitation.expiresAt,
        organizationName: organization.name,
      })
      console.log('[Invite API] Email sent successfully!')
    } catch (emailError) {
      console.error('[Invite API] Failed to send email:', emailError.message)
      // Don't fail the request - email is optional
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation created successfully',
      data: {
        invitation: {
          id: invitation._id.toString(),
          email: invitation.email,
          role: invitation.role,
          department: invitation.department,
          title: invitation.title,
          organization: {
            id: organization._id.toString(),
            name: organization.name,
          },
          expiresAt: invitation.expiresAt,
          daysUntilExpiry: invitation.daysUntilExpiry,
        },
        invitationLink: invitationLink,
        instructions: {
          step1: 'Send this link to the user via email or SMS',
          step2: 'User clicks link and creates account',
          step3: 'User is automatically assigned to organization with specified role',
          note: 'Invitation expires in 7 days',
        },
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Invitation creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create invitation: ' + error.message },
      { status: 500 }
    )
  }
}
