/**
 * POST /api/auth/signup
 * Handle user registration with multi-tenant support
 *
 * Signup flows:
 * 1. With invite token - Auto-assign to org with specified role
 * 2. Join existing org - Create pending request, org admin approval required
 * 3. Create new org - Auto-create org, user becomes org_admin
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import Invitation from '@/lib/models/Invitation'
import Organization from '@/lib/models/Organization'
import JoinRequest from '@/lib/models/JoinRequest'

export async function POST(request) {
  try {
    const {
      email,
      password,
      fullName,
      inviteToken,
      bio,
      title,
      orgSelection = 'create', // 'create' | 'join' | 'invite'
      selectedOrg,
      requestMessage,
      requestedRole,
    } = await request.json()

    // Validation
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Connect to database
    await connectDB()

    // Check if user already exists in MongoDB
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Create Supabase client
    const supabase = createServerClient()

    // Sign up with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    const { user: supabaseUser, session } = data

    // Initialize user variables
    let organizationId = null
    let organizationName = null
    let role = 'pending'
    let accountStatus = 'pending_approval'
    let invitedBy = null

    // Handle different signup flows
    if (inviteToken) {
      // Flow 1: Invitation token signup
      try {
        const invitation = await Invitation.findByToken(inviteToken)

        // Validate invitation
        if (!invitation.isActive) {
          return NextResponse.json(
            {
              error: invitation.status === 'expired' ? 'Invitation has expired' :
                     invitation.status === 'accepted' ? 'Invitation already accepted' :
                     'Invitation is no longer valid',
              status: invitation.status,
            },
            { status: 400 }
          )
        }

        // Check if email matches
        if (email.toLowerCase() !== invitation.email.toLowerCase()) {
          return NextResponse.json(
            { error: 'This invitation is not for your email address' },
            { status: 403 }
          )
        }

        // Accept invitation
        await invitation.accept({
          _id: null, // Will be set after user creation
          assignToOrganization: async function(orgId, userRole) {
            organizationId = orgId
            organizationName = invitation.organizationId.name
            role = userRole
            accountStatus = 'active'
            invitedBy = invitation.invitedBy
          }
        })

      } catch (inviteError) {
        console.error('Invitation processing error:', inviteError)
        return NextResponse.json(
          { error: 'Invalid or expired invitation token' },
          { status: 400 }
        )
      }
    } else if (orgSelection === 'join' && selectedOrg) {
      // Flow 2: Join existing organization (pending approval)
      const org = await Organization.findById(selectedOrg)
      if (!org || !org.isActive) {
        return NextResponse.json(
          { error: 'Organization not found or inactive' },
          { status: 404 }
        )
      }

      organizationId = org._id
      organizationName = org.name
      role = 'pending'
      accountStatus = 'pending_approval'

      // Create join request (will be created after user is created)
      
    } else if (orgSelection === 'create') {
      // Flow 3: Create new organization
      organizationName = `${fullName}'s Organization`
      role = 'org_admin'
      accountStatus = 'active'
    }

    // Create user in MongoDB
    const mongoUser = await User.create({
      supabaseId: supabaseUser.id,
      email: user.email,
      fullName: fullName,
      role: role,
      organizationId: organizationId,
      organizationName: organizationName,
      emailVerified: false,
      accountStatus: accountStatus,
      invitedBy: invitedBy,
      bio: bio || '',
      title: title || '',
      providers: supabaseUser.app_metadata?.providers?.map(p => ({
        provider: p,
        providerId: supabaseUser.id,
      })) || [],
    })

    // If joining org, create join request
    if (orgSelection === 'join' && selectedOrg) {
      await JoinRequest.create({
        userId: mongoUser._id,
        organizationId: selectedOrg,
        requestedRole: requestedRole || 'viewer',
        message: requestMessage || '',
        status: 'pending',
      })
    }

    // If creating org, create the organization
    if (orgSelection === 'create') {
      const newOrg = await Organization.create({
        name: organizationName,
        createdBy: mongoUser._id,
        isActive: true,
      })
      
      // Update user with organization
      mongoUser.organizationId = newOrg._id
      mongoUser.organizationName = newOrg.name
      await mongoUser.save()
    }

    // If session exists (email confirmation not required), set cookie
    let response
    if (session) {
      response = NextResponse.json({
        user: {
          id: mongoUser._id.toString(),
          supabaseId: mongoUser.supabaseId,
          email: mongoUser.email,
          fullName: mongoUser.fullName,
          role: mongoUser.role,
          organizationId: mongoUser.organizationId?.toString(),
          organizationName: mongoUser.organizationName,
          accountStatus: mongoUser.accountStatus,
        },
        session: {
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at,
        },
        requiresEmailConfirmation: false,
        hasOrganization: !!mongoUser.organizationId,
        pendingApproval: mongoUser.accountStatus === 'pending_approval',
      })

      response.cookies.set({
        name: 'auth-session',
        value: JSON.stringify({
          user: {
            id: mongoUser._id.toString(),
            supabaseId: mongoUser.supabaseId,
            email: mongoUser.email,
            fullName: mongoUser.fullName,
            role: mongoUser.role,
            organizationId: mongoUser.organizationId?.toString(),
            organizationName: mongoUser.organizationName,
            accountStatus: mongoUser.accountStatus,
          },
          token: session.access_token,
          expiresAt: new Date(session.expires_at * 1000).toISOString(),
        }),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })
    } else {
      response = NextResponse.json({
        message: 'Check your email to confirm your account',
        requiresEmailConfirmation: true,
      })
    }

    return response
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
