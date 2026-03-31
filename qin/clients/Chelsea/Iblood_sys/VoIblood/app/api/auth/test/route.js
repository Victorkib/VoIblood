/**
 * Authentication Test API
 * Helper endpoint to test and verify authentication setup
 * 
 * Usage:
 * GET /api/auth/test - Check current auth status
 * POST /api/auth/test/setup - Run auth setup verification
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { createServerClient } from '@/lib/supabase'
import User from '@/lib/models/User'
import Organization from '@/lib/models/Organization'

/**
 * GET /api/auth/test
 * Check current authentication status and configuration
 */
export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const verbose = searchParams.get('verbose') === 'true'

    // Check Supabase configuration
    const supabaseConfigured = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL && 
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Check Supabase connection
    let supabaseStatus = 'unknown'
    let supabaseError = null
    try {
      const supabase = createServerClient()
      const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
      
      if (error) {
        supabaseStatus = 'error'
        supabaseError = error.message
      } else {
        supabaseStatus = 'connected'
      }
    } catch (error) {
      supabaseStatus = 'error'
      supabaseError = error.message
    }

    // Check MongoDB connection
    let mongoStatus = 'unknown'
    let mongoError = null
    try {
      const userCount = await User.countDocuments()
      mongoStatus = 'connected'
    } catch (error) {
      mongoStatus = 'error'
      mongoError = error.message
    }

    // Check super admin
    const superAdmin = await User.findOne({ role: 'super_admin', isActive: true })
    
    // Get stats
    const stats = {
      totalUsers: await User.countDocuments(),
      totalOrganizations: await Organization.countDocuments(),
      activeUsers: await User.countDocuments({ accountStatus: 'active' }),
      pendingUsers: await User.countDocuments({ accountStatus: 'pending_approval' }),
      usersWithOrg: await User.countDocuments({ organizationId: { $exists: true }, organizationId: { $ne: null } }),
      usersWithoutOrg: await User.countDocuments({ 
        $or: [
          { organizationId: null },
          { organizationId: { $exists: false } }
        ]
      }),
    }

    // Role distribution
    const roleDistribution = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ])

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      configuration: {
        supabase: {
          configured: supabaseConfigured,
          status: supabaseStatus,
          error: supabaseError,
          url: supabaseConfigured ? (process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30) + '...') : 'not set',
        },
        mongodb: {
          status: mongoStatus,
          error: mongoError,
        },
      },
      superAdmin: {
        exists: !!superAdmin,
        email: superAdmin?.email || null,
        fullName: superAdmin?.fullName || null,
        organizationName: superAdmin?.organizationName || null,
      },
      stats: {
        users: stats,
        roles: roleDistribution.reduce((acc, item) => {
          acc[item._id] = item.count
          return acc
        }, {}),
      },
    }

    if (verbose) {
      response.debug = {
        env: {
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'missing',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'missing',
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing',
          NODE_ENV: process.env.NODE_ENV || 'development',
        },
        recentUsers: await User.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select('email role accountStatus organizationName createdAt'),
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Auth test error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Auth test failed',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/auth/test/setup
 * Run authentication setup verification and fix common issues
 */
export async function POST(request) {
  try {
    await connectDB()

    const results = {
      checks: [],
      fixes: [],
      warnings: [],
    }

    // Check 1: Supabase configuration
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      results.checks.push({ name: 'Supabase Configuration', status: 'failed', message: 'Supabase credentials not set' })
      results.warnings.push('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
    } else {
      results.checks.push({ name: 'Supabase Configuration', status: 'passed', message: 'Supabase credentials configured' })
    }

    // Check 2: Supabase connection
    try {
      const supabase = createServerClient()
      const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
      
      if (error) {
        results.checks.push({ name: 'Supabase Connection', status: 'failed', message: error.message })
      } else {
        results.checks.push({ name: 'Supabase Connection', status: 'passed', message: 'Connected to Supabase' })
      }
    } catch (error) {
      results.checks.push({ name: 'Supabase Connection', status: 'failed', message: error.message })
    }

    // Check 3: MongoDB connection
    try {
      const userCount = await User.countDocuments()
      results.checks.push({ name: 'MongoDB Connection', status: 'passed', message: `Connected, ${userCount} users` })
    } catch (error) {
      results.checks.push({ name: 'MongoDB Connection', status: 'failed', message: error.message })
    }

    // Check 4: Super admin exists
    const superAdmin = await User.findOne({ role: 'super_admin', isActive: true })
    if (superAdmin) {
      results.checks.push({ name: 'Super Admin', status: 'passed', message: `Super admin exists: ${superAdmin.email}` })
    } else {
      results.checks.push({ name: 'Super Admin', status: 'warning', message: 'No super admin found' })
      results.warnings.push('Run POST /api/setup/admin to create super admin')
    }

    // Check 5: Users without organization
    const usersWithoutOrg = await User.countDocuments({ 
      $or: [
        { organizationId: null },
        { organizationId: { $exists: false } }
      ]
    })
    
    if (usersWithoutOrg > 0) {
      results.checks.push({ name: 'Users Without Organization', status: 'warning', message: `${usersWithoutOrg} users not assigned to any organization` })
      results.warnings.push(`${usersWithoutOrg} users need organization assignment`)
    } else {
      results.checks.push({ name: 'Users Organization Assignment', status: 'passed', message: 'All users assigned to organizations' })
    }

    // Check 6: Pending users
    const pendingUsers = await User.countDocuments({ accountStatus: 'pending_approval' })
    if (pendingUsers > 0) {
      results.checks.push({ name: 'Pending Users', status: 'info', message: `${pendingUsers} users awaiting approval` })
    }

    // Check 7: Role distribution
    const roleDistribution = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ])
    
    const roles = roleDistribution.reduce((acc, item) => {
      acc[item._id] = item.count
      return acc
    }, {})

    results.checks.push({ 
      name: 'Role Distribution', 
      status: 'info', 
      message: JSON.stringify(roles)
    })

    // Auto-fix: Check for Supabase users without MongoDB records
    try {
      const supabase = createServerClient()
      const { data: supabaseUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 })
      
      const mongoUsers = await User.find({}).select('supabaseId email').lean()
      const mongoSupabaseIds = new Set(mongoUsers.map(u => u.supabaseId))
      
      let syncedCount = 0
      for (const supaUser of supabaseUsers.users) {
        if (!mongoSupabaseIds.has(supaUser.id)) {
          // Create MongoDB record for missing user
          await User.findOrCreateFromSupabase(supaUser)
          syncedCount++
        }
      }
      
      if (syncedCount > 0) {
        results.fixes.push(`Synced ${syncedCount} users from Supabase to MongoDB`)
      }
    } catch (error) {
      results.warnings.push(`Could not sync users: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Authentication setup verification complete',
      results,
    })
  } catch (error) {
    console.error('Auth setup test error:', error)
    return NextResponse.json(
      { error: 'Setup verification failed: ' + error.message },
      { status: 500 }
    )
  }
}
