/**
 * PUT /api/auth/user
 * Update user profile
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { createServerClient } from '@/lib/supabase'

export async function PUT(request) {
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
    const updates = await request.json()

    // Connect to database
    await connectDB()

    // Find user
    const user = await User.findOne({ supabaseId: session.user.supabaseId })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Allowed fields to update
    const allowedFields = ['fullName', 'phone', 'organizationName', 'preferences']
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        user[field] = updates[field]
      }
    })

    await user.save()

    // Update Supabase metadata if needed
    if (updates.fullName) {
      const supabase = createServerClient(session.token)
      await supabase.auth.updateUser({
        data: { full_name: updates.fullName },
      })
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
        preferences: user.preferences,
      },
    })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
