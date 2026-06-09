/**
 * PATCH / DELETE catalog item for own hospital.
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
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

export async function PATCH(request, { params }) {
  try {
    await connectDB()
    const { id } = await params

    const auth = await requireGratitudeHospitalStaff(request.cookies)
    const err = jsonError(auth)
    if (err) return err
    if (!canManageCatalog(auth.user)) {
      return NextResponse.json({ error: 'Only admins can manage the catalog' }, { status: 403 })
    }

    const item = await RedemptionCatalogItem.findById(id)
    if (!item || item.organizationId.toString() !== auth.user.organizationId) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const body = await request.json()
    if (body.title !== undefined) item.title = String(body.title).trim()
    if (body.description !== undefined) item.description = String(body.description).trim()
    if (body.category !== undefined && CATALOG_CATEGORIES.includes(body.category)) {
      item.category = body.category
    }
    if (body.pointCost !== undefined) {
      const cost = Number(body.pointCost)
      if (cost < CATALOG_POINT_COST_MIN || cost > CATALOG_POINT_COST_MAX) {
        return NextResponse.json({ error: 'Invalid point cost' }, { status: 400 })
      }
      item.pointCost = cost
    }
    if (typeof body.isActive === 'boolean') item.isActive = body.isActive
    if (body.sortOrder !== undefined) item.sortOrder = Number(body.sortOrder) || 0
    if (body.maxRedemptionsPerDonor !== undefined) {
      item.maxRedemptionsPerDonor = Number(body.maxRedemptionsPerDonor) || 0
    }

    await item.save()
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    console.error('PATCH catalog error:', error)
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB()
    const { id } = await params

    const auth = await requireGratitudeHospitalStaff(request.cookies)
    const err = jsonError(auth)
    if (err) return err
    if (!canManageCatalog(auth.user)) {
      return NextResponse.json({ error: 'Only admins can manage the catalog' }, { status: 403 })
    }

    const item = await RedemptionCatalogItem.findById(id)
    if (!item || item.organizationId.toString() !== auth.user.organizationId) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    item.isActive = false
    await item.save()

    return NextResponse.json({ success: true, message: 'Item deactivated' })
  } catch (error) {
    console.error('DELETE catalog error:', error)
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }
}
