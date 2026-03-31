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
      zipCode: zipCode?.trim() || '',
      country: country?.trim() || 'United States',
      registrationNumber: registrationNumber?.trim() || '',
      directorName: directorName?.trim() || '',
      directorPhone: directorPhone?.trim() || '',
      bloodBankCapacity: bloodBankCapacity || 0,
      bedCapacity: bedCapacity || 0,
      isActive: true,
      accountStatus: 'active',
      isPremium: false,
      subscriptionPlan: 'basic',
      createdBy: user._id,
    })

    return NextResponse.json({
      success: true,
      message: 'Organization created successfully',
      data: {
        id: organization._id.toString(),
        name: organization.name,
        type: organization.type,
        email: organization.email,
        phone: organization.phone,
        city: organization.city,
        isActive: organization.isActive,
        createdAt: organization.createdAt,
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
