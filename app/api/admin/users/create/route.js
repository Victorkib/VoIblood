/**
 * POST /api/admin/users/create
 * Create a new user with credentials (super_admin or org_admin)
 * 
 * This creates:
 * 1. User in Supabase Auth (with temporary password)
 * 2. User in MongoDB (with role and organization)
 * 
 * Super admins: Can create users for any organization
 * Org admins: Can only create users for their own organization
 * 
 * Returns temporary password for admin to share with user
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Organization from '@/lib/models/Organization'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin, isOrgAdmin } from '@/lib/rbac'
import { createOrganizationAdminUser } from '@/lib/org-onboarding/create-org-admin'

export async function POST(request) {
  try {
    await connectDB()

    // Verify admin access (super_admin or org_admin)
    const currentUser = await getCurrentUser(request.cookies)
    if (!currentUser || (!isSuperAdmin(currentUser.role) && !isOrgAdmin(currentUser.role))) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      email,
      fullName,
      role,
      organizationId,
      sendWelcomeEmail = true,
    } = body

    // Validation
    if (!email || !fullName || !role) {
      return NextResponse.json(
        { error: 'Email, full name, and role are required' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['org_admin', 'manager', 'staff', 'viewer']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be org_admin, manager, staff, or viewer' },
        { status: 400 }
      )
    }

    // Organization validation
    let targetOrganizationId = organizationId
    if (!targetOrganizationId) {
      // Use current user's organization if not specified
      targetOrganizationId = currentUser.organizationId
    } else {
      // Org admins can only create users for their own organization
      if (!isSuperAdmin(currentUser.role) && currentUser.organizationId !== targetOrganizationId) {
        return NextResponse.json(
          { error: 'You can only create users for your own organization' },
          { status: 403 }
        )
      }
    }

    // Verify organization exists
    const organization = await Organization.findById(targetOrganizationId)
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const result = await createOrganizationAdminUser({
      email,
      fullName,
      organizationId: targetOrganizationId,
      role,
      invitedByUserId: currentUser._id,
      sendWelcomeEmail: sendWelcomeEmail !== false,
    })

    const mongoUser = result.user

    return NextResponse.json({
      success: true,
      message: result.created
        ? 'User created. Welcome email sent with sign-in instructions.'
        : 'User already exists for this organization.',
      data: {
        user: {
          id: mongoUser._id.toString(),
          email: mongoUser.email,
          fullName: mongoUser.fullName,
          role: mongoUser.role,
          organizationId: mongoUser.organizationId?.toString(),
          organizationName: mongoUser.organizationName,
        },
        credentials: result.credentials,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('User creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create user: ' + error.message },
      { status: 500 }
    )
  }
}
