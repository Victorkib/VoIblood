/**
 * Super Admin Organization Requests API
 * 
 * GET /api/admin/org-requests - List all org creation requests
 * POST /api/admin/org-requests/[id]/approve - Approve org creation
 * POST /api/admin/org-requests/[id]/reject - Reject org creation
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin } from '@/lib/rbac'
import OrganizationRequest from '@/lib/models/OrganizationRequest'
import Organization from '@/lib/models/Organization'
import User from '@/lib/models/User'

/**
 * GET /api/admin/org-requests
 * List all organization creation requests for super admin review
 */
export async function GET(request) {
  try {
    await connectDB()

    const user = await getCurrentUser(request.cookies)
    if (!user || !isSuperAdmin(user.role)) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Only show 'pending' requests (not 'pending_email_verification')
    // Super admin should only see email-verified requests
    const query = { requestType: 'create_org', status: 'pending' }

    const skip = (page - 1) * limit

    const requests = await OrganizationRequest.find(query)
      .populate('userId', 'fullName email bio title')
      .populate('reviewedBy', 'fullName email')
      .populate('createdOrganizationId', 'name type')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await OrganizationRequest.countDocuments(query)

    return NextResponse.json({
      success: true,
      data: requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('GET /api/admin/org-requests error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization requests' },
      { status: 500 }
    )
  }
}
