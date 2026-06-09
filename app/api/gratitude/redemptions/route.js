/**
 * GET /api/gratitude/redemptions — recent redemptions for hospital staff.
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import GratitudeRedemption from '@/lib/models/GratitudeRedemption'
import { jsonError, requireGratitudeHospitalStaff } from '@/lib/gratitude-points/api-auth'

export async function GET(request) {
  try {
    await connectDB()

    const auth = await requireGratitudeHospitalStaff(request.cookies)
    const err = jsonError(auth)
    if (err) return err

    const orgId = auth.user.organizationId
    const limit = Math.min(Number(new URL(request.url).searchParams.get('limit')) || 50, 100)

    const rows = await GratitudeRedemption.find({
      hospitalOrganizationId: orgId,
      status: 'completed',
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({
        id: r._id.toString(),
        referenceCode: r.referenceCode,
        catalogItemTitle: r.catalogItemTitle,
        pointsSpent: r.pointsSpent,
        donorDisplayName: r.donorDisplayName,
        verificationMethod: r.verificationMethod,
        createdAt: r.createdAt,
      })),
    })
  } catch (error) {
    console.error('GET redemptions error:', error)
    return NextResponse.json({ error: 'Failed to load redemptions' }, { status: 500 })
  }
}
