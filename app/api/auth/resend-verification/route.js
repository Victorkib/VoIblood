/**
 * POST /api/auth/resend-verification
 * Resend email verification email
 * 
 * For users who didn't receive or lost their verification email
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { checkAuthRateLimit } from '@/lib/auth-rate-limiter'
import { sendEmail } from '@/lib/email-service'

export async function POST(request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check rate limit (3 requests per hour)
    const rateLimit = checkAuthRateLimit(email, 3, 60 * 60000)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many requests. Please wait ${rateLimit.retryAfter} seconds.`,
          retryAfter: rateLimit.retryAfter,
        },
        { status: 429 }
      )
    }

    await connectDB()

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.',
      })
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email is already verified. Please sign in.' },
        { status: 400 }
      )
    }

    // Resend verification email via Supabase
    const supabase = createServerClient()

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.toLowerCase(),
    })

    if (error) {
      console.error('Resend verification error:', error)
      let fallbackSent = false
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        await sendEmail({
          to: email.toLowerCase(),
          subject: 'iBlood: verification resend requested',
          text: [
            'We received your resend request.',
            'Our verification provider reported a temporary issue while sending the confirmation email.',
            '',
            'Please retry shortly from:',
            `${appUrl}/auth/signup`,
            '',
            'If this persists, contact support and share your signup email address.',
          ].join('\n'),
          html: `
            <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px">
              <h3>Verification resend requested</h3>
              <p>We received your resend request, but our verification provider reported a temporary issue.</p>
              <p>Please retry from the signup page in a few minutes.</p>
              <p style="font-size:13px;color:#475569">If this persists, contact support with your signup email address.</p>
            </div>
          `,
        })
        fallbackSent = true
      } catch (fallbackErr) {
        console.warn('Resend fallback email failed:', fallbackErr.message)
      }
      return NextResponse.json(
        {
          error: 'Failed to send verification email. Please try again shortly.',
          fallbackNotificationSent: fallbackSent,
        },
        { status: 502 }
      )
    }

    // Update last verification request time
    user.lastVerificationRequestAt = new Date()
    await user.save()

    return NextResponse.json({
      success: true,
      message: 'Verification email sent! Please check your inbox.',
    })
  } catch (error) {
    console.error('POST /api/auth/resend-verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/resend-verification
 * Check if user can request resend (rate limiting)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    await connectDB()

    const user = await User.findOne({ email: email.toLowerCase() })

    if (!user) {
      return NextResponse.json({
        canResend: true,
      })
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json({
        canResend: false,
        reason: 'already_verified',
      })
    }

    // Check rate limit (can resend after 60 seconds)
    const now = new Date()
    const lastRequest = user.lastVerificationRequestAt
    const cooldownPeriod = 60 * 1000 // 60 seconds

    if (lastRequest && (now - lastRequest.getTime()) < cooldownPeriod) {
      const waitTime = Math.ceil((cooldownPeriod - (now - lastRequest.getTime())) / 1000)
      return NextResponse.json({
        canResend: false,
        reason: 'rate_limited',
        waitTime,
      })
    }

    return NextResponse.json({
      canResend: true,
    })
  } catch (error) {
    console.error('GET /api/auth/resend-verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
