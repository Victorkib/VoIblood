/**
 * GET /api/gratitude/partners — participating hospitals (Kenya network).
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Organization from '@/lib/models/Organization'
import { isRewardsPartnerHospital } from '@/lib/gratitude-points/hospital-access'

export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city')?.trim()

    const hospitals = await Organization.find({
      type: 'hospital',
      isActive: true,
      accountStatus: 'active',
      'rewardsProgram.partnerActive': true,
    })
      .select('name city state address phone rewardsProgram subscriptionPlan')
      .sort({ name: 1 })
      .lean()

    const partners = hospitals
      .filter((h) => isRewardsPartnerHospital(h))
      .filter((h) => !city || (h.city || '').toLowerCase().includes(city.toLowerCase()))
      .map((h) => ({
        id: h._id.toString(),
        name: h.name,
        city: h.city,
        state: h.state,
        address: h.address,
        phone: h.phone,
      }))

    return NextResponse.json({ success: true, data: partners })
  } catch (error) {
    console.error('GET /api/gratitude/partners error:', error)
    return NextResponse.json(
      { error: 'Failed to load partner hospitals', details: error.message },
      { status: 500 }
    )
  }
}
