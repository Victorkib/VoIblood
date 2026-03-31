/**
 * POST /api/auth/set-cookie
 * Set the auth-session cookie from client-side Supabase session
 * 
 * This is needed because:
 * 1. Supabase stores session in Local Storage (browser)
 * 2. Our API endpoints read from cookies (server)
 * 3. We need to bridge the two
 */

import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { cookieValue } = await request.json()

    if (!cookieValue) {
      return NextResponse.json(
        { error: 'Cookie value required' },
        { status: 400 }
      )
    }

    // Create response
    const response = NextResponse.json({ success: true })

    // Set HTTP-only auth cookie
    response.cookies.set({
      name: 'auth-session',
      value: cookieValue,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Set cookie error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
