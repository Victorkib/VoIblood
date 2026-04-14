/**
 * POST /api/register/otp/send
 * Send OTP via SMS (primary) or Email (backup)
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

export async function POST(request) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { phone, email } = body

    console.log('[OTP Send] Request received:', { 
      phone: phone ? '***' : null, 
      email: email ? '***' : null,
      timestamp: new Date().toISOString()
    })

    // Validate input - need either phone or email
    if (!phone && !email) {
      console.log('[OTP Send] Validation failed: No phone or email provided')
      return NextResponse.json(
        { error: 'Phone number or email is required' },
        { status: 400 }
      )
    }

    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = phone ? phone.replace(/[\s\-\(\)]/g, '') : null
    const normalizedEmail = email ? email.toLowerCase().trim() : null
    const rateLimitKey = normalizedPhone || normalizedEmail

    // Check rate limit (3 requests per 5 minutes)
    const rateLimit = checkRateLimit(rateLimitKey, 3, 5 * 60 * 1000)
    
    if (!rateLimit.allowed) {
      console.log('[OTP Send] Rate limit exceeded for:', rateLimitKey)
      return NextResponse.json(
        { 
          error: 'Too many requests. Please wait before requesting another OTP.',
          retryAfter: rateLimit.retryAfter,
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '3',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
            'Retry-After': rateLimit.retryAfter.toString(),
          }
        }
      )
    }

    // Connect to database
    await connectDB()

    // Check if there's an existing unexpired OTP for this user
    const existingOTP = await OTPVerification.getOTP(rateLimitKey)
    
    if (existingOTP) {
      const timeSinceCreated = Date.now() - existingOTP.createdAt.getTime()
      const cooldownPeriod = 30000 // 30 seconds cooldown
      
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
      
      // Delete old OTP to make room for new one
      await OTPVerification.deleteOTP(rateLimitKey)
      console.log('[OTP Send] Deleted previous OTP')
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Store OTP with 5-minute expiry
    const expiresAt = Date.now() + 5 * 60 * 1000 // 5 minutes

    console.log('[OTP Send] Storing OTP in database with key:', rateLimitKey)
    console.log('[OTP Send] Expires at:', new Date(expiresAt).toISOString())

    await OTPVerification.createOTP(rateLimitKey, otp, normalizedPhone, normalizedEmail, expiresAt)

    console.log('[OTP Send] OTP stored successfully')

    // Try SMS first (primary - Twilio → Africa's Talking fallback)
    if (normalizedPhone) {
      try {
        console.log('[OTP Send] Attempting SMS delivery (Twilio → Africa\'s Talking)...')
        const smsResult = await sendOTPViaSMS(normalizedPhone, otp)

        if (smsResult.success) {
          const duration = Date.now() - startTime
          console.log('[OTP Send] SMS sent successfully via', smsResult.provider, 'in', duration, 'ms')

          return NextResponse.json({
            success: true,
            message: 'OTP sent via SMS',
            method: 'sms',
            provider: smsResult.provider, // 'twilio' or 'africastalking'
            expiresAt,
            remaining: rateLimit.remaining,
          }, {
            headers: {
              'X-RateLimit-Limit': '3',
              'X-RateLimit-Remaining': (rateLimit.remaining - 1).toString(),
              'X-RateLimit-Reset': rateLimit.resetAt.toString(),
            }
          })
        }

        console.log('[OTP Send] SMS delivery failed, falling back to email:', smsResult.error)
      } catch (smsError) {
        console.log('[OTP Send] SMS error:', smsError.message)
      }
    } else {
      console.log('[OTP Send] No phone number provided, skipping SMS')
    }

    // Fallback to email
    if (normalizedEmail) {
      try {
        console.log('[OTP Send] Attempting Email delivery...')
        const emailResult = await sendOTPViaEmail(normalizedEmail, otp)

        if (emailResult.success) {
          const duration = Date.now() - startTime
          console.log('[OTP Send] Email sent successfully in', duration, 'ms')
          
          return NextResponse.json({
            success: true,
            message: 'OTP sent via email',
            method: 'email',
            provider: emailResult.provider,
            expiresAt,
            remaining: rateLimit.remaining,
          }, {
            headers: {
              'X-RateLimit-Limit': '3',
              'X-RateLimit-Remaining': (rateLimit.remaining - 1).toString(),
              'X-RateLimit-Reset': rateLimit.resetAt.toString(),
            }
          })
        }

        console.log('[OTP Send] Email delivery failed:', emailResult.error)
      } catch (emailError) {
        console.log('[OTP Send] Email error:', emailError.message)
      }
    }

    // If both fail, log OTP to console for demo/testing
    console.log('\n[OTP FALLBACK] ========================================')
    console.log(`[OTP FALLBACK] Phone: ${normalizedPhone || 'N/A'}`)
    console.log(`[OTP FALLBACK] Email: ${normalizedEmail || 'N/A'}`)
    console.log(`[OTP FALLBACK] OTP: ${otp}`)
    console.log(`[OTP FALLBACK] Expires: ${new Date(expiresAt).toISOString()}`)
    console.log('[OTP FALLBACK] ========================================\n')

    const duration = Date.now() - startTime
    console.log('[OTP Send] Fallback mode - OTP logged to console in', duration, 'ms')

    return NextResponse.json({
      success: true,
      message: 'OTP generated (check console for demo)',
      method: 'console',
      expiresAt,
      remaining: rateLimit.remaining,
      demo: true,
    }, {
      headers: {
        'X-RateLimit-Limit': '3',
        'X-RateLimit-Remaining': (rateLimit.remaining - 1).toString(),
        'X-RateLimit-Reset': rateLimit.resetAt.toString(),
      }
    })
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
