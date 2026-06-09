/**
 * GET  /api/auth/setup-account?token=...
 * POST /api/auth/setup-account { token, password }
 *
 * Single-email onboarding: validate token and set password (no Supabase reset email).
 */

import { NextResponse } from 'next/server'
import {
  validateAccountSetupToken,
  completeAccountSetup,
} from '@/lib/org-onboarding/account-setup'
import { connectDB } from '@/lib/db'
import { createServerClient } from '@/lib/supabase'
import User from '@/lib/models/User'
import { createSessionCookie, setSessionCookie } from '@/lib/session'
import { getPostLoginRedirect } from '@/lib/auth/post-login-redirect'

export async function GET(request) {
  try {
    await connectDB()
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Setup token is required' }, { status: 400 })
    }

    const data = await validateAccountSetupToken(token)
    if (!data.valid) {
      return NextResponse.json({ error: data.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: {
        email: data.email,
        fullName: data.fullName,
        organizationName: data.organizationName,
        expiresAt: data.expiresAt,
      },
    })
  } catch (error) {
    console.error('[setup-account GET]', error)
    return NextResponse.json({ error: 'Failed to validate setup link' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await connectDB()
    const { token, password } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Setup token is required' }, { status: 400 })
    }

    const result = await completeAccountSetup({ token, password })

    const mongoUser = await User.findById(result.userId)
    if (!mongoUser) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 })
    }

    const supabase = createServerClient()
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: result.email,
      password,
    })

    if (signInError) {
      return NextResponse.json({
        success: true,
        passwordSaved: true,
        message:
          'Your password was saved, but automatic sign-in failed. Please sign in manually with your new password.',
        data: { email: result.email, redirectTo: '/auth/login' },
      })
    }

    if (signInData.user?.email_confirmed_at && !mongoUser.emailVerified) {
      mongoUser.emailVerified = true
    }
    if (mongoUser.accountStatus !== 'active' && mongoUser.role !== 'pending') {
      mongoUser.accountStatus = 'active'
    }
    await mongoUser.updateLastLogin()
    await mongoUser.save()

    const userPayload = {
      id: mongoUser._id.toString(),
      supabaseId: mongoUser.supabaseId,
      email: mongoUser.email,
      fullName: mongoUser.fullName,
      role: mongoUser.role,
      organizationId: mongoUser.organizationId?.toString(),
      organizationName: mongoUser.organizationName,
      accountStatus: mongoUser.accountStatus,
      avatarUrl: mongoUser.avatarUrl,
      initials: mongoUser.initials,
      hasOrganization: !!mongoUser.organizationId,
    }

    const redirectTo = getPostLoginRedirect(userPayload)

    const response = NextResponse.json({
      success: true,
      message: 'Account activated. Taking you to your dashboard…',
      data: {
        email: result.email,
        user: userPayload,
        redirectTo,
        organizationName: mongoUser.organizationName,
      },
    })

    setSessionCookie(response, createSessionCookie(mongoUser, signInData.session))
    return response
  } catch (error) {
    console.error('[setup-account POST]', error)
    return NextResponse.json(
      { error: error.message || 'Failed to complete account setup' },
      { status: 400 }
    )
  }
}
