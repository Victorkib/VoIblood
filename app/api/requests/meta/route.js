import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Organization from '@/lib/models/Organization'
import BloodInventory from '@/lib/models/BloodInventory'
import {
  resolveOrgContext,
  assertOrgCapability,
  ORG_CAPABILITIES,
} from '@/lib/api/org-capability-guard'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    const ctx = await resolveOrgContext(request, organizationId)
    if (ctx.error) return ctx.error

    const denied = assertOrgCapability(
      ctx.organization,
      ORG_CAPABILITIES.REQUEST_BLOOD,
      ctx.user
    )
    if (denied) return denied

    await connectDB()

    const destinations = await Organization.find({
      _id: { $ne: organizationId },
      type: { $in: ['blood_bank', 'transfusion_center'] },
      accountStatus: 'active',
      isActive: true,
    })
      .select('name type city state country')
      .sort({ name: 1 })
      .lean()

    const destinationIds = destinations.map((org) => org._id)
    const inventoryCounts = await BloodInventory.aggregate([
      {
        $match: {
          organizationId: { $in: destinationIds },
          status: 'available',
        },
      },
      {
        $group: {
          _id: {
            organizationId: '$organizationId',
            bloodType: '$bloodType',
          },
          count: { $sum: 1 },
        },
      },
    ])

    const inventoryByOrg = new Map()
    for (const row of inventoryCounts) {
      const orgId = String(row._id.organizationId)
      if (!inventoryByOrg.has(orgId)) inventoryByOrg.set(orgId, {})
      inventoryByOrg.get(orgId)[row._id.bloodType] = row.count
    }

    return NextResponse.json({
      success: true,
      data: {
        requester: {
          organizationId,
          organizationName: ctx.organization?.name || ctx.user?.organizationName,
          contactPerson: ctx.user?.fullName || '',
          contactPhone: ctx.organization?.phone || '',
          contactEmail: ctx.user?.email || ctx.organization?.email || '',
        },
        destinations: destinations.map((org) => ({
          id: org._id.toString(),
          name: org.name,
          type: org.type,
          city: org.city || '',
          state: org.state || '',
          country: org.country || '',
          inventoryByBloodType: inventoryByOrg.get(org._id.toString()) || {},
        })),
      },
    })
  } catch (error) {
    console.error('GET /api/requests/meta error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch request metadata' },
      { status: 500 }
    )
  }
}
