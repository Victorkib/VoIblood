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

      // Check if user exists with same email but different/null supabaseId
      // (e.g., user created by setup-super-admin script)
      let existingUser = await User.findOne({ email: user.email.toLowerCase(), isActive: true })

      if (existingUser) {
        // Update existing user with OAuth supabaseId
        console.log('[Callback] Found existing user by email, linking OAuth account:', user.email)
        existingUser.supabaseId = user.id
        existingUser.emailVerified = true
        existingUser.fullName = fullUser.user_metadata?.full_name || existingUser.fullName
        existingUser.avatarUrl = fullUser.user_metadata?.avatar_url || fullUser.user_metadata?.picture || existingUser.avatarUrl

        // Update providers array
        const provider = user.app_metadata?.provider || 'email'
        if (!existingUser.providers.some(p => p.provider === provider)) {
          existingUser.providers.push({ provider, providerId: user.id })
        }

        mongoUser = await existingUser.save()
        console.log('[Callback] Existing user updated with OAuth account:', mongoUser.email, '- role:', mongoUser.role)
      } else {
        // Initialize user variables
        let organizationId = null
        let organizationName = null
        let role = 'pending'
        let accountStatus = 'pending_approval'
        let invitedBy = null

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
          bio: '',
          title: '',
          providers: user.app_metadata?.providers?.map(p => ({
            provider: p,
            providerId: user.id,
          })) || [],
        })

        console.log('[Callback] MongoDB user created:', mongoUser._id)
      }

      // Update OrganizationRequest: change status from 'pending_email_verification' to 'pending'
      // and link the userId
      try {
        const orgRequest = await OrganizationRequest.findOne({
          userEmail: user.email.toLowerCase(),
          status: 'pending_email_verification',
        })

        if (orgRequest) {
          orgRequest.status = 'pending'
          orgRequest.userId = mongoUser._id
          await orgRequest.save()
          console.log('[Callback] OrganizationRequest activated for:', orgRequest.requestedOrgName)

          // Send request received email to user
          try {
            await sendRequestReceivedEmail({
              to: mongoUser.email,
              fullName: mongoUser.fullName,
              requestType: 'create_org',
              orgName: orgRequest.requestedOrgName,
              requestedRole: 'org_admin',
            })
            console.log('[Callback] Request received email sent to:', mongoUser.email)
          } catch (emailErr) {
            console.warn('[Callback] Failed to send email:', emailErr.message)
          }
        } else {
          console.log('[Callback] No pending OrganizationRequest found for:', user.email)
        }
      } catch (orgErr) {
        console.warn('[Callback] Failed to update OrganizationRequest:', orgErr.message)
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
