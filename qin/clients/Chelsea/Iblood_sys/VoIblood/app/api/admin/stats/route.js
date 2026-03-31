/**
 * GET /api/admin/stats
 * Get platform-wide statistics for super admin dashboard
 * 
 * Access: SUPER_ADMIN only
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import Organization from '@/lib/models/Organization'
import Donor from '@/lib/models/Donor'
import BloodInventory from '@/lib/models/BloodInventory'
import Request from '@/lib/models/Request'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin } from '@/lib/rbac'

export async function GET(request) {
  try {
    await connectDB()

    // Get current user and verify super_admin access
    const user = await getCurrentUser(request.cookies)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!isSuperAdmin(user.role)) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    // Get platform-wide statistics
    const [
      totalUsers,
      totalOrganizations,
      totalDonors,
      totalBloodUnits,
      totalRequests,
      
      // Users by role
      usersByRole,
      
      // Users by status
      activeUsers,
      pendingUsers,
      suspendedUsers,
      
      // Organizations by type
      orgsByType,
      
      // Recent activity
      recentUsers,
      recentOrganizations,
    ] = await Promise.all([
      // Total counts
      User.countDocuments(),
      Organization.countDocuments(),
      Donor.countDocuments(),
      BloodInventory.countDocuments(),
      Request.countDocuments(),
      
      // Users by role
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      
      // Users by status
      User.countDocuments({ accountStatus: 'active' }),
      User.countDocuments({ 
        $or: [
          { accountStatus: 'pending_approval' },
          { role: 'pending' },
          { organizationId: null }
        ] 
      }),
      User.countDocuments({ accountStatus: 'suspended' }),
      
      // Organizations by type
      Organization.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      
      // Recent users (last 10)
      User.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('email fullName role organizationName createdAt')
        .lean(),
      
      // Recent organizations (last 5)
      Organization.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name type email city createdAt')
        .lean(),
    ])

    // Format users by role
    const roleStats = {}
    usersByRole.forEach(item => {
      roleStats[item._id] = item.count
    })

    // Format organizations by type
    const typeStats = {}
    orgsByType.forEach(item => {
      typeStats[item._id] = item.count
    })

    // Calculate blood stock by type
    const bloodStockByType = await BloodInventory.aggregate([
      { $match: { status: 'available' } },
      { $group: { _id: '$bloodType', totalUnits: { $sum: '$volume' } } }
    ])

    const bloodStock = {}
    bloodStockByType.forEach(item => {
      bloodStock[item._id] = item.totalUnits
    })

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalOrganizations,
          totalDonors,
          totalBloodUnits,
          totalRequests,
        },
        users: {
          byRole: roleStats,
          active: activeUsers,
          pending: pendingUsers,
          suspended: suspendedUsers,
        },
        organizations: {
          byType: typeStats,
        },
        bloodStock: {
          byType: bloodStock,
        },
        recentActivity: {
          users: recentUsers.map(u => ({
            id: u._id.toString(),
            email: u.email,
            fullName: u.fullName,
            role: u.role,
            organizationName: u.organizationName,
            createdAt: u.createdAt,
          })),
          organizations: recentOrganizations.map(o => ({
            id: o._id.toString(),
            name: o.name,
            type: o.type,
            email: o.email,
            city: o.city,
            createdAt: o.createdAt,
          })),
        },
      },
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch platform statistics' },
      { status: 500 }
    )
  }
}
