/**
 * Cancel Invitation API
 * POST /api/invitations/cancel
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Invitation from '@/lib/models/Invitation'
import { logAuditEvent, AUDIT_SEVERITY, getAuditContextFromRequest } from '@/lib/audit-logger'
import { getRateLimitInfo, createRateLimitError } from '@/lib/rate-limiter'
import { hasAdminAccess } from '@/lib/rbac'
import User from '@/lib/models/User'

export async function POST(request) {
  const rateLimitInfo = getRateLimitInfo(request, 'delete')
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
    const currentUser = await User.findOne({ supabaseId: session.user.supabaseId })

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (!hasAdminAccess(currentUser)) {
      return NextResponse.json(
        { error: 'Insufficient permissions - only admins can cancel invitations' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { invitationId } = body

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      )
    }

    // Find invitation
    const invitation = await Invitation.findById(invitationId)

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to cancel this invitation
    const isSuperAdminUser = currentUser.role === 'super_admin'
    if (!currentUser.organizationId?.equals(invitation.organizationId) && !isSuperAdminUser) {
      return NextResponse.json(
        { error: 'You can only cancel invitations for your own organization' },
        { status: 403 }
      )
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot cancel invitation with status: ${invitation.status}` },
        { status: 400 }
      )
    }

    // Cancel invitation
    invitation.status = 'cancelled'
    await invitation.save()

    // Log audit event
    await logAuditEvent({
      action: 'users.invite',
      userId: currentUser._id.toString(),
      organizationId: invitation.organizationId.toString(),
      resourceType: 'invitation',
      resourceId: invitation._id.toString(),
      severity: AUDIT_SEVERITY.MEDIUM,
      description: `Invitation cancelled for ${invitation.email}`,
      metadata: { 
        email: invitation.email, 
        role: invitation.role,
        cancelledBy: currentUser.fullName 
      },
      ...getAuditContextFromRequest(request),
    })

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled successfully',
    })
  } catch (error) {
    console.error('Cancel invitation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cancel invitation' },
      { status: 500 }
    )
  }
}
