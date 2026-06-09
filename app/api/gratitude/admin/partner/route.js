/**
 * PATCH /api/gratitude/admin/partner — super admin: enable Rewards Partner hospital.
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Organization from '@/lib/models/Organization'
import { jsonError, requireSuperAdmin } from '@/lib/gratitude-points/api-auth'
import { enterpriseIncludesRewardsPartner } from '@/lib/gratitude-points/hospital-access'

export async function PATCH(request) {
  try {
    await connectDB()

    const auth = await requireSuperAdmin(request.cookies)
    const err = jsonError(auth)
    if (err) return err

    const body = await request.json()
    const { organizationId, partnerActive, partnerOverride, partnerExpiresAt } = body

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 })
    }

    const org = await Organization.findById(organizationId)
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    if (org.type !== 'hospital') {
      return NextResponse.json(
        { error: 'Rewards Partner is only for hospital organizations' },
        { status: 400 }
      )
    }

    org.rewardsProgram = org.rewardsProgram || {}

    if (typeof partnerActive === 'boolean') {
      org.rewardsProgram.partnerActive = partnerActive
      if (partnerActive && !org.rewardsProgram.partnerSince) {
        org.rewardsProgram.partnerSince = new Date()
      }
    }

    if (typeof partnerOverride === 'boolean') {
      org.rewardsProgram.partnerOverride = partnerOverride
    }

    if (partnerExpiresAt !== undefined) {
      org.rewardsProgram.partnerExpiresAt = partnerExpiresAt ? new Date(partnerExpiresAt) : null
    }

    if (enterpriseIncludesRewardsPartner(org) && org.rewardsProgram.partnerActive) {
      org.rewardsProgram.partnerOverride = false
    }

    org.markModified('rewardsProgram')
    await org.save()

    return NextResponse.json({
      success: true,
      data: {
        organizationId: org._id.toString(),
        rewardsProgram: org.rewardsProgram,
        subscriptionPlan: org.subscriptionPlan,
      },
    })
  } catch (error) {
    console.error('PATCH gratitude partner error:', error)
    return NextResponse.json({ error: 'Failed to update partner status' }, { status: 500 })
  }
}
