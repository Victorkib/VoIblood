/**
 * GET /api/dashboard/stats
 * Organization-type-aware dashboard metrics
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Donor from '@/lib/models/Donor'
import BloodInventory from '@/lib/models/BloodInventory'
import Request from '@/lib/models/Request'
import Organization from '@/lib/models/Organization'
import DonationDrive from '@/lib/models/DonationDrive'

const ACTIVE_DONOR_STATUSES = ['registered', 'confirmed', 'checked_in', 'completed']

export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 })
    }

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const organization = await Organization.findById(organizationId)
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const orgType = organization.type || 'blood_bank'

    const orgDrives = await DonationDrive.find({ organizationId }).select(
      'registrationToken name date status'
    )
    const orgDriveTokens = orgDrives.map((d) => d.registrationToken).filter(Boolean)
    const donorVisibility = {
      $or: [{ organizationId }, { driveToken: { $in: orgDriveTokens } }],
    }

    const totalDonors = await Donor.countDocuments(donorVisibility)
    const availableDonors = await Donor.countDocuments({
      $and: [
        donorVisibility,
        {
          $or: [
            { status: { $in: ACTIVE_DONOR_STATUSES } },
            { status: { $exists: false } },
          ],
        },
      ],
    })

    const donationsThisMonth = await Donor.countDocuments({
      $and: [donorVisibility, { lastDonationDate: { $gte: monthStart } }],
    })

    let inventory = {
      totalUnits: 0,
      byBloodType: {},
      alerts: { expiring: 0, expired: 0 },
    }

    if (['blood_bank', 'hospital', 'transfusion_center'].includes(orgType)) {
      const totalUnitsInStock = await BloodInventory.countDocuments({
        organizationId,
        status: 'available',
      })

      const unitsByBloodType = await BloodInventory.aggregate([
        { $match: { organizationId, status: 'available' } },
        { $group: { _id: '$bloodType', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])

      const criticalExpiryDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
      const expiringUnits = await BloodInventory.countDocuments({
        organizationId,
        status: 'available',
        expiryDate: { $lte: criticalExpiryDate, $gt: now },
      })

      const expiredUnits = await BloodInventory.countDocuments({
        organizationId,
        status: 'available',
        expiryDate: { $lt: now },
      })

      inventory = {
        totalUnits: totalUnitsInStock,
        byBloodType: unitsByBloodType.reduce((acc, item) => {
          acc[item._id] = item.count
          return acc
        }, {}),
        alerts: { expiring: expiringUnits, expired: expiredUnits },
      }
    }

    const isHospital = orgType === 'hospital'
    const requestScope = isHospital
      ? { requestingOrganizationId: organizationId }
      : { sourceOrganizationId: organizationId }

    const pendingRequests = await Request.countDocuments({
      ...requestScope,
      status: 'pending',
    })

    const approvedRequests = await Request.countDocuments({
      ...requestScope,
      status: { $in: ['approved', 'partially_fulfilled'] },
    })

    const fulfilledThisMonth = await Request.countDocuments({
      ...requestScope,
      status: 'fulfilled',
      fulfilledDate: { $gte: monthStart },
    })

    const recentActivities = await Request.find(requestScope)
      .sort({ updatedAt: -1 })
      .limit(8)
      .select('requestId status patientName urgency updatedAt lastActivityDate')
      .lean()

    const requestsByBloodType = await Request.aggregate([
      { $match: { ...requestScope, status: { $ne: 'cancelled' } } },
      { $unwind: '$bloodRequirements' },
      {
        $group: {
          _id: '$bloodRequirements.bloodType',
          count: { $sum: '$bloodRequirements.quantity' },
        },
      },
      { $sort: { _id: 1 } },
    ])

    let drives = { active: 0, upcoming: [], daysUntilNext: null }
    if (orgType === 'ngo' || orgType === 'blood_bank') {
      const activeCount = await DonationDrive.countDocuments({
        organizationId,
        status: 'active',
      })
      const upcoming = await DonationDrive.find({
        organizationId,
        status: { $in: ['draft', 'active'] },
        date: { $gte: now },
      })
        .sort({ date: 1 })
        .limit(5)
        .select('name date status location')
        .lean()

      let daysUntilNext = null
      if (upcoming.length > 0) {
        const next = new Date(upcoming[0].date)
        daysUntilNext = Math.max(0, Math.ceil((next - now) / (24 * 60 * 60 * 1000)))
      }

      drives = {
        active: activeCount,
        upcoming,
        daysUntilNext,
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        organization: {
          id: organization._id.toString(),
          name: organization.name,
          type: orgType,
        },
        donors: {
          total: totalDonors,
          available: availableDonors,
          deferred: totalDonors - availableDonors,
        },
        inventory,
        requests: {
          pending: pendingRequests,
          approved: approvedRequests,
          fulfilledThisMonth,
          outgoingPending: isHospital ? pendingRequests : undefined,
          incomingPending: !isHospital ? pendingRequests : undefined,
          requestsByBloodType: requestsByBloodType.reduce((acc, item) => {
            acc[item._id] = item.count
            return acc
          }, {}),
        },
        drives,
        activities: {
          donationsThisMonth,
          recentRequests: recentActivities.map((r) => ({
            ...r,
            lastActivityDate: r.lastActivityDate || r.updatedAt,
          })),
        },
      },
    })
  } catch (error) {
    console.error('GET /api/dashboard/stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats', details: error.message },
      { status: 500 }
    )
  }
}
