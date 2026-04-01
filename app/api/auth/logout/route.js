/**
 * POST /api/auth/logout
 * Handle user logout
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request) {
  try {
    // Get the access token from cookie
    const sessionCookie = request.cookies.get('auth-session')
    
    // Create Supabase client
    const supabase = createServerClient()

    // Sign out from Supabase if we have a token
    if (sessionCookie?.value) {
      try {
        const session = JSON.parse(sessionCookie.value)
        if (session.token) {
          await supabase.auth.signOut({ scope: 'local' })
        }
      } catch (e) {
        // Ignore errors during signout
      }
    }

    // Clear the auth cookie
    const response = NextResponse.json({ success: true })
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
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
