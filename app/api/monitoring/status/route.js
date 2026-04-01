/**
 * GET /api/monitoring/status
 * Provides system health and monitoring status
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getEmailServiceStatus } from '@/lib/email-service'
import { getGoogleOAuthStatus } from '@/lib/google-oauth'

export async function GET(request) {
  try {
    // Check database connection
    let dbConnected = false
    try {
      await connectDB()
      dbConnected = true
    } catch (err) {
      console.warn('Database connection check failed:', err.message)
    }

    // Get service status
    const emailStatus = getEmailServiceStatus()
    const googleOAuthStatus = getGoogleOAuthStatus()

    const status = {
      timestamp: new Date().toISOString(),
      system: {
        database: dbConnected ? 'healthy' : 'unhealthy',
      },
      services: {
        email: {
          provider: emailStatus.provider,
          configured: emailStatus.configured,
          status: emailStatus.configured ? 'available' : 'not_configured',
        },
        auth: {
          provider: 'Google OAuth',
          configured: googleOAuthStatus.configured,
          status: googleOAuthStatus.configured ? 'available' : 'not_configured',
        },
      },
      config: {
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
      },
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error('Monitoring status check failed:', error)
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        system: { database: 'error' },
        error: error.message,
      },
      { status: 503 }
    )
  }
}
