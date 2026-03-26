/**
 * GET /api/monitoring/audit-logs
 * Retrieve audit logs with filtering
 * Query params:
 * - organizationId (required)
 * - action (optional): filter by action type
 * - userId (optional): filter by user
 * - severity (optional): low, medium, high, critical
 * - startDate (optional): ISO date string
 * - endDate (optional): ISO date string
 * - limit (optional, default: 100)
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { queryAuditLogs, getCriticalOperations } from '@/lib/audit-logger'

export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const action = searchParams.get('action')
    const userId = searchParams.get('userId')
    const severity = searchParams.get('severity')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '100')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      )
    }

    // Build filter
    const filter = { organizationId }

    if (action) filter.action = action
    if (userId) filter.userId = userId
    if (severity) filter.severity = severity

    if (startDate || endDate) {
      filter.timestamp = {}
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate)
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate)
      }
    }

    // Query audit logs
    const auditLogs = await queryAuditLogs(filter, { limit, sort: { timestamp: -1 } })

    // Get summary stats
    const stats = {
      total: auditLogs.length,
      bySeverity: {},
      byAction: {},
    }

    auditLogs.forEach((log) => {
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1
    })

    return NextResponse.json({
      success: true,
      data: auditLogs,
      stats,
      query: {
        organizationId,
        action: action || 'all',
        userId: userId || 'all',
        severity: severity || 'all',
        limit,
      },
    })
  } catch (error) {
    console.error('Audit logs retrieval failed:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve audit logs', details: error.message },
      { status: 500 }
    )
  }
}
