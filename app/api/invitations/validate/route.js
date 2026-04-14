/**
 * Validate Invitation API
 * GET /api/invitations/validate?token=xxx
 * 
 * Returns invitation details without accepting it
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Invitation from '@/lib/models/Invitation'

export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      )
    }

    // Find invitation
    const invitation = await Invitation.findByToken(token)

    // Check if invitation is active
    if (!invitation.isActive) {
      return NextResponse.json(
        {
          error: invitation.status === 'expired' 
            ? 'Invitation has expired' 
            : invitation.status === 'accepted' 
              ? 'Invitation already accepted' 
              : invitation.status === 'declined' 
                ? 'Invitation declined' 
                : 'Invitation is no longer valid',
          status: invitation.status,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: invitation._id,
        email: invitation.email,
        role: invitation.role,
        organizationId: invitation.organizationId,
        invitedBy: invitation.invitedBy,
        expiresAt: invitation.expiresAt,
        message: invitation.message,
        department: invitation.department,
        title: invitation.title,
        type: invitation.type,
        status: invitation.status,
      },
    })
  } catch (error) {
    console.error('Validate invitation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to validate invitation' },
      { status: 500 }
    )
  }
}
