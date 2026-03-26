/**
 * GET /api/auth/session
 * Get current user session
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

    // Find user in MongoDB
    const user = await User.findOne({ supabaseId: session.user.supabaseId })

    if (!user || !user.isActive) {
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

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        supabaseId: user.supabaseId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        organizationName: user.organizationName,
        avatarUrl: user.avatarUrl,
        initials: user.initials,
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
