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
import { createServerClient } from '@/lib/supabase'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import Organization from '@/lib/models/Organization'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin, isOrgAdmin } from '@/lib/rbac'

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
      temporaryPassword,
      sendCredentials,
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

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Create Supabase client
    const supabase = createServerClient()

    // Generate temporary password if not provided
    const password = temporaryPassword || generateSecurePassword()

    // Create user in Supabase Auth
    const { data: supabaseData, error: supabaseError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        role: role,
        organization_id: targetOrganizationId,
      },
      app_metadata: {
        role: role,
        organization_id: targetOrganizationId,
      },
    })

    if (supabaseError) {
      return NextResponse.json(
        { error: `Failed to create user in Supabase: ${supabaseError.message}` },
        { status: 500 }
      )
    }

    // Create user in MongoDB
    const mongoUser = await User.create({
      supabaseId: supabaseData.user.id,
      email: email.toLowerCase(),
      fullName: fullName,
      role: role,
      organizationId: targetOrganizationId,
      organizationName: organization.name,
      accountStatus: 'active',
      emailVerified: true,
      invitedBy: currentUser._id,
      providers: [{ provider: 'email', providerId: supabaseData.user.id }],
    })

    // Return user data with temporary password
    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: mongoUser._id.toString(),
          email: mongoUser.email,
          fullName: mongoUser.fullName,
          role: mongoUser.role,
          organizationId: mongoUser.organizationId?.toString(),
          organizationName: mongoUser.organizationName,
        },
        credentials: {
          email: email.toLowerCase(),
          temporaryPassword: password,
          mustChangePassword: true,
        },
      },
      warning: 'Share these credentials securely with the user. They should change password on first login.',
    }, { status: 201 })
  } catch (error) {
    console.error('User creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create user: ' + error.message },
      { status: 500 }
    )
  }
}

// Helper function to generate secure temporary password
function generateSecurePassword() {
  const length = 12
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}
