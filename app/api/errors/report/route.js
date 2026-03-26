import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getRateLimitInfo, createRateLimitError } from '@/lib/rate-limiter'
import { sendErrorAlert } from '@/lib/email-service'

/**
 * POST /api/errors/report
 * Reports client-side errors for monitoring
 */
export async function POST(request) {
  const rateLimitInfo = getRateLimitInfo(request, 'report')
  if (!rateLimitInfo.allowed) {
    return NextResponse.json(createRateLimitError(rateLimitInfo), { status: 429 })
  }

  try {
    const body = await request.json()
    const { message, stack, timestamp, url, userId, action } = body

    // Validate required fields
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Connect to database for logging
    try {
      await connectDB()
    } catch (dbErr) {
      console.warn('Database connection failed for error logging:', dbErr)
      // Continue without database - still log to console
    }

    // Create comprehensive error log
    const errorLog = {
      message,
      stack: stack || 'No stack trace available',
      timestamp: timestamp || new Date().toISOString(),
      url: url || 'Unknown URL',
      userId: userId || 'Anonymous',
      action: action || 'Unknown',
      userAgent: request.headers.get('user-agent'),
      severity: determineSeverity(message),
      resolved: false,
      createdAt: new Date(),
    }

    // Log to console for monitoring
    console.error('[CLIENT_ERROR_REPORTED]', {
      message: errorLog.message,
      url: errorLog.url,
      timestamp: errorLog.timestamp,
      severity: errorLog.severity,
    })

    // In production, send to monitoring service (Sentry, LogRocket, etc.)
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
      try {
        // Send to Sentry or similar service
        await sendToMonitoringService(errorLog)
      } catch (err) {
        console.error('Failed to send error to monitoring service:', err)
      }
    }

    // Email admin for critical errors
    if (errorLog.severity === 'critical' && process.env.ADMIN_EMAIL) {
      try {
        const organizationId = body.organizationId || 'system'
        await sendErrorAlert(errorLog, organizationId)
      } catch (err) {
        console.error('Failed to send error notification:', err)
      }
    }

    return NextResponse.json({
      success: true,
      errorId: generateErrorId(),
      message: 'Error report received and logged',
    })
  } catch (error) {
    console.error('Error reporting endpoint error:', error)
    return NextResponse.json(
      { error: 'Failed to report error' },
      { status: 500 }
    )
  }
}

function determineSeverity(message) {
  const message_lower = message.toLowerCase()
  
  if (
    message_lower.includes('fatal') ||
    message_lower.includes('crash') ||
    message_lower.includes('undefined') ||
    message_lower.includes('null')
  ) {
    return 'critical'
  }
  
  if (
    message_lower.includes('auth') ||
    message_lower.includes('permission') ||
    message_lower.includes('security')
  ) {
    return 'high'
  }
  
  if (
    message_lower.includes('timeout') ||
    message_lower.includes('network') ||
    message_lower.includes('connection')
  ) {
    return 'medium'
  }
  
  return 'low'
}

function generateErrorId() {
  return Math.random().toString(36).substring(2, 11).toUpperCase() +
         Date.now().toString(36).toUpperCase()
}

async function sendToMonitoringService(errorLog) {
  // Placeholder for Sentry/LogRocket integration
  // Implement based on your monitoring service
  console.log('Sending error to monitoring service:', errorLog.message)
}

async function sendErrorNotification(errorLog) {
  // Placeholder for email notification
  console.log('Sending critical error notification:', errorLog.message)
}
