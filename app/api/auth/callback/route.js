/**
 * GET /api/auth/callback
 * Handle email confirmation from Supabase (after user clicks email link)
 * Also handles OAuth callback
 * 
 * This is where we create the MongoDB user and OrganizationRequest AFTER email is verified
 * Signup intent is read from the signup-intent cookie (set during signup)
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import Organization from '@/lib/models/Organization'
import JoinRequest from '@/lib/models/JoinRequest'
import OrganizationRequest from '@/lib/models/OrganizationRequest'
import PendingSignup from '@/lib/models/PendingSignup'
import { sendRequestReceivedEmail } from '@/lib/org-request-emails'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        new URL('/auth/login?error=' + encodeURIComponent(error), request.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/auth/login?error=No authorization code received', request.url)
      )
    }

    // Connect to database
    await connectDB()

    // Create Supabase client
    const supabase = createServerClient()

    // Exchange code for session
    console.log('[Callback] Exchanging code for session...')
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('[Callback] Exchange code failed:', exchangeError.message)
      return NextResponse.redirect(
        new URL('/auth/login?error=' + encodeURIComponent(exchangeError.message), request.url)
      )
    }

    console.log('[Callback] Session exchanged successfully for user:', data?.user?.email)
    const { user, session } = data

    // CHECK IF EMAIL IS VERIFIED
    if (!user.email_confirmed_at) {
      return NextResponse.redirect(
        new URL('/auth/login?error=Email not verified', request.url)
      )
    }

    // Get FULL user metadata (exchangeCodeForSession might return minimal data)
    // We need this to access signup_intent from user_metadata
    let fullUser = user
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (!userError && userData?.user) {
        fullUser = userData.user
        console.log('[Callback] Retrieved full user metadata with signup_intent:', !!fullUser.user_metadata?.signup_intent)
      }
    } catch (e) {
      console.warn('[Callback] Failed to get full user metadata, using data from exchange:', e.message)
    }

    // Check if user already exists in MongoDB
    let mongoUser = await User.findOne({ supabaseId: user.id })

    // IF NEW USER - Create MongoDB user and handle signup intent
    if (!mongoUser) {
      console.log('[Callback] Creating new MongoDB user for:', user.email)

      // Try to get signup intent from PendingSignup collection (most reliable)
      let signupIntent = {}
      try {
        const pendingSignup = await PendingSignup.findOne({ email: user.email.toLowerCase() })
        if (pendingSignup) {
          signupIntent = {
            orgSelection: pendingSignup.orgSelection,
            selectedOrg: pendingSignup.selectedOrg,
            requestMessage: pendingSignup.requestMessage,
            requestedRole: pendingSignup.requestedRole,
            orgName: pendingSignup.orgName,
            orgType: pendingSignup.orgType,
            orgDescription: pendingSignup.orgDescription,
            orgMotivation: pendingSignup.orgMotivation,
            bio: pendingSignup.bio,
            title: pendingSignup.title,
            inviteToken: pendingSignup.inviteToken,
          }
          console.log('[Callback] Found signup intent in PendingSignup:', signupIntent.orgSelection, signupIntent.orgType)
          
          // Delete the pending signup record since we've processed it
          await PendingSignup.deleteOne({ email: user.email.toLowerCase() })
          console.log('[Callback] Deleted PendingSignup record for:', user.email)
        }
      } catch (e) {
        console.warn('[Callback] Failed to read PendingSignup:', e.message)
      }

      // Fallback to cookie if PendingSignup is empty
      if (!signupIntent.orgSelection) {
        try {
          const signupIntentCookie = request.cookies.get('signup-intent')
          if (signupIntentCookie?.value) {
            signupIntent = JSON.parse(signupIntentCookie.value)
            console.log('[Callback] Found signup intent in cookie:', signupIntent.orgSelection)
          }
        } catch (e) {
          console.warn('[Callback] Failed to parse signup intent cookie:', e.message)
        }
      }

      // Fallback to Supabase user_metadata if still empty
      if (!signupIntent.orgSelection && fullUser.user_metadata?.signup_intent) {
        signupIntent = fullUser.user_metadata.signup_intent
        console.log('[Callback] Found signup intent in Supabase metadata:', signupIntent.orgSelection, signupIntent.orgType)
      }

      // Default values
      const {
        orgSelection = 'create',
        selectedOrg,
        requestMessage,
        requestedRole,
        orgName,
        orgType,
        orgDescription,
        orgMotivation,
        bio,
        title,
      } = signupIntent

      // Initialize user variables
      let organizationId = null
      let organizationName = null
      let role = 'pending'
      let accountStatus = 'pending_approval'
      let invitedBy = null

      // Handle different signup flows
      if (signupIntent.inviteToken) {
        // Flow 1: Invitation token signup
        role = 'pending'
        accountStatus = 'pending_approval'
      } else if (orgSelection === 'join' && selectedOrg) {
        // Flow 2: Join existing organization (pending approval)
        const org = await Organization.findById(selectedOrg)
        if (!org || !org.isActive) {
          console.warn('[Callback] Organization not found for join request:', selectedOrg)
          // Still create user but without org
        } else {
          organizationId = org._id
          organizationName = org.name
        }
        role = 'pending'
        accountStatus = 'pending_approval'

      } else if (orgSelection === 'create') {
        // Flow 3: Request to create new organization (pending SUPER ADMIN approval)
        role = 'pending'
        accountStatus = 'pending_approval'
        organizationName = orgName || `${fullUser.user_metadata?.full_name || fullUser.email?.split('@')[0]}'s Organization`

        // Validate org type - if missing, we'll still create user but won't create request
        if (!orgType || !['blood_bank', 'hospital', 'transfusion_center', 'ngo'].includes(orgType)) {
          console.warn('[Callback] Invalid or missing org type:', orgType, '- creating user without org request')
        }
      }

      // Create user in MongoDB
      console.log('[Callback] Creating MongoDB user with status:', accountStatus)
      mongoUser = await User.create({
        supabaseId: user.id,
        email: user.email,
        fullName: fullUser.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: role,
        organizationId: organizationId,
        organizationName: organizationName,
        emailVerified: true, // Email is confirmed at this point
        accountStatus: accountStatus,
        invitedBy: invitedBy,
        bio: bio || '',
        title: title || '',
        providers: user.app_metadata?.providers?.map(p => ({
          provider: p,
          providerId: user.id,
        })) || [],
      })

      console.log('[Callback] MongoDB user created:', mongoUser._id)

      // If joining org, create join request
      if (orgSelection === 'join' && selectedOrg) {
        await JoinRequest.create({
          userId: mongoUser._id,
          organizationId: selectedOrg,
          requestedRole: requestedRole || 'viewer',
          message: requestMessage || '',
          status: 'pending',
        })
        console.log('[Callback] JoinRequest created for org:', selectedOrg)

        // Send request received email to user
        try {
          const org = await Organization.findById(selectedOrg)
          await sendRequestReceivedEmail({
            to: mongoUser.email,
            fullName: mongoUser.fullName,
            requestType: 'join',
            orgName: org?.name || 'the organization',
            requestedRole: requestedRole || 'viewer',
          })
        } catch (emailErr) {
          console.warn('[Callback] Failed to send request received email:', emailErr.message)
        }
      }

      // If creating org, create OrganizationRequest for super admin review
      if (orgSelection === 'create') {
        // Use default type if missing
        const finalOrgType = orgType || 'blood_bank'
        
        await OrganizationRequest.create({
          userId: mongoUser._id,
          organizationId: null, // Will be set when super admin approves
          requestedRole: 'org_admin',
          motivation: orgMotivation || `Request to create ${orgName}`,
          userBio: bio || '',
          userTitle: title || '',
          preferredDepartment: '',
          reason: `Request to create new organization: ${orgName}`,
          experience: '',
          availability: 'full-time',
          // Additional fields for org creation
          requestedOrgName: orgName || `${mongoUser.fullName}'s Organization`,
          requestedOrgType: finalOrgType,
          requestedOrgDescription: orgDescription || '',
          requestType: 'create_org',
          status: 'pending',
        })
        console.log('[Callback] OrganizationRequest created for:', orgName, 'type:', finalOrgType)

        // Send request received email to user
        try {
          await sendRequestReceivedEmail({
            to: mongoUser.email,
            fullName: mongoUser.fullName,
            requestType: 'create_org',
            orgName: orgName || `${mongoUser.fullName}'s Organization`,
            requestedRole: 'org_admin',
          })
        } catch (emailErr) {
          console.warn('[Callback] Failed to send request received email:', emailErr.message)
        }
      }

      // Clear the signup intent cookie since we've processed it
      const response = NextResponse.redirect(
        new URL(accountStatus === 'pending_approval' ? '/pending-approval' : '/dashboard', request.url)
      )

      response.cookies.set({
        name: 'signup-intent',
        value: '',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0, // Expire immediately
        path: '/',
      })

      // Set auth cookie
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

      return response
    } else {
      // EXISTING USER - Update email verified status and last login
      console.log('[Callback] Existing user logging in:', mongoUser.email)
      if (!mongoUser.emailVerified) {
        mongoUser.emailVerified = true
        await mongoUser.save()
      }
      mongoUser.lastLoginAt = new Date()
      await mongoUser.save()

      // Set auth cookie and redirect to pending approval or dashboard
      const redirectUrl = mongoUser.accountStatus === 'pending_approval'
        ? '/pending-approval'
        : '/dashboard'

      const response = NextResponse.redirect(
        new URL(redirectUrl, request.url)
      )

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

      return response
    }

  } catch (error) {
    console.error('[Callback] Email confirmation callback error:', error)
    console.error('[Callback] Error stack:', error.stack)
    return NextResponse.redirect(
      new URL('/auth/login?error=Authentication+failed', request.url)
    )
  }
}

export async function POST(request) {
  try {
    const { accessToken, refreshToken, user } = await request.json()

    if (!accessToken || !user) {
      return NextResponse.json(
        { error: 'Missing required authentication data' },
        { status: 400 }
      )
    }

    // Connect to database
    await connectDB()

    // Find or create user in MongoDB using the static method
    let mongoUser = await User.findOne({ supabaseId: user.id })

    if (!mongoUser) {
      // Check if user exists with same email (possible if they signed up with email first)
      const existingEmailUser = await User.findOne({ email: user.email })
      
      if (existingEmailUser) {
        // Link this OAuth account to existing user
        existingEmailUser.supabaseId = user.id
        existingEmailUser.avatarUrl = user.user_metadata?.avatar_url || existingEmailUser.avatarUrl
        existingEmailUser.emailVerified = user.email_confirmed_at ? true : existingEmailUser.emailVerified
        
        // Add OAuth provider to providers array if not already there
        const provider = user.app_metadata?.provider || 'oauth'
        if (!existingEmailUser.providers.some(p => p.provider === provider)) {
          existingEmailUser.providers.push({
            provider: provider,
            providerId: user.id,
          })
        }
        
        mongoUser = await existingEmailUser.save()
      } else {
        // Create new user from OAuth
        const hasOrganization = !!user.user_metadata?.organization_name

        mongoUser = await User.create({
          supabaseId: user.id,
          email: user.email,
          fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          role: user.user_metadata?.role || 'pending',
          organizationName: user.user_metadata?.organization_name,
          organizationId: null, // Will be set when added to org
          avatarUrl: user.user_metadata?.avatar_url,
          emailVerified: user.email_confirmed_at ? true : false,
          accountStatus: hasOrganization ? 'active' : 'pending_approval',
          providers: [{
            provider: user.app_metadata?.provider || 'oauth',
            providerId: user.id,
          }],
        })
      }
    } else {
      // Update existing user
      mongoUser.avatarUrl = user.user_metadata?.avatar_url || mongoUser.avatarUrl
      mongoUser.email = user.email
      mongoUser.lastLoginAt = new Date()
      await mongoUser.save()
    }

    // Set auth cookie
    const response = NextResponse.json({ success: true })

    response.cookies.set({
      name: 'auth-session',
      value: JSON.stringify({
        user: {
          id: mongoUser._id.toString(),
          supabaseId: mongoUser.supabaseId,
          email: mongoUser.email,
          fullName: mongoUser.fullName,
          role: mongoUser.role,
          organizationName: mongoUser.organizationName,
        },
        token: accessToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000).toISOString(), // 7 days
      }),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}
