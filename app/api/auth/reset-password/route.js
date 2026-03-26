/**
 * POST /api/auth/reset-password
 * Reset user password using tokens from email link
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'

export async function POST(request) {
  try {
    const { password, accessToken, refreshToken } = await request.json()

    if (!password || !accessToken || !refreshToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Create Supabase client with the user's tokens
    const supabase = createServerClient(accessToken)

    // Update the user's password
    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    })

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update password. The reset link may have expired.' },
        { status: 400 }
      )
    }

    // Get the current user to update MongoDB record
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken)

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 400 }
      )
    }

    // Connect to database and update user record
    await connectDB()
    
    const mongoUser = await User.findOne({ supabaseId: user.id })
    
    if (mongoUser) {
      // Update last login time for password reset
      mongoUser.lastLoginAt = new Date()
      await mongoUser.save()
    }

    return NextResponse.json(
      { message: 'Password reset successful' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
