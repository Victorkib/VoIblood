/**
 * GET /api/auth/session
 * Get current user session
 *
 * IMPORTANT: This endpoint auto-creates MongoDB users from Supabase sessions.
 * This is needed for OAuth logins and users who haven't completed email verification yet.
 * User creation in callback handles org creation requests and pending approval flow.
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import OrganizationRequest from '@/lib/models/OrganizationRequest'
import { sendRequestReceivedEmail } from '@/lib/org-request-emails'

export async function GET(request) {
  try {
    // Get the session cookie
    const sessionCookie = request.cookies.get('auth-session')

    if (!sessionCookie?.value) {
      return NextResponse.json({ user: null })
    }

    const session = JSON.parse(sessionCookie.value)

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      const response = NextResponse.json({ user: null })
      response.cookies.set({
        name: 'auth-session',
        value: '',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      })
      return response
    }

    // Connect to database
    await connectDB()

    // Find user in MongoDB by supabaseId from session
    let user = await User.findOne({
      supabaseId: session.user.supabaseId,
      isActive: true
    })

    // If user doesn't exist in MongoDB, they logged in via OAuth or haven't completed callback
    // We need to create their MongoDB record from Supabase data
    if (!user) {
      console.log('[Session] User not in MongoDB, fetching from Supabase to create record...')

      // CRITICAL: Pass the access token to Supabase client!
      const supabase = createServerClient(session.token)
      const { data: { user: supabaseUser }, error: supabaseError } = await supabase.auth.getUser()

      if (supabaseError || !supabaseUser) {
        console.log('[Session] Supabase user not found:', supabaseError?.message)
        const response = NextResponse.json({ user: null })
        response.cookies.set({
          name: 'auth-session',
          value: '',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 0,
          path: '/',
        })
        return response
      }

      console.log('[Session] Creating MongoDB user from Supabase:', supabaseUser.email)

      // Check if user exists with same email but different/null supabaseId
      // (e.g., user created by setup-super-admin script)
      let existingUser = await User.findOne({ email: supabaseUser.email.toLowerCase(), isActive: true })

      if (existingUser) {
        // Update existing user with OAuth supabaseId
        console.log('[Session] Found existing user by email, linking OAuth account:', supabaseUser.email)
        existingUser.supabaseId = supabaseUser.id
        existingUser.emailVerified = supabaseUser.email_confirmed_at ? true : existingUser.emailVerified
        existingUser.fullName = supabaseUser.user_metadata?.full_name || existingUser.fullName
        existingUser.avatarUrl = supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || existingUser.avatarUrl
        existingUser.lastLoginAt = new Date(supabaseUser.last_sign_in_at)

        // Update providers array
        const provider = supabaseUser.identities?.[0]?.provider || 'google'
        if (!existingUser.providers.some(p => p.provider === provider)) {
          existingUser.providers.push({ provider, providerId: supabaseUser.id })
        }

        user = await existingUser.save()
        console.log('[Session] Existing user updated with OAuth account:', user.email, '- role:', user.role)
      } else {
        // No existing user, check if user has organization info in metadata
        const hasOrganization = !!supabaseUser.user_metadata?.organization_name

        // Create new user from Supabase data
        user = await User.create({
          supabaseId: supabaseUser.id,
          email: supabaseUser.email,
          fullName: supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0],
          role: 'pending',
          accountStatus: hasOrganization ? 'active' : 'pending_approval',
          emailVerified: supabaseUser.email_confirmed_at ? true : false,
          avatarUrl: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture,
          organizationName: supabaseUser.user_metadata?.organization_name || null,
          organizationId: null,
          providers: supabaseUser.identities?.map(identity => ({
            provider: identity.provider,
            providerId: identity.id,
          })) || [{ provider: 'email', providerId: supabaseUser.id }],
          lastLoginAt: new Date(supabaseUser.last_sign_in_at),
        })

        console.log('[Session] New MongoDB user created:', user.email, '- status:', user.accountStatus)
      }

      // Update OrganizationRequest: change status from 'pending_email_verification' to 'pending'
      try {
        const orgRequest = await OrganizationRequest.findOne({
          userEmail: supabaseUser.email.toLowerCase(),
          status: 'pending_email_verification',
        })

        if (orgRequest) {
          orgRequest.status = 'pending'
          orgRequest.userId = user._id
          await orgRequest.save()
          console.log('[Session] OrganizationRequest activated for:', orgRequest.requestedOrgName)

          // Send request received email
          try {
            await sendRequestReceivedEmail({
              to: user.email,
              fullName: user.fullName,
              requestType: 'create_org',
              orgName: orgRequest.requestedOrgName,
              requestedRole: 'org_admin',
            })
            console.log('[Session] Request received email sent to:', user.email)
          } catch (emailErr) {
            console.warn('[Session] Failed to send email:', emailErr.message)
          }
        }
      } catch (orgErr) {
        console.warn('[Session] Failed to update OrganizationRequest:', orgErr.message)
      }
    }

    // Return user data AND SET AUTH COOKIE
    const response = NextResponse.json({
      user: {
        id: user._id.toString(),
        supabaseId: user.supabaseId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        organizationId: user.organizationId?.toString(),
        organizationName: user.organizationName,
        accountStatus: user.accountStatus,
        avatarUrl: user.avatarUrl,
        initials: user.initials,
        hasOrganization: !!user.organizationId,
      },
    })

    // Set auth cookie
    response.cookies.set({
      name: 'auth-session',
      value: JSON.stringify({
        user: {
          id: user._id.toString(),
          supabaseId: user.supabaseId,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          organizationId: user.organizationId?.toString(),
          organizationName: user.organizationName,
          accountStatus: user.accountStatus,
        },
        token: session.token,
        expiresAt: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000).toISOString(),
      }),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
