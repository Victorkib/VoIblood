/**
 * POST /api/auth/forgot-password
 * Send password reset email to user
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    })

    if (error) {
      // Don't reveal if email exists or not for security
      console.error('Password reset error:', error)
      return NextResponse.json(
        { message: 'If an account with this email exists, a reset link has been sent.' },
        { status: 200 }
      )
    }

    // Always return success to prevent email enumeration attacks
    return NextResponse.json(
      { 
        message: 'If an account with this email exists, a reset link has been sent.',
        email: email
      },
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
