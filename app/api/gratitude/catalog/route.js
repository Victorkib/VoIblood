/**
 * GET /api/gratitude/catalog?organizationId= — public catalog for a partner hospital.
 * POST — create catalog item (hospital admin).
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Organization from '@/lib/models/Organization'
import RedemptionCatalogItem from '@/lib/models/RedemptionCatalogItem'
import {
  CATALOG_CATEGORIES,
  CATALOG_POINT_COST_MIN,
  CATALOG_POINT_COST_MAX,
} from '@/lib/gratitude-points/constants'
import {
  canManageCatalog,
  jsonError,
  requireGratitudeHospitalStaff,
} from '@/lib/gratitude-points/api-auth'
import { isRewardsPartnerHospital } from '@/lib/gratitude-points/hospital-access'

export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const manage = searchParams.get('manage') === '1'

    if (manage) {
      const auth = await requireGratitudeHospitalStaff(request.cookies)
      const err = jsonError(auth)
      if (err) return err

      const items = await RedemptionCatalogItem.find({
        organizationId: auth.user.organizationId,
      })
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean()

      return NextResponse.json({ success: true, data: items })
    }

    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 })
    }

    const org = await Organization.findById(organizationId).lean()
    if (!org || !isRewardsPartnerHospital(org)) {
      return NextResponse.json({ error: 'Partner hospital not found' }, { status: 404 })
    }

    const items = await RedemptionCatalogItem.find({
      organizationId,
      isActive: true,
    })
      .sort({ sortOrder: 1, pointCost: 1 })
      .lean()

    return NextResponse.json({
      success: true,
      data: {
        hospital: { id: org._id.toString(), name: org.name, city: org.city },
        items: items.map((i) => ({
          id: i._id.toString(),
          title: i.title,
          description: i.description,
          category: i.category,
          pointCost: i.pointCost,
        })),
      },
    })
  } catch (error) {
    console.error('GET /api/gratitude/catalog error:', error)
    return NextResponse.json({ error: 'Failed to load catalog' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await connectDB()

    const auth = await requireGratitudeHospitalStaff(request.cookies)
    const err = jsonError(auth)
    if (err) return err

    if (!canManageCatalog(auth.user)) {
      return NextResponse.json({ error: 'Only admins can manage the catalog' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, category, pointCost, sortOrder, maxRedemptionsPerDonor } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const cost = Number(pointCost)
    if (!Number.isFinite(cost) || cost < CATALOG_POINT_COST_MIN || cost > CATALOG_POINT_COST_MAX) {
      return NextResponse.json(
        {
          error: `Point cost must be between ${CATALOG_POINT_COST_MIN} and ${CATALOG_POINT_COST_MAX}`,
        },
        { status: 400 }
      )
    }

    const cat = CATALOG_CATEGORIES.includes(category) ? category : 'other'

    const item = await RedemptionCatalogItem.create({
      organizationId: auth.user.organizationId,
      title: title.trim(),
      description: (description || '').trim(),
      category: cat,
      pointCost: cost,
      sortOrder: Number(sortOrder) || 0,
      maxRedemptionsPerDonor: Number(maxRedemptionsPerDonor) || 0,
      isActive: true,
    })

    return NextResponse.json({ success: true, data: item }, { status: 201 })
  } catch (error) {
    console.error('POST /api/gratitude/catalog error:', error)
    return NextResponse.json({ error: 'Failed to create catalog item' }, { status: 500 })
  }
}
