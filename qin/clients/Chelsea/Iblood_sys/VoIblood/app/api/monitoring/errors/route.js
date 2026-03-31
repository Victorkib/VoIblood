/**
 * GET /api/monitoring/errors
 * Retrieve error logs with filtering
 * Query params:
 * - organizationId (required)
 * - severity (optional): error, warning, info
 * - startDate (optional): ISO date string
 * - endDate (optional): ISO date string
 * - limit (optional, default: 50)
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'

export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const severity = searchParams.get('severity')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      )
    }

    // Dynamic import to avoid circular dependencies
    const { default: ErrorLog } = await import('@/lib/models/ErrorLog.js')

    // Build filter
    const filter = { organizationId }

    if (severity) {
      filter.severity = severity
    }

    if (startDate || endDate) {
      filter.timestamp = {}
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate)
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate)
      }
    }

    // Query error logs
    const errorLogs = await ErrorLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()

    // Get summary stats
    const stats = {
      total: await ErrorLog.countDocuments(filter),
      bySeverity: {},
    }

    // Count by severity
    const severities = ['error', 'warning', 'info', 'critical']
    for (const sev of severities) {
      stats.bySeverity[sev] = await ErrorLog.countDocuments({
        ...filter,
        severity: sev,
      })
    }

    return NextResponse.json({
      success: true,
      data: errorLogs,
      stats,
      query: {
        organizationId,
        severity: severity || 'all',
        limit,
      },
    })
  } catch (error) {
    console.error('Error logs retrieval failed:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve error logs', details: error.message },
      { status: 500 }
    )
  }
}
