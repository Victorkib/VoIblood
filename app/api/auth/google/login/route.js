/**
 * GET /api/auth/google/login
 * Initiates Google OAuth login via Supabase
 * 
 * Note: This is a simple wrapper around Supabase OAuth.
 * The callback is handled automatically by Supabase → /auth/callback
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request) {
  try {
    const supabase = createServerClient()

    // Get Google OAuth URL from Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error || !data?.url) {
      console.error('Supabase Google OAuth error:', error)
      return NextResponse.redirect(
        new URL('/auth/login?error=Failed%20to%20initiate%20Google%20login', request.url)
      )
    }

    // Redirect to Google OAuth
    return NextResponse.redirect(data.url)
  } catch (error) {
    console.error('Google OAuth login error:', error)
    return NextResponse.redirect(
      new URL('/auth/login?error=Authentication%20error', request.url)
    )
  }
}
