/**
 * Accept Invitation API
 * POST /api/invitations/accept
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Invitation from '@/lib/models/Invitation'
import User from '@/lib/models/User'
import { logAuditEvent, AUDIT_ACTIONS, AUDIT_SEVERITY, getAuditContextFromRequest } from '@/lib/audit-logger'

export async function POST(request) {
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

    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      )
    }

    // Find invitation
    const invitation = await Invitation.findByToken(token)

    // Check if invitation is valid
    if (!invitation.isActive) {
      return NextResponse.json(
        { 
          error: invitation.status === 'expired' ? 'Invitation has expired' :
                 invitation.status === 'accepted' ? 'Invitation already accepted' :
                 invitation.status === 'declined' ? 'Invitation declined' :
                 'Invitation is no longer valid',
          status: invitation.status,
        },
        { status: 400 }
      )
    }

    // Check if email matches
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invitation is not for your email address' },
        { status: 403 }
      )
    }

    // Accept invitation
    await invitation.accept(user)

    // Log audit event
    await logAuditEvent({
      action: 'users.invite',
      userId: user._id.toString(),
      organizationId: invitation.organizationId.toString(),
      resourceType: 'invitation',
      resourceId: invitation._id.toString(),
      severity: AUDIT_SEVERITY.MEDIUM,
      description: `User ${user.fullName} accepted invitation to join organization`,
      metadata: {
        role: invitation.role,
        department: invitation.department,
        title: invitation.title,
      },
      ...getAuditContextFromRequest(request),
    })

    // Update session cookie with new org info
    const updatedSession = {
      ...session,
      user: {
        ...session.user,
        organizationId: invitation.organizationId.toString(),
        organizationName: invitation.organizationId.name,
        role: invitation.role,
      },
    }

    const response = NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
      data: {
        user: {
          id: user._id.toString(),
          email: user.email,
          fullName: user.fullName,
          role: invitation.role,
          organizationId: invitation.organizationId.toString(),
          organizationName: invitation.organizationId.name,
        },
        organization: {
          id: invitation.organizationId._id,
          name: invitation.organizationId.name,
          type: invitation.organizationId.type,
        },
      },
    })

    // Update cookie
    response.cookies.set({
      name: 'auth-session',
      value: JSON.stringify(updatedSession),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Accept invitation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}
