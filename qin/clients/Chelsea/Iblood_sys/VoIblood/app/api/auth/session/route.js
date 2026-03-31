/**
 * GET /api/auth/session
 * Get current user session
 * 
 * CRITICAL: This endpoint checks MongoDB AND creates user if missing.
 * When users login via OAuth, they exist in Supabase but not MongoDB.
 * We need to sync them automatically.
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'

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

    // If user doesn't exist in MongoDB, they logged in via OAuth
    // We need to create their MongoDB record from Supabase data
    if (!user) {
      console.log('User not in MongoDB, fetching from Supabase to create record...')
      
      // CRITICAL: Pass the access token to Supabase client!
      const supabase = createServerClient(session.token)
      const { data: { user: supabaseUser }, error: supabaseError } = await supabase.auth.getUser()
      
      if (supabaseError || !supabaseUser) {
        console.log('Supabase user not found:', supabaseError?.message)
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
      
      console.log('Creating MongoDB user from Supabase:', supabaseUser.email)
      
      // Create MongoDB user from Supabase data
      user = await User.create({
        supabaseId: supabaseUser.id,
        email: supabaseUser.email,
        fullName: supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0],
        role: 'pending', // Default role until assigned to org
        accountStatus: 'active',
        emailVerified: supabaseUser.email_confirmed_at ? true : false,
        avatarUrl: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture,
        providers: supabaseUser.identities?.map(identity => ({
          provider: identity.provider,
          providerId: identity.id,
        })) || [{ provider: 'email', providerId: supabaseUser.id }],
        lastLoginAt: new Date(supabaseUser.last_sign_in_at),
      })
      
      console.log('MongoDB user created successfully:', user.email)
    }

    // Return user data
    return NextResponse.json({
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
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
