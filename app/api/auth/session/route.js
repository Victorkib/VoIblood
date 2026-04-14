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
import Organization from '@/lib/models/Organization'
import OrganizationRequest from '@/lib/models/OrganizationRequest'
import PendingSignup from '@/lib/models/PendingSignup'
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

      // Check if user has signup intent in PendingSignup
      let signupIntent = null
      try {
        signupIntent = await PendingSignup.findOne({ email: supabaseUser.email.toLowerCase() })
        if (signupIntent) {
          console.log('[Session] Found PendingSignup for:', supabaseUser.email, '- type:', signupIntent.orgType)
        }
      } catch (e) {
        console.warn('[Session] Failed to read PendingSignup:', e.message)
      }

      // Check if user has organization info in metadata
      const hasOrganization = !!supabaseUser.user_metadata?.organization_name

      // Create MongoDB user from Supabase data
      // Use pending_approval status if no org, active if they have org
      user = await User.create({
        supabaseId: supabaseUser.id,
        email: supabaseUser.email,
        fullName: supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0],
        role: signupIntent?.orgSelection === 'create' ? 'pending' : (supabaseUser.user_metadata?.role || 'pending'),
        accountStatus: hasOrganization ? 'active' : 'pending_approval',
        emailVerified: supabaseUser.email_confirmed_at ? true : false,
        avatarUrl: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture,
        organizationName: signupIntent?.orgName || supabaseUser.user_metadata?.organization_name || null,
        organizationId: null, // Will be set when added to org or org created
        providers: supabaseUser.identities?.map(identity => ({
          provider: identity.provider,
          providerId: identity.id,
        })) || [{ provider: 'email', providerId: supabaseUser.id }],
        lastLoginAt: new Date(supabaseUser.last_sign_in_at),
      })

      console.log('[Session] MongoDB user created:', user.email, '- status:', user.accountStatus)

      // If PendingSignup exists and user is creating org, create OrganizationRequest
      if (signupIntent && signupIntent.orgSelection === 'create') {
        try {
          const finalOrgType = signupIntent.orgType || 'blood_bank'
          
          await OrganizationRequest.create({
            userId: user._id,
            organizationId: null,
            requestedRole: 'org_admin',
            motivation: signupIntent.orgMotivation || `Request to create ${signupIntent.orgName}`,
            userBio: signupIntent.bio || '',
            userTitle: signupIntent.title || '',
            preferredDepartment: '',
            reason: `Request to create new organization: ${signupIntent.orgName}`,
            experience: '',
            availability: 'full-time',
            requestedOrgName: signupIntent.orgName || `${user.fullName}'s Organization`,
            requestedOrgType: finalOrgType,
            requestedOrgDescription: signupIntent.orgDescription || '',
            requestType: 'create_org',
            status: 'pending',
          })

          console.log('[Session] OrganizationRequest created for:', signupIntent.orgName)

          // Send request received email
          try {
            await sendRequestReceivedEmail({
              to: user.email,
              fullName: user.fullName,
              requestType: 'create_org',
              orgName: signupIntent.orgName || `${user.fullName}'s Organization`,
              requestedRole: 'org_admin',
            })
            console.log('[Session] Request received email sent to:', user.email)
          } catch (emailErr) {
            console.warn('[Session] Failed to send email:', emailErr.message)
          }

          // Delete PendingSignup
          await PendingSignup.deleteOne({ email: supabaseUser.email.toLowerCase() })
          console.log('[Session] Deleted PendingSignup for:', supabaseUser.email)
        } catch (orgErr) {
          console.error('[Session] Failed to create OrganizationRequest:', orgErr.message)
        }
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
