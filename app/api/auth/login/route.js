/**
 * POST /api/auth/login
 * Handle user login with email/password
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'

export async function POST(request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Connect to database
    await connectDB()

    // Create Supabase client
    const supabase = createServerClient()

    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }

    const { user, session } = data

    // Find or create user in MongoDB
    const mongoUser = await User.findOrCreateFromSupabase(user)
    await mongoUser.updateLastLogin()

    // Create response with session
    const response = NextResponse.json({
      user: {
        id: mongoUser._id.toString(),
        supabaseId: mongoUser.supabaseId,
        email: mongoUser.email,
        fullName: mongoUser.fullName,
        role: mongoUser.role,
        organizationName: mongoUser.organizationName,
        avatarUrl: mongoUser.avatarUrl,
        initials: mongoUser.initials,
      },
      session: {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at,
      },
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
          organizationName: mongoUser.organizationName,
        },
        token: session.access_token,
        expiresAt: new Date(session.expires_at * 1000).toISOString(),
      }),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
