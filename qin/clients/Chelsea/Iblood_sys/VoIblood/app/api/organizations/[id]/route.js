/**
 * Individual Organization API Routes
 * Handles GET, PUT, DELETE for specific organizations
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Organization from '@/lib/models/Organization'
import User from '@/lib/models/User'
import { getRateLimitInfo, createRateLimitError } from '@/lib/rate-limiter'
import { logAuditEvent, AUDIT_ACTIONS, AUDIT_SEVERITY, getAuditContextFromRequest } from '@/lib/audit-logger'

/**
 * GET /api/organizations/[id]
 * Get a specific organization
 */
export async function GET(request, { params }) {
  const rateLimitInfo = getRateLimitInfo(request, 'read')
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
    const user = await User.findOne({ supabaseId: session.user.supabaseId })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const { id } = params

    // Get organization
    const organization = await Organization.findById(id)

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (user.role !== 'admin' && organization._id.toString() !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Log audit event
    await logAuditEvent({
      action: AUDIT_ACTIONS.REQUESTS_VIEW,
      userId: user._id.toString(),
      organizationId: organization._id.toString(),
      resourceType: 'organization',
      resourceId: organization._id.toString(),
      severity: AUDIT_SEVERITY.INFO
    })

    return NextResponse.json({
      data: organization
    })

  } catch (error) {
    console.error('Organization GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/organizations/[id]
 * Update a specific organization
 */
export async function PUT(request, { params }) {
  const rateLimitInfo = getRateLimitInfo(request, 'update')
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
    const user = await User.findOne({ supabaseId: session.user.supabaseId })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const { id } = params
    const body = await request.json()

    // Get existing organization
    const organization = await Organization.findById(id)

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (user.role !== 'admin' && organization._id.toString() !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Update organization
    const updatedOrganization = await Organization.findByIdAndUpdate(
      id,
      {
        ...body,
        updatedAt: new Date()
      },
      { new: true }
    )

    // Log audit event
    await logAuditEvent({
      action: AUDIT_ACTIONS.REQUEST_UPDATE,
      userId: user._id.toString(),
      organizationId: organization._id.toString(),
      resourceType: 'organization',
      resourceId: organization._id.toString(),
      severity: AUDIT_SEVERITY.MEDIUM,
      metadata: { updatedFields: Object.keys(body) }
    })

    return NextResponse.json({
      data: updatedOrganization,
      message: 'Organization updated successfully'
    })

  } catch (error) {
    console.error('Organization PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/organizations/[id]
 * Delete a specific organization
 */
export async function DELETE(request, { params }) {
  const rateLimitInfo = getRateLimitInfo(request, 'delete')
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
    const user = await User.findOne({ supabaseId: session.user.supabaseId })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const { id } = params

    // Get existing organization
    const organization = await Organization.findById(id)

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Check permissions (only admins can delete)
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Check if organization has active inventory or requests
    const [inventoryCount, activeRequestsCount] = await Promise.all([
      import('@/lib/models/BloodInventory').then(({ default: BloodInventory }) => 
        BloodInventory.countDocuments({ organizationId: id, status: 'available' })
      ),
      import('@/lib/models/Request').then(({ default: Request }) => 
        Request.countDocuments({ 
          $or: [
            { sourceOrganizationId: id, status: { $in: ['pending', 'approved', 'partially_fulfilled'] } },
            { requestingOrganizationId: id, status: { $in: ['pending', 'approved', 'partially_fulfilled'] } }
          ]
        })
      )
    ])

    if (inventoryCount > 0 || activeRequestsCount > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete organization with active inventory or requests',
          details: {
            inventoryUnits: inventoryCount,
            activeRequests: activeRequestsCount
          }
        },
        { status: 400 }
      )
    }

    // Delete organization
    await Organization.findByIdAndDelete(id)

    // Update users who had this organization
    await User.updateMany(
      { organizationId: id },
      { $unset: { organizationId: 1, organizationName: 1 } }
    )

    // Log audit event
    await logAuditEvent({
      action: AUDIT_ACTIONS.REQUEST_DELETE,
      userId: user._id.toString(),
      organizationId: organization._id.toString(),
      resourceType: 'organization',
      resourceId: organization._id.toString(),
      severity: AUDIT_SEVERITY.CRITICAL,
      metadata: { organizationName: organization.name }
    })

    return NextResponse.json({
      message: 'Organization deleted successfully'
    })

  } catch (error) {
    console.error('Organization DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete organization' },
      { status: 500 }
    )
  }
}
