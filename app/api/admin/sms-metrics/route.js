/**
 * GET /api/admin/sms-metrics
 * Get SMS delivery metrics and statistics
 * Access: super_admin, org_admin only
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin, isOrgAdmin } from '@/lib/rbac'
import { getSMSMetrics, resetSMSMetrics } from '@/lib/sms-service'

export async function GET(request) {
  try {
    const user = await getCurrentUser(request.cookies)

    if (!user || (!isSuperAdmin(user.role) && !isOrgAdmin(user.role))) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const metrics = getSMSMetrics()

    return NextResponse.json({
      success: true,
      data: metrics
    })
  } catch (error) {
    console.error('GET /api/admin/sms-metrics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SMS metrics' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/sms-metrics
 * Reset SMS metrics (for testing or admin action)
 * Access: super_admin only
 */
export async function POST(request) {
  try {
    const user = await getCurrentUser(request.cookies)

    if (!user || !isSuperAdmin(user.role)) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()

    if (body.action === 'reset') {
      resetSMSMetrics()

      return NextResponse.json({
        success: true,
        message: 'SMS metrics reset successfully'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('POST /api/admin/sms-metrics error:', error)
    return NextResponse.json(
      { error: 'Failed to reset SMS metrics' },
      { status: 500 }
    )
  }
}
