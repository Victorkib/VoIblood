/**
 * POST /api/admin/users/[id]/approve
 * Approve a join request and assign role
 * 
 * Access: Org admins and super admins only
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin, isOrgAdmin } from '@/lib/rbac'
import JoinRequest from '@/lib/models/JoinRequest'
import User from '@/lib/models/User'
import Organization from '@/lib/models/Organization'

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
    const { role, reviewNotes, organizationId } = body

    if (!role || !organizationId) {
      return NextResponse.json(
        { error: 'Role and organization ID are required' },
        { status: 400 }
      )
    }

    const validRoles = ['viewer', 'staff', 'manager', 'org_admin']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Verify user has access to this organization
    if (!isSuperAdmin(user.role)) {
      const org = await Organization.findById(organizationId)
      if (!org || org._id.toString() !== user.organizationId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
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

    // Approve the request
    await JoinRequest.approveRequest(
      joinRequest._id,
      role,
      user._id,
      reviewNotes || ''
    )

    // Update user's organization and role
    const mongoUser = await User.findById(userId)
    if (mongoUser) {
      const org = await Organization.findById(organizationId)
      mongoUser.organizationId = org._id
      mongoUser.organizationName = org.name
      mongoUser.role = role
      mongoUser.accountStatus = 'active'
      await mongoUser.save()
    }

    // TODO: Send approval email notification
    // await sendApprovalEmail(mongoUser.email, org.name, role)

    return NextResponse.json({
      success: true,
      message: 'User approved successfully',
      data: {
        userId,
        role,
        organizationId,
        organizationName: mongoUser?.organizationName,
      },
    })
  } catch (error) {
    console.error('POST /api/admin/users/[id]/approve error:', error)
    return NextResponse.json(
      { error: 'Failed to approve user' },
      { status: 500 }
    )
  }
}
