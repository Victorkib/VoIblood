/**
 * GET /api/donors/[id] - Get single donor details
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Donor from '@/lib/models/Donor'
import { getCurrentUser } from '@/lib/session'
import { canPerformAction } from '@/lib/rbac'

export async function GET(request, { params }) {
  try {
    await connectDB()

    const resolvedParams = await params
    const { id } = resolvedParams

    // Get user from session
    const user = await getCurrentUser(request.cookies)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!canPerformAction(user, 'view', 'donors')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const donor = await Donor.findById(id).lean()

    if (!donor) {
      return NextResponse.json(
        { error: 'Donor not found' },
        { status: 404 }
      )
    }

    // Calculate nextEligibleDate if missing (Option 1: Primary Solution)
    if (!donor.nextEligibleDate && donor.lastDonationDate) {
      const nextEligible = new Date(donor.lastDonationDate)
      nextEligible.setDate(nextEligible.getDate() + 56)
      donor.nextEligibleDate = nextEligible
    }

    // Check org access
    if (user.role !== 'super_admin' && donor.organizationId?.toString() !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: donor,
    })
  } catch (error) {
    console.error('GET /api/donors/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch donor details' },
      { status: 500 }
    )
  }
}
