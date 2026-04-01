/**
 * GET /api/requests - List all requests with filtering
 * POST /api/requests - Create a new blood request
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Request from '@/lib/models/Request'
import Organization from '@/lib/models/Organization'
import { v4 as uuidv4 } from 'crypto'
import { getRateLimitInfo, createRateLimitError } from '@/lib/rate-limiter'
import { sendBloodRequestNotification } from '@/lib/email-service'
import { logAuditEvent, AUDIT_ACTIONS, AUDIT_SEVERITY, getAuditContextFromRequest } from '@/lib/audit-logger'

/**
 * GET /api/requests
 * Query Parameters:
 * - organizationId (required)
 * - status
 * - urgency
 * - search
 * - page
 * - limit
 */
export async function GET(request) {
  const rateLimitInfo = getRateLimitInfo(request, 'create')
  if (!rateLimitInfo.allowed) {
    return NextResponse.json(createRateLimitError(rateLimitInfo), { status: 429 })
  }

  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const status = searchParams.get('status')
    const urgency = searchParams.get('urgency')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      )
    }

    // Build query
    const query = { sourceOrganizationId: organizationId }

    if (status) query.status = status
    if (urgency) query.urgency = urgency

    if (search) {
      const searchRegex = new RegExp(search, 'i')
      query.$or = [
        { requestId: searchRegex },
        { patientName: searchRegex },
        { requestingOrganizationName: searchRegex },
      ]
    }

    const skip = (page - 1) * limit

    const requests = await Request.find(query)
      .populate('approvedBy', 'fullName email')
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await Request.countDocuments(query)

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
    console.error('GET /api/requests error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch requests', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/requests
 * Create a new blood request
 */
export async function POST(request) {
  try {
    await connectDB()

    const body = await request.json()
    const {
      sourceOrganizationId,
      requestingOrganizationId,
      requestingOrganizationName,
      contactPerson,
      contactPhone,
      patientName,
      diagnosis,
      bloodRequirements,
      requiredDate,
    } = body

    // Validate required fields
    if (
      !sourceOrganizationId ||
      !requestingOrganizationId ||
      !requestingOrganizationName ||
      !contactPerson ||
      !contactPhone ||
      !patientName ||
      !diagnosis ||
      !bloodRequirements ||
      !Array.isArray(bloodRequirements) ||
      bloodRequirements.length === 0 ||
      !requiredDate
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if organizations exist
    const sourceOrg = await Organization.findById(sourceOrganizationId)
    const requestingOrg = await Organization.findById(requestingOrganizationId)

    if (!sourceOrg || !requestingOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Generate unique request ID
    const requestId = `REQ-${Date.now()}-${uuidv4().split('-')[0].toUpperCase()}`

    // Create request
    const newRequest = await Request.create({
      ...body,
      requestId,
      sourceOrganizationId,
      requestingOrganizationId,
    })

    // Send notification email (non-blocking)
    try {
      await sendBloodRequestNotification(newRequest, sourceOrganizationId)
    } catch (emailErr) {
      console.warn('Failed to send blood request notification email:', emailErr.message)
      // Don't fail the request if email fails
    }

    // Log audit event (non-blocking)
    try {
      const auditContext = getAuditContextFromRequest(request)
      await logAuditEvent({
        action: AUDIT_ACTIONS.REQUEST_CREATE,
        userId: body.userId || 'system',
        organizationId: sourceOrganizationId,
        resourceType: 'request',
        resourceId: newRequest._id.toString(),
        severity: AUDIT_SEVERITY.HIGH, // Blood requests are critical
        changes: {
          created: {
            requestId: newRequest.requestId,
            patientName: newRequest.patientName,
            urgency: newRequest.urgency,
            bloodRequirements: newRequest.bloodRequirements,
          },
        },
        description: `Blood request created: ${newRequest.patientName} - ${newRequest.urgency} (${newRequest.bloodRequirements.length} types)`,
        ...auditContext,
      })
    } catch (auditErr) {
      console.warn('Failed to log audit event:', auditErr.message)
      // Don't fail the request if audit logging fails
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Request created successfully',
        data: newRequest,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/requests error:', error)
    return NextResponse.json(
      { error: 'Failed to create request', details: error.message },
      { status: 500 }
    )
  }
}
