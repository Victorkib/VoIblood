/**
 * Organization Request Actions API
 * POST /api/organization-requests/[id]/actions
 * Actions: approve, reject
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import OrganizationRequest from '@/lib/models/OrganizationRequest'
import User from '@/lib/models/User'
import { getRateLimitInfo, createRateLimitError } from '@/lib/rate-limiter'
import { logAuditEvent, AUDIT_ACTIONS, AUDIT_SEVERITY, getAuditContextFromRequest } from '@/lib/audit-logger'
import { hasAdminAccess } from '@/lib/rbac'

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
    const adminUser = await User.findOne({ supabaseId: session.user.supabaseId })

    if (!adminUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (!hasAdminAccess(adminUser)) {
      return NextResponse.json(
        { error: 'Insufficient permissions - only admins can process requests' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { requestId, action, assignedRole, assignedDepartment, rejectionReason } = body

    if (!requestId || !action) {
      return NextResponse.json(
        { error: 'Request ID and action are required' },
        { status: 400 }
      )
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    // Find request
    const orgRequest = await OrganizationRequest.findById(requestId)
      .populate('userId')
      .populate('organizationId')

    if (!orgRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    // Check if request is pending
    if (orgRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Request is already ${orgRequest.status}` },
        { status: 400 }
      )
    }

    // Check if admin belongs to the same organization
    if (adminUser.organizationId.toString() !== orgRequest.organizationId._id.toString()) {
      return NextResponse.json(
        { error: 'You can only process requests for your organization' },
        { status: 403 }
      )
    }

    let result

    if (action === 'approve') {
      // Validate role
      if (assignedRole && !['org_admin', 'manager', 'staff', 'viewer'].includes(assignedRole)) {
        return NextResponse.json(
          { error: 'Invalid assigned role' },
          { status: 400 }
        )
      }

      // Approve request
      await orgRequest.approve(adminUser, assignedRole, assignedDepartment)

      result = {
        success: true,
        message: 'Request approved successfully',
        data: {
          status: 'approved',
          assignedRole: orgRequest.assignedRole,
          assignedDepartment: orgRequest.assignedDepartment,
        },
      }

      // Log audit event
      await logAuditEvent({
        action: 'users.create',
        userId: adminUser._id.toString(),
        organizationId: orgRequest.organizationId._id.toString(),
        resourceType: 'organization_request',
        resourceId: orgRequest._id.toString(),
        severity: AUDIT_SEVERITY.HIGH,
        description: `Admin ${adminUser.fullName} approved request for ${orgRequest.userId.fullName}`,
        metadata: {
          assignedRole: orgRequest.assignedRole,
          assignedDepartment: orgRequest.assignedDepartment,
        },
        ...getAuditContextFromRequest(request),
      })
    } else if (action === 'reject') {
      // Reject request
      await orgRequest.reject(adminUser, rejectionReason || 'Not a good fit at this time')

      result = {
        success: true,
        message: 'Request rejected',
        data: {
          status: 'rejected',
          rejectionReason: orgRequest.rejectionReason,
        },
      }

      // Log audit event
      await logAuditEvent({
        action: 'users.create',
        userId: adminUser._id.toString(),
        organizationId: orgRequest.organizationId._id.toString(),
        resourceType: 'organization_request',
        resourceId: orgRequest._id.toString(),
        severity: AUDIT_SEVERITY.MEDIUM,
        description: `Admin ${adminUser.fullName} rejected request for ${orgRequest.userId.fullName}`,
        metadata: {
          rejectionReason: orgRequest.rejectionReason,
        },
        ...getAuditContextFromRequest(request),
      })
    }

    // TODO: Send notification email to user
    // await sendRequestDecisionEmail(orgRequest, action)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Organization request action error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    )
  }
}
