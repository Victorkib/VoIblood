/**
 * GET /api/admin/export/users
 * Export users data as CSV
 * 
 * GET /api/admin/export/organizations
 * Export organizations data as CSV
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import Organization from '@/lib/models/Organization'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin } from '@/lib/rbac'

/**
 * GET /api/admin/export/users
 * Export users as CSV
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
    const type = searchParams.get('type') || 'users'

    if (type === 'users') {
      // Fetch all users
      const users = await User.find()
        .select('email fullName role organizationId organizationName accountStatus emailVerified lastLoginAt createdAt')
        .sort({ createdAt: -1 })
        .lean()

      // Convert to CSV
      const csvData = convertUsersToCSV(users)

      // Create response with CSV file
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="users-export.csv"',
        },
      })
    } else if (type === 'organizations') {
      // Fetch all organizations
      const organizations = await Organization.find()
        .select('name type email phone city state country isActive accountStatus subscriptionPlan createdAt')
        .sort({ createdAt: -1 })
        .lean()

      // Convert to CSV
      const csvData = convertOrganizationsToCSV(organizations)

      // Create response with CSV file
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="organizations-export.csv"',
        },
      })
    }

    return NextResponse.json(
      { error: 'Invalid export type' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}

// Helper function to convert users to CSV
function convertUsersToCSV(users) {
  const headers = ['Email', 'Full Name', 'Role', 'Organization', 'Status', 'Email Verified', 'Last Login', 'Created At']
  
  const rows = users.map(u => [
    u.email,
    u.fullName,
    u.role,
    u.organizationName || 'No Organization',
    u.accountStatus,
    u.emailVerified ? 'Yes' : 'No',
    u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : 'Never',
    new Date(u.createdAt).toISOString(),
  ])

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')
}

// Helper function to convert organizations to CSV
function convertOrganizationsToCSV(organizations) {
  const headers = ['Name', 'Type', 'Email', 'Phone', 'City', 'State', 'Country', 'Active', 'Status', 'Plan', 'Created At']
  
  const rows = organizations.map(o => [
    o.name,
    o.type,
    o.email,
    o.phone,
    o.city,
    o.state,
    o.country,
    o.isActive ? 'Yes' : 'No',
    o.accountStatus,
    o.subscriptionPlan,
    new Date(o.createdAt).toISOString(),
  ])

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')
}
