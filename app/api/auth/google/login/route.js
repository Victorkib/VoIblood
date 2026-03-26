/**
 * GET /api/auth/google/login
 * Initiates Google OAuth login flow
 */

import { NextResponse } from 'next/server'
import { getGoogleAuthUrl, isGoogleOAuthConfigured } from '@/lib/google-oauth'

export async function GET(request) {
  try {
    // Check if Google OAuth is configured
    if (!isGoogleOAuthConfigured()) {
      return NextResponse.json(
        { error: 'Google OAuth is not configured' },
        { status: 503 }
      )
    }

    // Generate CSRF state token
    const state = Buffer.from(
      Math.random().toString() + Date.now().toString()
    ).toString('base64')

    // Get Google authorization URL
    const authUrl = getGoogleAuthUrl(state)

    // Create response with redirect
    const response = NextResponse.redirect(authUrl)

    // Store state in secure cookie for CSRF verification
    response.cookies.set({
      name: 'oauth_state',
      value: state,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60, // 10 minutes
    })

    return response
  } catch (error) {
    console.error('Google OAuth login initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate login' },
      { status: 500 }
    )
  }
}
