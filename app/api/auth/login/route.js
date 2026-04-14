/**
 * POST /api/auth/login
 * Handle user login with email/password
 * 
 * Authentication Flow:
 * 1. Validate credentials with Supabase
 * 2. Find or create user in MongoDB
 * 3. Update last login timestamp
 * 4. Create session with full user context
 * 5. Set HTTP-only cookie
 * 6. Return user data and session info
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { createSessionCookie } from '@/lib/session'
import { checkAuthRateLimit } from '@/lib/auth-rate-limiter'

export async function POST(request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check rate limit (5 attempts per 10 minutes)
    const rateLimit = checkAuthRateLimit(email, 5, 10 * 60000)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed attempts. Please try again in ${rateLimit.retryAfter} seconds.`,
          code: 'rate_limited',
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
            'Retry-After': rateLimit.retryAfter.toString(),
          }
        }
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
      // Handle specific error types
      if (error.message.includes('Invalid login credentials')) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }
      if (error.message.includes('Email not confirmed')) {
        return NextResponse.json(
          { 
            error: 'Please verify your email address',
            code: 'email_not_confirmed'
          },
          { status: 401 }
        )
      }
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }

    const { user: supabaseUser, session } = data

    // Find or create user in MongoDB
    let mongoUser = await User.findOne({ supabaseId: supabaseUser.id })

    if (!mongoUser) {
      // User exists in Supabase but not MongoDB - create from Supabase data
      mongoUser = await User.findOrCreateFromSupabase(supabaseUser)
    }

    // Update last login timestamp
    await mongoUser.updateLastLogin()

    // Check if email is verified
    if (!mongoUser.emailVerified && !supabaseUser.email_confirmed_at) {
      return NextResponse.json(
        {
          error: 'Please verify your email address before signing in',
          code: 'email_not_verified',
          email: mongoUser.email,
          requiresEmailVerification: true,
        },
        { status: 403 }
      )
    }

    // Mark email as verified in MongoDB if Supabase confirms it
    if (supabaseUser.email_confirmed_at && !mongoUser.emailVerified) {
      mongoUser.emailVerified = true
      await mongoUser.save()
    }

    // Check if user is active
    if (!mongoUser.isActive) {
      return NextResponse.json(
        { error: 'Your account has been deactivated. Please contact support.' },
        { status: 403 }
      )
    }

    // Super admins are always active (no approval needed)
    if (mongoUser.role === 'super_admin' && mongoUser.accountStatus !== 'active') {
      mongoUser.accountStatus = 'active'
      await mongoUser.save()
    }

    // Create session cookie data
    const sessionData = createSessionCookie(mongoUser, session)

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: mongoUser._id.toString(),
        supabaseId: mongoUser.supabaseId,
        email: mongoUser.email,
        fullName: mongoUser.fullName,
        role: mongoUser.role,
        organizationId: mongoUser.organizationId?.toString(),
        organizationName: mongoUser.organizationName,
        accountStatus: mongoUser.accountStatus,
        avatarUrl: mongoUser.avatarUrl,
        initials: mongoUser.initials,
        hasOrganization: !!mongoUser.organizationId,
      },
      session: {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at,
      },
    })

    // Set HTTP-only auth cookie
    response.cookies.set({
      name: 'auth-session',
      value: JSON.stringify(sessionData),
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
