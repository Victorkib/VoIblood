/**
 * Organizations API Routes
 * Handles CRUD operations for organizations
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Organization from '@/lib/models/Organization'
import User from '@/lib/models/User'
import { getRateLimitInfo, createRateLimitError } from '@/lib/rate-limiter'
import { logAuditEvent, AUDIT_ACTIONS, AUDIT_SEVERITY, getAuditContextFromRequest } from '@/lib/audit-logger'

/**
 * GET /api/organizations
 * List organizations for the authenticated user
 */
export async function GET(request) {
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search')

    // Build query
    let query = {}
    
    // If user is admin, show all organizations they have access to
    if (user.role === 'admin') {
      query = {}
    } else {
      // For other roles, show only their organization
      query = { _id: user.organizationId }
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' }
    }

    const skip = (page - 1) * limit

    const [organizations, total] = await Promise.all([
      Organization.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Organization.countDocuments(query)
    ])

    // Log audit event
    await logAuditEvent({
      action: AUDIT_ACTIONS.REQUESTS_VIEW,
      userId: user._id.toString(),
      organizationId: user.organizationId,
      resourceType: 'organization',
      severity: AUDIT_SEVERITY.INFO,
      metadata: { page, limit, search }
    })

    return NextResponse.json({
      data: organizations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error('Organizations GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/organizations
 * Create a new organization
 */
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
    const user = await User.findOne({ supabaseId: session.user.supabaseId })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check permissions (only admins can create organizations)
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      name,
      type,
      email,
      phone,
      address,
      city,
      state,
      country,
      registrationNumber,
      description
    } = body

    // Validation
    if (!name || !type || !email || !phone) {
      return NextResponse.json(
        { error: 'Name, type, email, and phone are required' },
        { status: 400 }
      )
    }

    // Check if organization already exists
    const existingOrg = await Organization.findOne({ 
      $or: [
        { name: name.trim() },
        { email: email.toLowerCase().trim() }
      ]
    })

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Organization with this name or email already exists' },
        { status: 409 }
      )
    }

    // Create organization
    const organization = await Organization.create({
      name: name.trim(),
      type,
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      address: address?.trim() || '',
      city: city?.trim() || '',
      state: state?.trim() || '',
      country: country?.trim() || '',
      registrationNumber: registrationNumber?.trim() || '',
      description: description?.trim() || '',
      createdBy: user._id,
      isActive: true
    })

    // Update user's organizationId if they don't have one
    if (!user.organizationId) {
      await User.findByIdAndUpdate(user._id, { 
        organizationId: organization._id,
        organizationName: organization.name 
      })
    }

    // Log audit event
    await logAuditEvent({
      action: AUDIT_ACTIONS.REQUEST_CREATE,
      userId: user._id.toString(),
      organizationId: organization._id.toString(),
      resourceType: 'organization',
      resourceId: organization._id.toString(),
      severity: AUDIT_SEVERITY.HIGH,
      metadata: { organizationName: organization.name, type }
    })

    return NextResponse.json({
      data: organization,
      message: 'Organization created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Organization creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    )
  }
}
