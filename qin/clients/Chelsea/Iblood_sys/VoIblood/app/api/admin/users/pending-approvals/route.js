/**
 * GET /api/admin/users/pending-approvals
 * Get all pending join requests for organization
 * 
 * Access: Org admins and super admins only
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin, isOrgAdmin } from '@/lib/rbac'
import JoinRequest from '@/lib/models/JoinRequest'
import Organization from '@/lib/models/Organization'

export async function GET(request) {
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

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId') || user.organizationId

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
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

    // Get pending requests
    const pendingRequests = await JoinRequest.getPendingForOrg(organizationId)

    return NextResponse.json({
      success: true,
      requests: pendingRequests.map(req => ({
        id: req._id.toString(),
        user: {
          id: req.userId._id.toString(),
          fullName: req.userId.fullName,
          email: req.userId.email,
          title: req.userId.title || '',
        },
        requestedRole: req.requestedRole,
        message: req.message || '',
        createdAt: req.createdAt,
      })),
    })
  } catch (error) {
    console.error('GET /api/admin/users/pending-approvals error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending approvals' },
      { status: 500 }
    )
  }
}
