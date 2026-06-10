/**
 * GET /api/donors/[id] - Get single donor details with enriched donation history
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Donor from '@/lib/models/Donor'
import { getCurrentUser } from '@/lib/session'
import { canPerformAction } from '@/lib/rbac'
import {
  buildDonorDonationSummary,
  enrichDonationHistoryWithInventory,
} from '@/lib/donor-donation-history'
import { formatBloodTypeLabel } from '@/lib/donor-blood-types'

export async function GET(request, { params }) {
  try {
    await connectDB()

    const resolvedParams = await params
    const { id } = resolvedParams

    const user = await getCurrentUser(request.cookies)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (!canPerformAction(user, 'view', 'donors')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const donor = await Donor.findById(id).lean()

    if (!donor) {
      return NextResponse.json({ error: 'Donor not found' }, { status: 404 })
    }

    if (user.role !== 'super_admin' && donor.organizationId?.toString() !== user.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (!donor.nextEligibleDate && donor.lastDonationDate) {
      const nextEligible = new Date(donor.lastDonationDate)
      nextEligible.setDate(nextEligible.getDate() + 56)
      donor.nextEligibleDate = nextEligible
    }

    const donationHistory = await enrichDonationHistoryWithInventory(
      donor.donationHistory || [],
      donor.organizationId
    )

    const donationStats = buildDonorDonationSummary(donor, donationHistory)

    return NextResponse.json({
      success: true,
      data: {
        ...donor,
        id: donor._id.toString(),
        fullName: `${donor.firstName} ${donor.lastName}`.trim(),
        bloodTypeLabel: formatBloodTypeLabel(donor.bloodType),
        donationHistory,
        donationStats,
      },
    })
  } catch (error) {
    console.error('GET /api/donors/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch donor details' }, { status: 500 })
  }
}
