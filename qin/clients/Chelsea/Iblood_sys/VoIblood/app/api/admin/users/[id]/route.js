/**
 * PUT /api/admin/users/[id]
 * Update user role and/or organization (super admin only)
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import Organization from '@/lib/models/Organization'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin } from '@/lib/rbac'

export async function PUT(request) {
  try {
    await connectDB()

    // Verify super_admin access
    const currentUser = await getCurrentUser(request.cookies)
    if (!currentUser || !isSuperAdmin(currentUser.role)) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    // Get user ID from URL path
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const userId = pathSegments[pathSegments.length - 1]

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { role, organizationId, accountStatus } = body

    // Find user to update
    const user = await User.findById(userId)
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Validate role if provided
    if (role) {
      const validRoles = ['super_admin', 'org_admin', 'manager', 'staff', 'viewer', 'pending']
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role' },
          { status: 400 }
        )
      }
      
      // Prevent removing last super_admin
      if (user.role === 'super_admin' && role !== 'super_admin') {
        const superAdminCount = await User.countDocuments({ 
          role: 'super_admin', 
          isActive: true 
        })
        
        if (superAdminCount <= 1) {
          return NextResponse.json(
            { error: 'Cannot remove the last super admin' },
            { status: 400 }
          )
        }
      }
      
      user.role = role
    }

    // Validate and assign organization if provided
    if (organizationId) {
      const organization = await Organization.findById(organizationId)
      
      if (!organization) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        )
      }
      
      user.organizationId = organization._id
      user.organizationName = organization.name
    }

    // Update account status if provided
    if (accountStatus) {
      const validStatuses = ['active', 'inactive', 'suspended', 'pending_approval']
      if (!validStatuses.includes(accountStatus)) {
        return NextResponse.json(
          { error: 'Invalid account status' },
          { status: 400 }
        )
      }
      
      user.accountStatus = accountStatus
    }

    await user.save()

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        organizationId: user.organizationId?.toString(),
        organizationName: user.organizationName,
        accountStatus: user.accountStatus,
      },
    })
  } catch (error) {
    console.error('Admin user update error:', error)
    return NextResponse.json(
      { error: 'Failed to update user: ' + error.message },
      { status: 500 }
    )
  }
}
