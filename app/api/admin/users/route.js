/**
 * GET /api/admin/users
 * List all users with pagination and filters
 * Super admins: Can see all users across all organizations
 * Org admins: Can only see users from their own organization
 * 
 * POST /api/admin/users/[id]/role
 * Update user role (super admin only)
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin, isOrgAdmin } from '@/lib/rbac'

/**
 * GET /api/admin/users
 * List all users with pagination and filters
 */
export async function GET(request) {
  try {
    await connectDB()

    // Verify admin access (super_admin or org_admin)
    const user = await getCurrentUser(request.cookies)
    if (!user || (!isSuperAdmin(user.role) && !isOrgAdmin(user.role))) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')
    const role = searchParams.get('role')
    const status = searchParams.get('status')
    const organizationId = searchParams.get('organizationId')

    // Build query
    const query = {}
    
    // Organization filtering
    if (isSuperAdmin(user.role)) {
      // Super admins can see all users or filter by specific organization
      if (organizationId) {
        query.organizationId = organizationId
      }
    } else {
      // Org admins can only see users from their own organization
      query.organizationId = user.organizationId
    }
    
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
      ]
    }
    
    if (role) {
      query.role = role
    }
    
    if (status) {
      query.accountStatus = status
    }

    const skip = (page - 1) * limit

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('supabaseId email fullName role organizationId organizationName accountStatus emailVerified avatarUrl lastLoginAt createdAt')
        .lean(),
      User.countDocuments(query),
    ])

    return NextResponse.json({
      success: true,
      data: users.map(u => ({
        id: u._id.toString(),
        supabaseId: u.supabaseId,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        organizationId: u.organizationId?.toString(),
        organizationName: u.organizationName,
        accountStatus: u.accountStatus,
        emailVerified: u.emailVerified,
        avatarUrl: u.avatarUrl,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
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
    console.error('Admin users GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
