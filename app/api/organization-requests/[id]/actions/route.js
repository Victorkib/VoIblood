/**
 * Organization Request Actions API
 * POST /api/organization-requests/[id]/actions
 * Actions: approve, reject
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import OrganizationRequest from '@/lib/models/OrganizationRequest'
import User from '@/lib/models/User'
import Organization from '@/lib/models/Organization'
import { hasAdminAccess } from '@/lib/rbac'
import { sendRequestApprovedEmail, sendRequestRejectedEmail } from '@/lib/org-request-emails'

export async function POST(request, { params }) {
  try {
    await connectDB()

    const resolvedParams = await params
    const { id: requestId } = resolvedParams

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
    const { action, assignedRole, rejectionReason, adminNotes } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
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
    if (adminUser.organizationId?.toString() !== orgRequest.organizationId?._id.toString()) {
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
      await orgRequest.approve(adminUser, assignedRole)

      // Update admin notes if provided
      if (adminNotes) {
        orgRequest.adminNotes = adminNotes
        await orgRequest.save()
      }

      // Send approval email to user
      try {
        const org = await Organization.findById(orgRequest.organizationId)
        await sendRequestApprovedEmail({
          to: orgRequest.userId.email,
          fullName: orgRequest.userId.fullName,
          requestType: 'join',
          orgName: org?.name || 'the organization',
          assignedRole: orgRequest.assignedRole || assignedRole || orgRequest.requestedRole,
        })
      } catch (emailErr) {
        console.warn('Failed to send approval email:', emailErr.message)
      }

      result = {
        success: true,
        message: 'Request approved successfully. Approval email sent.',
        data: {
          status: 'approved',
          assignedRole: orgRequest.assignedRole,
        },
      }
    } else if (action === 'reject') {
      // Reject request
      await orgRequest.reject(adminUser, rejectionReason || 'Not a good fit at this time')

      // Update admin notes if provided
      if (adminNotes) {
        orgRequest.adminNotes = adminNotes
        await orgRequest.save()
      }

      // Send rejection email to user
      try {
        const org = await Organization.findById(orgRequest.organizationId)
        await sendRequestRejectedEmail({
          to: orgRequest.userId.email,
          fullName: orgRequest.userId.fullName,
          requestType: 'join',
          orgName: org?.name || 'the organization',
          rejectionReason: orgRequest.rejectionReason || rejectionReason,
        })
      } catch (emailErr) {
        console.warn('Failed to send rejection email:', emailErr.message)
      }

      result = {
        success: true,
        message: 'Request rejected',
        data: {
          status: 'rejected',
          rejectionReason: orgRequest.rejectionReason,
        },
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Organization request action error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    )
  }
}
