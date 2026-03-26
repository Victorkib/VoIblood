/**
 * POST /api/auth/signup
 * Handle user registration
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'

export async function POST(request) {
  try {
    const { 
      email, 
      password, 
      fullName, 
      organizationName, 
      role = 'staff' 
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
          organization_name: organizationName,
          role: role,
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

    const { user, session } = data

    // Create user in MongoDB
    const mongoUser = await User.create({
      supabaseId: user.id,
      email: user.email,
      fullName: fullName,
      role: role,
      organizationName: organizationName,
      emailVerified: false,
    })

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
          organizationName: mongoUser.organizationName,
          avatarUrl: mongoUser.avatarUrl,
          initials: mongoUser.initials,
        },
        session: {
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at,
        },
        requiresEmailConfirmation: false,
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
            organizationName: mongoUser.organizationName,
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
