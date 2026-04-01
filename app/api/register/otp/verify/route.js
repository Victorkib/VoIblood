/**
 * POST /api/register/otp/verify
 * Verify OTP and issue verification token
 * 
 * Features:
 * - Database-backed OTP verification
 * - Issues persistent verification token for registration
 * - Attempt tracking with lockout after 5 failed attempts
 * - Comprehensive error handling
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import OTPVerification from '@/lib/models/OTPVerification'
import VerificationToken from '@/lib/models/VerificationToken'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { phone, email, otp } = body

    console.log('[OTP Verify] Request received:', { 
      phone: phone ? '***' : null, 
      email: email ? '***' : null,
      otp: otp ? '***' : 'missing',
      timestamp: new Date().toISOString()
    })

    // Validate input
    if ((!phone && !email) || !otp) {
      console.log('[OTP Verify] Validation failed: Missing required fields')
      return NextResponse.json(
        { error: 'Phone/email and OTP are required' },
        { status: 400 }
      )
    }

    // Normalize inputs
    const normalizedPhone = phone ? phone.replace(/[\s\-\(\)]/g, '') : null
    const normalizedEmail = email ? email.toLowerCase().trim() : null
    const rateLimitKey = `verify:${normalizedPhone || normalizedEmail}`
    const otpKey = normalizedPhone || normalizedEmail

    // Check rate limit for verification attempts (5 per 10 minutes)
    const rateLimit = checkRateLimit(rateLimitKey, 5, 10 * 60 * 1000)
    
    if (!rateLimit.allowed) {
      console.log('[OTP Verify] Rate limit exceeded for:', rateLimitKey)
      return NextResponse.json(
        { 
          error: 'Too many verification attempts. Please request a new OTP.',
          retryAfter: rateLimit.retryAfter,
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
            'Retry-After': rateLimit.retryAfter.toString(),
          }
        }
      )
    }

    // Connect to database
    await connectDB()

    console.log('[OTP Verify] Looking up OTP in database for key:', otpKey)

    // Get OTP from database
    const otpDoc = await OTPVerification.findOne({ 
      key: otpKey, 
      verified: false 
    })

    if (!otpDoc) {
      console.log('[OTP Verify] OTP not found for key:', otpKey)
      return NextResponse.json(
        { error: 'OTP not found. Please request a new one.' },
        { status: 400 }
      )
    }

    console.log('[OTP Verify] OTP found, checking expiry...')
    console.log('[OTP Verify] Expires at:', otpDoc.expiresAt.toISOString())
    console.log('[OTP Verify] Current time:', new Date().toISOString())

    // Check expiry
    if (new Date() > otpDoc.expiresAt) {
      console.log('[OTP Verify] OTP has expired')
      await OTPVerification.deleteOne({ _id: otpDoc._id })
      return NextResponse.json(
        { error: 'OTP expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Increment attempt counter
    otpDoc.attempts = (otpDoc.attempts || 0) + 1
    await otpDoc.save()

    console.log('[OTP Verify] Attempt #', otpDoc.attempts)

    // Check for too many failed attempts
    if (otpDoc.attempts >= 5) {
      console.log('[OTP Verify] Maximum attempts reached, deleting OTP')
      await OTPVerification.deleteOne({ _id: otpDoc._id })
      return NextResponse.json(
        { 
          error: 'Maximum verification attempts (5) reached. Please request a new OTP.',
          maxAttemptsReached: true,
        },
        { status: 400 }
      )
    }

    // Verify OTP
    console.log('[OTP Verify] Comparing OTPs...')
    
    if (otpDoc.otp !== otp) {
      console.log('[OTP Verify] OTP mismatch! Provided:', otp, 'Stored:', otpDoc.otp)
      const remainingAttempts = 5 - otpDoc.attempts
      
      return NextResponse.json(
        { 
          error: `Invalid OTP. You have ${remainingAttempts} attempts remaining.`,
          remainingAttempts,
          attempts: otpDoc.attempts,
        },
        { 
          status: 400,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': (rateLimit.remaining - 1).toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
          }
        }
      )
    }

    console.log('[OTP Verify] OTP match confirmed!')

    // Mark OTP as verified
    otpDoc.verified = true
    await otpDoc.save()

    // Generate verification token (valid for 30 minutes)
    const tokenExpiresAt = Date.now() + 30 * 60 * 1000 // 30 minutes
    
    console.log('[OTP Verify] Creating verification token...')
    const verificationToken = await VerificationToken.createToken(
      otpDoc.phone || normalizedPhone,
      otpDoc.email || normalizedEmail,
      tokenExpiresAt
    )

    console.log('[OTP Verify] Verification token created successfully')

    // Delete the OTP record after successful verification
    await OTPVerification.deleteOne({ _id: otpDoc._id })
    console.log('[OTP Verify] OTP record deleted')

    const duration = Date.now() - startTime
    console.log('[OTP Verify] Verification completed successfully in', duration, 'ms')

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
      verified: true,
      verificationToken: verificationToken.token,
      tokenExpiresAt,
      phone: otpDoc.phone || normalizedPhone,
      email: otpDoc.email || normalizedEmail,
    }, {
      headers: {
        'X-RateLimit-Limit': '5',
        'X-RateLimit-Remaining': (rateLimit.remaining - 1).toString(),
        'X-RateLimit-Reset': rateLimit.resetAt.toString(),
      }
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[OTP Verify] Unexpected error after', duration, 'ms:', error)
    console.error('[OTP Verify] Error stack:', error.stack)
    
    return NextResponse.json(
      { 
        error: 'Failed to verify OTP. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}
