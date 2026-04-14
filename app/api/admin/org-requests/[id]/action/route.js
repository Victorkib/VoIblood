/**
 * POST /api/admin/org-requests/[id]/approve
 * POST /api/admin/org-requests/[id]/reject
 * 
 * Super admin actions for organization creation requests
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin } from '@/lib/rbac'
import OrganizationRequest from '@/lib/models/OrganizationRequest'
import Organization from '@/lib/models/Organization'
import User from '@/lib/models/User'
import { sendRequestApprovedEmail, sendRequestRejectedEmail } from '@/lib/org-request-emails'

/**
 * POST /api/admin/org-requests/[id]/approve
 * Approve org creation request, create org, assign user as org_admin
 */
export async function POST(request, { params }) {
  try {
    await connectDB()

    const resolvedParams = await params
    const { id } = resolvedParams

    const user = await getCurrentUser(request.cookies)
    if (!user || !isSuperAdmin(user.role)) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, adminNotes, rejectionReason } = body

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    const orgRequest = await OrganizationRequest.findById(id).populate('userId')

    if (!orgRequest) {
      return NextResponse.json(
        { error: 'Organization request not found' },
        { status: 404 }
      )
    }

    if (orgRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Request is already ${orgRequest.status}` },
        { status: 400 }
      )
    }

    if (orgRequest.requestType !== 'create_org') {
      return NextResponse.json(
        { error: 'This is not an organization creation request' },
        { status: 400 }
      )
    }

    if (action === 'approve') {
      // Ensure userId exists
      if (!orgRequest.userId) {
        // Try to find user by email
        const userByEmail = await User.findOne({ email: orgRequest.userEmail?.toLowerCase() })
        if (!userByEmail) {
          return NextResponse.json(
            { error: 'User not found for this request' },
            { status: 404 }
          )
        }
        orgRequest.userId = userByEmail
      }

      // Create the organization with ALL required fields
      const newOrg = await Organization.create({
        name: orgRequest.requestedOrgName,
        type: orgRequest.requestedOrgType,
        description: orgRequest.requestedOrgDescription || `${orgRequest.requestedOrgName} - Blood donation organization`,
        email: orgRequest.userId.email,
        phone: orgRequest.userId.phone || '+254700000000',
        address: orgRequest.requestedOrgDescription || 'Address to be updated',
        city: 'Nairobi',
        state: 'Nairobi County',
        country: 'Kenya',
        createdBy: orgRequest.userId._id,
        isActive: true,
        accountStatus: 'active',
      })

      // Update user: assign as org_admin
      await User.findByIdAndUpdate(orgRequest.userId._id, {
        organizationId: newOrg._id,
        organizationName: newOrg.name,
        role: 'org_admin',
        accountStatus: 'active',
      })

      // Update request
      orgRequest.status = 'approved'
      orgRequest.reviewedBy = user._id
      orgRequest.reviewedAt = new Date()
      orgRequest.adminNotes = adminNotes || ''
      orgRequest.assignedRole = 'org_admin'
      orgRequest.createdOrganizationId = newOrg._id
      await orgRequest.save()

      // Send approval email to user
      try {
        await sendRequestApprovedEmail({
          to: orgRequest.userId.email,
          fullName: orgRequest.userId.fullName,
          requestType: 'create_org',
          orgName: newOrg.name,
          assignedRole: 'org_admin',
        })
      } catch (emailErr) {
        console.warn('Failed to send approval email:', emailErr.message)
      }

      return NextResponse.json({
        success: true,
        message: `Organization "${newOrg.name}" created successfully. User assigned as org_admin. Approval email sent.`,
        data: {
          organizationId: newOrg._id.toString(),
          organizationName: newOrg.name,
          userId: orgRequest.userId._id.toString(),
          userName: orgRequest.userId.fullName,
        },
      })
    } else {
      // Reject
      if (!rejectionReason) {
        return NextResponse.json(
          { error: 'Rejection reason is required' },
          { status: 400 }
        )
      }

      orgRequest.status = 'rejected'
      orgRequest.reviewedBy = user._id
      orgRequest.reviewedAt = new Date()
      orgRequest.adminNotes = adminNotes || ''
      orgRequest.rejectionReason = rejectionReason
      await orgRequest.save()

      // Send rejection email to user
      try {
        await sendRequestRejectedEmail({
          to: orgRequest.userId.email,
          fullName: orgRequest.userId.fullName,
          requestType: 'create_org',
          orgName: orgRequest.requestedOrgName,
          rejectionReason,
        })
      } catch (emailErr) {
        console.warn('Failed to send rejection email:', emailErr.message)
      }

      return NextResponse.json({
        success: true,
        message: 'Organization creation request rejected. Rejection email sent.',
      })
    }
  } catch (error) {
    console.error('POST /api/admin/org-requests/[id]/action error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
