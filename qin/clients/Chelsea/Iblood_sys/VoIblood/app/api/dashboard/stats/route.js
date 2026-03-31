/**
 * GET /api/dashboard/stats
 * Aggregate statistics for dashboard overview
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Donor from '@/lib/models/Donor'
import BloodInventory from '@/lib/models/BloodInventory'
import Request from '@/lib/models/Request'
import Organization from '@/lib/models/Organization'

export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      )
    }

    const now = new Date()

    // Get organization info
    const organization = await Organization.findById(organizationId)
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Total donors
    const totalDonors = await Donor.countDocuments({
      organizationId,
      isActive: true,
    })

    // Available donors for donation
    const availableDonors = await Donor.countDocuments({
      organizationId,
      donationStatus: 'available',
      isActive: true,
    })

    // Total blood units in stock
    const totalUnitsInStock = await BloodInventory.countDocuments({
      organizationId,
      status: 'available',
    })

    // Blood units by type
    const unitsByBloodType = await BloodInventory.aggregate([
      { $match: { organizationId, status: 'available' } },
      { $group: { _id: '$bloodType', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])

    // Expiry alerts
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

    // Pending requests
    const pendingRequests = await Request.countDocuments({
      sourceOrganizationId: organizationId,
      status: 'pending',
    })

    // Approved but unfulfilled requests
    const approvedRequests = await Request.countDocuments({
      sourceOrganizationId: organizationId,
      status: { $in: ['approved', 'partially_fulfilled'] },
    })

    // Total requests fulfilled this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const fulfilledThisMonth = await Request.countDocuments({
      sourceOrganizationId: organizationId,
      status: 'fulfilled',
      fulfilledDate: { $gte: monthStart },
    })

    // Total donations this month
    const donationsThisMonth = await Donor.countDocuments({
      organizationId,
      lastDonationDate: { $gte: monthStart },
    })

    // Recent activities (last 10 requests)
    const recentActivities = await Request.find({
      sourceOrganizationId: organizationId,
    })
      .sort({ lastActivityDate: -1 })
      .limit(10)
      .select('requestId status patientName urgency lastActivityDate')

    // Blood type distribution for requests
    const requestsByBloodType = await Request.aggregate([
      { $match: { sourceOrganizationId: organizationId, status: { $ne: 'cancelled' } } },
      { $unwind: '$bloodRequirements' },
      {
        $group: {
          _id: '$bloodRequirements.bloodType',
          count: { $sum: '$bloodRequirements.quantity' },
        },
      },
      { $sort: { _id: 1 } },
    ])

    return NextResponse.json({
      success: true,
      data: {
        organization: {
          id: organization._id,
          name: organization.name,
          type: organization.type,
        },
        donors: {
          total: totalDonors,
          available: availableDonors,
          deferred: totalDonors - availableDonors,
        },
        inventory: {
          totalUnits: totalUnitsInStock,
          byBloodType: unitsByBloodType.reduce((acc, item) => {
            acc[item._id] = item.count
            return acc
          }, {}),
          alerts: {
            expiring: expiringUnits,
            expired: expiredUnits,
          },
        },
        requests: {
          pending: pendingRequests,
          approved: approvedRequests,
          fulfilledThisMonth,
          requestsByBloodType: requestsByBloodType.reduce((acc, item) => {
            acc[item._id] = item.count
            return acc
          }, {}),
        },
        activities: {
          donationsThisMonth,
          recentRequests: recentActivities,
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
