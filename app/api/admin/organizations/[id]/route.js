/**
 * GET /api/admin/organizations/[id]
 * Get organization details
 * 
 * PUT /api/admin/organizations/[id]
 * Update organization
 * 
 * DELETE /api/admin/organizations/[id]
 * Delete organization
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Organization from '@/lib/models/Organization'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin } from '@/lib/rbac'

/**
 * GET /api/admin/organizations/[id]
 */
export async function GET(request, { params }) {
  try {
    await connectDB()

    // --- FIX: Await the params before using them ---
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const user = await getCurrentUser(request.cookies)
    if (!user || !isSuperAdmin(user.role)) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }


    // Use the extracted 'id' instead of 'params.id'
    const organization = await Organization.findById(id)
    
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: organization._id.toString(),
        name: organization.name,
        type: organization.type,
        email: organization.email,
        phone: organization.phone,
        address: organization.address,
        city: organization.city,
        state: organization.state,
        zipCode: organization.zipCode,
        country: organization.country,
        isActive: organization.isActive,
        accountStatus: organization.accountStatus,
        isPremium: organization.isPremium,
        subscriptionPlan: organization.subscriptionPlan,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
      },
    })
  } catch (error) {
    console.error('Admin organization GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/organizations/[id]
 * Update organization
 */
export async function PUT(request, { params }) {
  try {
    await connectDB()

    const user = await getCurrentUser(request.cookies)
    if (!user || !isSuperAdmin(user.role)) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    const organization = await Organization.findById(params.id)
    
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Update fields
    if (body.name) organization.name = body.name
    if (body.type) organization.type = body.type
    if (body.email) organization.email = body.email
    if (body.phone) organization.phone = body.phone
    if (body.address) organization.address = body.address
    if (body.city) organization.city = body.city
    if (body.state) organization.state = body.state
    if (body.zipCode) organization.zipCode = body.zipCode
    if (body.country) organization.country = body.country
    if (typeof body.isActive === 'boolean') organization.isActive = body.isActive
    if (body.accountStatus) organization.accountStatus = body.accountStatus

    await organization.save()

    return NextResponse.json({
      success: true,
      message: 'Organization updated successfully',
      data: {
        id: organization._id.toString(),
        name: organization.name,
        type: organization.type,
        email: organization.email,
        isActive: organization.isActive,
      },
    })
  } catch (error) {
    console.error('Admin organization PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update organization: ' + error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/organizations/[id]
 * Delete organization
 */
export async function DELETE(request, { params }) {
  try {
    await connectDB()

    const user = await getCurrentUser(request.cookies)
    if (!user || !isSuperAdmin(user.role)) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    const organization = await Organization.findById(params.id)
    
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Check if organization has users
    const User = (await import('@/lib/models/User')).default
    const userCount = await User.countDocuments({ 
      organizationId: organization._id 
    })
    
    if (userCount > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete organization with ${userCount} user(s). Please reassign or remove users first.`,
          userCount 
        },
        { status: 400 }
      )
    }

    await organization.deleteOne()

    return NextResponse.json({
      success: true,
      message: 'Organization deleted successfully',
    })
  } catch (error) {
    console.error('Admin organization DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete organization: ' + error.message },
      { status: 500 }
    )
  }
}
