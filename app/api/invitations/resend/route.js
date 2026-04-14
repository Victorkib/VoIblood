/**
 * Resend Invitation API
 * POST /api/invitations/resend
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Invitation from '@/lib/models/Invitation'
import Organization from '@/lib/models/Organization'
import { sendInvitationEmail } from '@/lib/email-service'
import { logAuditEvent, AUDIT_SEVERITY, getAuditContextFromRequest } from '@/lib/audit-logger'
import { getRateLimitInfo, createRateLimitError } from '@/lib/rate-limiter'

export async function POST(request) {
  const rateLimitInfo = getRateLimitInfo(request, 'create')
  if (!rateLimitInfo.allowed) {
    return NextResponse.json(createRateLimitError(rateLimitInfo), { status: 429 })
  }

  try {
    await connectDB()

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
      .populate('organizationId', 'name type')
      .populate('invitedBy', 'fullName email')

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot resend invitation with status: ${invitation.status}` },
        { status: 400 }
      )
    }

    // Check if invitation is expired
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // Send invitation email
    await sendInvitationEmail(invitation, invitation.organizationId)

    // Log audit event
    await logAuditEvent({
      action: 'users.invite',
      userId: invitation.invitedBy._id.toString(),
      organizationId: invitation.organizationId._id.toString(),
      resourceType: 'invitation',
      resourceId: invitation._id.toString(),
      severity: AUDIT_SEVERITY.LOW,
      description: `Invitation email resent to ${invitation.email}`,
      metadata: { email: invitation.email, role: invitation.role },
      ...getAuditContextFromRequest(request),
    })

    return NextResponse.json({
      success: true,
      message: 'Invitation email resent successfully',
    })
  } catch (error) {
    console.error('Resend invitation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to resend invitation' },
      { status: 500 }
    )
  }
}
