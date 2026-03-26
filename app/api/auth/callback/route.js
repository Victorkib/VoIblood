/**
 * GET /api/auth/callback
 * Handle OAuth callback from Supabase
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'

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
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      return NextResponse.redirect(
        new URL('/auth/login?error=' + encodeURIComponent(exchangeError.message), request.url)
      )
    }

    const { user, session } = data

    // Find or create user in MongoDB
    let mongoUser = await User.findOne({ supabaseId: user.id })

    if (!mongoUser) {
      // Create new user from OAuth
      mongoUser = await User.create({
        supabaseId: user.id,
        email: user.email,
        fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: user.user_metadata?.role || 'staff',
        organizationName: user.user_metadata?.organization_name,
        avatarUrl: user.user_metadata?.avatar_url,
        emailVerified: user.email_confirmed_at ? true : false,
        providers: [{
          provider: user.app_metadata?.provider || 'oauth',
          providerId: user.id,
        }],
      })
    } else {
      // Update existing user
      mongoUser.avatarUrl = user.user_metadata?.avatar_url
      mongoUser.email = user.email
      await mongoUser.save()
    }

    // Set auth cookie
    const response = NextResponse.redirect(
      new URL('/dashboard', request.url)
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

    return response
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/auth/login?error=Authentication failed', request.url)
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
        mongoUser = await User.create({
          supabaseId: user.id,
          email: user.email,
          fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          role: user.user_metadata?.role || 'staff',
          organizationName: user.user_metadata?.organization_name,
          avatarUrl: user.user_metadata?.avatar_url,
          emailVerified: user.email_confirmed_at ? true : false,
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
