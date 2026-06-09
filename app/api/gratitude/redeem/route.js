/**
 * POST /api/gratitude/redeem — complete in-person redemption at partner hospital.
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { jsonError, requireGratitudeHospitalStaff } from '@/lib/gratitude-points/api-auth'
import { redeemGratitudePoints } from '@/lib/gratitude-points/redeem-service'

export async function POST(request) {
  try {
    await connectDB()

    const auth = await requireGratitudeHospitalStaff(request.cookies)
    const err = jsonError(auth)
    if (err) return err

    const body = await request.json()
    const {
      walletId,
      catalogItemId,
      donorId,
      verificationMethod,
      nationalId,
      phoneVerifiedInPerson,
      notes,
    } = body

    if (!walletId || !catalogItemId || !verificationMethod) {
      return NextResponse.json(
        { error: 'walletId, catalogItemId, and verificationMethod are required' },
        { status: 400 }
      )
    }

    if (verificationMethod === 'phone_in_person') {
      if (!phoneVerifiedInPerson) {
        return NextResponse.json(
          { error: 'Confirm in-person identity verification for phone lookup' },
          { status: 400 }
        )
      }
      if (!nationalId?.trim()) {
        return NextResponse.json(
          { error: 'National ID must be verified in person for phone-based lookup' },
          { status: 400 }
        )
      }
    }

    if (verificationMethod === 'national_id' && !nationalId?.trim()) {
      return NextResponse.json({ error: 'National ID is required' }, { status: 400 })
    }

    const orgId = auth.user.organizationId
    if (!orgId && !auth.isSuperAdmin) {
      return NextResponse.json({ error: 'Hospital organization required' }, { status: 400 })
    }

    const result = await redeemGratitudePoints({
      hospitalOrganizationId: orgId || body.hospitalOrganizationId,
      catalogItemId,
      walletId,
      donorId,
      verifiedByUserId: auth.user._id,
      verificationMethod,
      nationalId: nationalId?.trim(),
      notes: notes || '',
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('POST /api/gratitude/redeem error:', error)
    return NextResponse.json(
      { error: error.message || 'Redemption failed' },
      { status: 400 }
    )
  }
}
