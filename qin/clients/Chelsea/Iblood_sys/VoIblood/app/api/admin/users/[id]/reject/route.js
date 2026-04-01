/**
 * POST /api/admin/users/[id]/reject
 * Reject a join request
 * 
 * Access: Org admins and super admins only
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin, isOrgAdmin } from '@/lib/rbac'
import JoinRequest from '@/lib/models/JoinRequest'

export async function POST(request, { params }) {
  try {
    await connectDB()

    const user = await getCurrentUser(request.cookies)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check permissions
    if (!isSuperAdmin(user.role) && !isOrgAdmin(user.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { userId } = await params
    const body = await request.json()
    const { organizationId, reviewNotes } = body

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this organization
    const org = await Organization.findById(organizationId)
    if (!org || org._id.toString() !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Find the join request
    const joinRequest = await JoinRequest.findOne({
      userId,
      organizationId,
      status: 'pending',
    })

    if (!joinRequest) {
      return NextResponse.json(
        { error: 'No pending request found' },
        { status: 404 }
      )
    }

    // Reject the request
    await JoinRequest.rejectRequest(
      joinRequest._id,
      user._id,
      reviewNotes || ''
    )

    // TODO: Send rejection email notification
    // await sendRejectionEmail(userId, org.name, reviewNotes)

    return NextResponse.json({
      success: true,
      message: 'Request rejected successfully',
    })
  } catch (error) {
    console.error('POST /api/admin/users/[id]/reject error:', error)
    return NextResponse.json(
      { error: 'Failed to reject request' },
      { status: 500 }
    )
  }
}
