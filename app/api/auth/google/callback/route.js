/**
 * GET /api/auth/google/callback
 * Handles Google OAuth callback
 */

import { NextResponse } from 'next/server'
import { handleGoogleCallback } from '@/lib/google-oauth'
import { connectDB } from '@/lib/db'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Check for errors from Google
    if (error) {
      console.error('Google OAuth error:', error, errorDescription)
      const errorMessage = encodeURIComponent(
        errorDescription || 'Authentication failed. Please try again.'
      )
      return NextResponse.redirect(
        new URL(`/auth/error?message=${errorMessage}`, request.url)
      )
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/auth/error?message=Missing%20authorization%20code', request.url)
      )
    }

    // Handle callback
    const result = await handleGoogleCallback(code, state)

    if (!result.success) {
      const errorMessage = encodeURIComponent(result.error || 'Authentication failed')
      return NextResponse.redirect(
        new URL(`/auth/error?message=${errorMessage}`, request.url)
      )
    }

    // Connect to database to find or create user
    try {
      await connectDB()
    } catch (dbErr) {
      console.warn('Database connection failed during OAuth:', dbErr)
    }

    // Create response that will set authentication cookies
    const response = NextResponse.redirect(new URL('/dashboard', request.url))

    // Store user info and tokens in secure httpOnly cookies
    response.cookies.set({
      name: 'google_user',
      value: JSON.stringify(result.user),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    response.cookies.set({
      name: 'google_access_token',
      value: result.tokens.accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour
    })

    if (result.tokens.idToken) {
      response.cookies.set({
        name: 'google_id_token',
        value: result.tokens.idToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      })
    }

    return response
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/auth/error?message=Authentication%20error', request.url)
    )
  }
}
