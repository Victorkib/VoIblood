/**
 * POST /api/gratitude/lookup — hospital staff donor lookup before redemption.
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { jsonError, requireGratitudeHospitalStaff } from '@/lib/gratitude-points/api-auth'
import { lookupDonorForRedemption } from '@/lib/gratitude-points/redeem-service'

export async function POST(request) {
  try {
    await connectDB()

    const auth = await requireGratitudeHospitalStaff(request.cookies)
    const err = jsonError(auth)
    if (err) return err

    const body = await request.json()
    const { donorToken, nationalId, phone } = body

    if (!donorToken && !nationalId && !phone) {
      return NextResponse.json(
        { error: 'Provide donorToken, nationalId, or phone' },
        { status: 400 }
      )
    }

    const orgId = auth.isSuperAdmin
      ? body.hospitalOrganizationId || auth.user.organizationId
      : auth.user.organizationId

    if (!orgId) {
      return NextResponse.json({ error: 'Hospital organization required' }, { status: 400 })
    }

    const result = await lookupDonorForRedemption({
      donorToken,
      nationalId,
      phone,
      hospitalOrganizationId: orgId,
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('POST /api/gratitude/lookup error:', error)
    return NextResponse.json({ error: error.message || 'Lookup failed' }, { status: 400 })
  }
}
