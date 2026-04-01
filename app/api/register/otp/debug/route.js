/**
 * GET /api/register/otp/debug
 * Debug endpoint to list all stored OTPs (for development only)
 */

import { NextResponse } from 'next/server'
import { listAllOTPs } from '@/lib/otp-store'

export async function GET() {
  try {
    const otps = listAllOTPs()
    
    return NextResponse.json({
      success: true,
      message: 'Current OTPs in store',
      data: {
        total: otps.length,
        otps: otps.map(otp => ({
          key: otp.key,
          expiresAt: otp.expiresAt,
          expired: otp.expired,
          timeLeft: Math.floor(otp.timeLeft / 1000) + 's'
        }))
      }
    })
  } catch (error) {
    console.error('GET /api/register/otp/debug error:', error)
    return NextResponse.json(
      { error: 'Failed to get OTP debug info' },
      { status: 500 }
    )
  }
}
