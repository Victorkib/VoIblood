/**
 * GET /api/auth/user
 * Get current authenticated user profile
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'

export async function GET(request) {
  try {
    // Get the session cookie
    const sessionCookie = request.cookies.get('auth-session')

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const session = JSON.parse(sessionCookie.value)

    // Connect to database
    await connectDB()

    // Find user in MongoDB
    const user = await User.findOne({ supabaseId: session.user.supabaseId })
      .select('-__v')

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        supabaseId: user.supabaseId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        organizationName: user.organizationName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        initials: user.initials,
        emailVerified: user.emailVerified,
        preferences: user.preferences,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
