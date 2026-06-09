/**
 * GET /api/admin/organizations
 * List all organizations (super admin only)
 * 
 * POST /api/admin/organizations
 * Create new organization (super admin only)
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Organization from '@/lib/models/Organization'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin } from '@/lib/rbac'
import { createOrganizationAdminUser } from '@/lib/org-onboarding/create-org-admin'

/**
 * GET /api/admin/organizations
 * List all organizations with pagination and filters
 */
export async function GET(request) {
  try {
    await connectDB()

    // Verify super_admin access
    const user = await getCurrentUser(request.cookies)
    if (!user || !isSuperAdmin(user.role)) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')
    const type = searchParams.get('type')
    const status = searchParams.get('status')

    // Build query
    const query = {}
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ]
    }
    
    if (type) {
      query.type = type
    }
    
    if (status) {
      query.accountStatus = status
    }

    const skip = (page - 1) * limit

    const [organizations, total] = await Promise.all([
      Organization.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Organization.countDocuments(query),
    ])

    return NextResponse.json({
      success: true,
      data: organizations.map(org => ({
        id: org._id.toString(),
        name: org.name,
        type: org.type,
        email: org.email,
        phone: org.phone,
        city: org.city,
        state: org.state,
        country: org.country,
        isActive: org.isActive,
        accountStatus: org.accountStatus,
        isPremium: org.isPremium,
        subscriptionPlan: org.subscriptionPlan,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('Admin organizations GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/organizations
 * Create new organization
 */
export async function POST(request) {
  try {
    await connectDB()

    // Verify super_admin access
    const user = await getCurrentUser(request.cookies)
    if (!user || !isSuperAdmin(user.role)) {
      return NextResponse.json(
        { error: 'Super admin access required' },
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
      zipCode,
      country,
      registrationNumber,
      directorName,
      directorPhone,
      bloodBankCapacity,
      bedCapacity,
      subscriptionPlan,
      firstAdmin,
    } = body

    // Validation
    if (!name || !type || !email || !phone) {
      return NextResponse.json(
        { error: 'Name, type, email, and phone are required' },
        { status: 400 }
      )
    }

    if (!firstAdmin?.email || !firstAdmin?.fullName) {
      return NextResponse.json(
        { error: 'First organization admin email and full name are required' },
        { status: 400 }
      )
    }

    // Check if organization already exists
    const existingOrg = await Organization.findOne({
      $or: [
        { name: name.trim() },
        { email: email.toLowerCase().trim() },
      ],
    })

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Organization with this name or email already exists' },
        { status: 409 }
      )
    }

    const orgPayload = {
      name: name.trim(),
      type,
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      address: address?.trim() || '',
      city: city?.trim() || 'Nairobi',
      state: state?.trim() || '',
      zipCode: zipCode?.trim() || '',
      country: country?.trim() || 'Kenya',
      registrationNumber: registrationNumber?.trim() || '',
      directorName: directorName?.trim() || firstAdmin.fullName?.trim() || '',
      directorPhone: directorPhone?.trim() || firstAdmin.phone?.trim() || phone.trim(),
      bloodBankCapacity: bloodBankCapacity || 0,
      bedCapacity: bedCapacity || 0,
      isActive: true,
      accountStatus: 'active',
      isPremium: false,
      subscriptionPlan: subscriptionPlan || 'basic',
      createdBy: user._id,
    }

    if (type === 'hospital' && subscriptionPlan === 'enterprise') {
      orgPayload.rewardsProgram = { partnerActive: true, partnerSince: new Date() }
    }

    const organization = await Organization.create(orgPayload)

    let adminResult = null
    try {
      adminResult = await createOrganizationAdminUser({
        email: firstAdmin.email,
        fullName: firstAdmin.fullName,
        phone: firstAdmin.phone || phone,
        organizationId: organization._id,
        role: firstAdmin.role || 'org_admin',
        invitedByUserId: user._id,
        sendWelcomeEmail: firstAdmin.sendWelcomeEmail !== false,
      })
    } catch (adminErr) {
      await Organization.deleteOne({ _id: organization._id })
      return NextResponse.json(
        { error: `Organization not created: ${adminErr.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: adminResult?.created
        ? 'Organization and admin account created. Welcome email sent.'
        : 'Organization created. Admin account already linked.',
      data: {
        organization: {
          id: organization._id.toString(),
          name: organization.name,
          type: organization.type,
          email: organization.email,
          phone: organization.phone,
          city: organization.city,
          country: organization.country,
          isActive: organization.isActive,
          createdAt: organization.createdAt,
        },
        admin: {
          id: adminResult.user._id.toString(),
          email: adminResult.user.email,
          fullName: adminResult.user.fullName,
          role: adminResult.user.role,
        },
        credentials: adminResult.credentials,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Admin organization creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create organization: ' + error.message },
      { status: 500 }
    )
  }
}
