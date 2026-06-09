/**
 * POST /api/register/otp/send
 * Send OTP via Email (primary) or SMS (backup)
 *
 * Features:
 * - Database-backed OTP storage (persistent across server instances)
 * - Rate limiting (3 requests per 5 minutes per phone/email)
 * - Attempt tracking
 * - Comprehensive error handling
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { sendOTPViaSMS } from '@/lib/sms-service'
import { sendOTPViaEmail } from '@/lib/email-service'
import OTPVerification from '@/lib/models/OTPVerification'
import { checkRateLimit } from '@/lib/rate-limit'
import { normalizeOtpContacts } from '@/lib/otp-delivery'

function rateLimitHeaders(rateLimit, remainingDelta = 1) {
  return {
    'X-RateLimit-Limit': '3',
    'X-RateLimit-Remaining': Math.max(0, rateLimit.remaining - remainingDelta).toString(),
    'X-RateLimit-Reset': rateLimit.resetAt.toString(),
  }
}

export async function POST(request) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { phone, email } = body

    console.log('[OTP Send] Request received:', {
      phone: phone ? '***' : null,
      email: email ? '***' : null,
      timestamp: new Date().toISOString(),
    })

    const { normalizedPhone, normalizedEmail, lookupKey } = normalizeOtpContacts({ phone, email })

    if (!lookupKey) {
      console.log('[OTP Send] Validation failed: No phone or email provided')
      return NextResponse.json(
        { error: 'Phone number or email is required' },
        { status: 400 }
      )
    }

    const rateLimit = checkRateLimit(lookupKey, 3, 5 * 60 * 1000)

    if (!rateLimit.allowed) {
      console.log('[OTP Send] Rate limit exceeded for:', lookupKey)
      return NextResponse.json(
        {
          error: 'Too many requests. Please wait before requesting another OTP.',
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            ...rateLimitHeaders(rateLimit, 0),
            'Retry-After': rateLimit.retryAfter.toString(),
          },
        }
      )
    }

    await connectDB()

    const existingOTP = await OTPVerification.getOTP(lookupKey)

    if (existingOTP) {
      const timeSinceCreated = Date.now() - existingOTP.createdAt.getTime()
      const cooldownPeriod = 30000

      if (timeSinceCreated < cooldownPeriod) {
        const waitTime = Math.ceil((cooldownPeriod - timeSinceCreated) / 1000)
        console.log('[OTP Send] Cooldown active, wait:', waitTime, 'seconds')
        return NextResponse.json(
          {
            error: `Please wait ${waitTime} seconds before requesting another OTP`,
            cooldown: true,
            waitTime,
          },
          { status: 400 }
        )
      }

      await OTPVerification.deleteOTP(lookupKey)
      console.log('[OTP Send] Deleted previous OTP')
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = Date.now() + 5 * 60 * 1000

    console.log('[OTP Send] Storing OTP in database with key:', lookupKey)
    console.log('[OTP Send] Expires at:', new Date(expiresAt).toISOString())

    await OTPVerification.createOTP(
      lookupKey,
      otp,
      normalizedPhone,
      normalizedEmail,
      expiresAt
    )

    console.log('[OTP Send] OTP stored successfully')

    let emailAttempted = false
    let emailFailureReason = null

    // Email first (primary)
    if (normalizedEmail) {
      emailAttempted = true
      try {
        console.log('[OTP Send] Attempting email delivery (primary)...')
        const emailResult = await sendOTPViaEmail(normalizedEmail, otp)

        if (emailResult.success) {
          const duration = Date.now() - startTime
          console.log('[OTP Send] Email sent successfully in', duration, 'ms')

          return NextResponse.json(
            {
              success: true,
              message: 'OTP sent to your email',
              method: 'email',
              provider: emailResult.provider,
              fallbackUsed: false,
              expiresAt,
              remaining: rateLimit.remaining,
            },
            { headers: rateLimitHeaders(rateLimit) }
          )
        }

        emailFailureReason = emailResult.error
        console.log('[OTP Send] Email delivery failed, falling back to SMS:', emailResult.error)
      } catch (emailError) {
        emailFailureReason = emailError.message
        console.log('[OTP Send] Email error:', emailError.message)
      }
    } else {
      console.log('[OTP Send] No email provided, skipping email delivery')
    }

    // SMS backup (Twilio → Africa's Talking)
    if (normalizedPhone) {
      try {
        console.log('[OTP Send] Attempting SMS delivery (backup)...')
        const smsResult = await sendOTPViaSMS(normalizedPhone, otp)

        if (smsResult.success) {
          const duration = Date.now() - startTime
          console.log('[OTP Send] SMS sent successfully via', smsResult.provider, 'in', duration, 'ms')

          return NextResponse.json(
            {
              success: true,
              message: emailAttempted
                ? 'Email delivery failed — OTP sent via SMS instead'
                : 'OTP sent via SMS',
              method: 'sms',
              provider: smsResult.provider,
              fallbackUsed: emailAttempted,
              emailFailureReason: emailAttempted ? emailFailureReason : undefined,
              expiresAt,
              remaining: rateLimit.remaining,
            },
            { headers: rateLimitHeaders(rateLimit) }
          )
        }

        console.log('[OTP Send] SMS delivery failed:', smsResult.error)
      } catch (smsError) {
        console.log('[OTP Send] SMS error:', smsError.message)
      }
    } else if (emailAttempted) {
      console.log('[OTP Send] No phone number provided for SMS backup')
    }

    console.log('\n[OTP FALLBACK] ========================================')
    console.log(`[OTP FALLBACK] Phone: ${normalizedPhone || 'N/A'}`)
    console.log(`[OTP FALLBACK] Email: ${normalizedEmail || 'N/A'}`)
    console.log(`[OTP FALLBACK] OTP: ${otp}`)
    console.log(`[OTP FALLBACK] Expires: ${new Date(expiresAt).toISOString()}`)
    console.log('[OTP FALLBACK] ========================================\n')

    const duration = Date.now() - startTime
    console.log('[OTP Send] Fallback mode - OTP logged to console in', duration, 'ms')

    return NextResponse.json(
      {
        success: true,
        message: 'OTP generated (check console for demo)',
        method: 'console',
        fallbackUsed: emailAttempted,
        expiresAt,
        remaining: rateLimit.remaining,
        demo: true,
      },
      { headers: rateLimitHeaders(rateLimit) }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[OTP Send] Unexpected error after', duration, 'ms:', error)
    console.error('[OTP Send] Error stack:', error.stack)

    return NextResponse.json(
      {
        error: 'Failed to send OTP. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}
