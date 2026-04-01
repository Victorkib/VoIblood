/**
 * GET /api/admin/analytics/drives - Analytics for donation drives
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import DonationDrive from '@/lib/models/DonationDrive'
import Donor from '@/lib/models/Donor'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin, isOrgAdmin } from '@/lib/rbac'

/**
 * GET /api/admin/analytics/drives
 * Get comprehensive analytics for donation drives
 */
export async function GET(request) {
  try {
    await connectDB()

    // Verify authentication
    const user = await getCurrentUser(request.cookies)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only org_admin and super_admin can view analytics
    if (!isSuperAdmin(user.role) && !isOrgAdmin(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const driveId = searchParams.get('driveId')
    const dateRange = searchParams.get('range') || '30' // days

    // Build organization filter
    let orgFilter = {}
    if (!isSuperAdmin(user.role)) {
      orgFilter.organizationId = user.organizationId
    }

    // Date range filter
    const dateFilter = {}
    if (dateRange) {
      const days = parseInt(dateRange)
      dateFilter.date = { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
    }

    // Overall statistics
    const drives = await DonationDrive.find({ ...orgFilter, ...dateFilter }).lean()
    const totalDrives = drives.length
    const totalRegistrations = drives.reduce((sum, drive) => sum + drive.stats.registrations, 0)
    const totalClicks = drives.reduce((sum, drive) => sum + drive.stats.clicks, 0)
    const conversionRate = totalClicks > 0 ? ((totalRegistrations / totalClicks) * 100).toFixed(2) : 0

    // Drive performance
    const drivePerformance = drives.map(drive => ({
      id: drive._id.toString(),
      name: drive.name,
      date: drive.date,
      status: drive.status,
      registrations: drive.stats.registrations,
      clicks: drive.stats.clicks,
      targetDonors: drive.targetDonors,
      progress: drive.stats.registrations / drive.targetDonors * 100,
      conversionRate: drive.stats.clicks > 0 ? ((drive.stats.registrations / drive.stats.clicks) * 100).toFixed(2) : 0,
    }))

    // Registration trends (last 7 days)
    const registrationTrends = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const count = await Donor.countDocuments({
        ...orgFilter,
        registeredVia: 'drive',
        createdAt: { $gte: date, $lt: nextDate },
      })

      registrationTrends.push({
        date: date.toISOString().split('T')[0],
        count,
      })
    }

    // Blood type distribution
    const bloodTypeDistribution = await Donor.aggregate([
      { $match: { ...orgFilter, registeredVia: 'drive' } },
      { $group: { _id: '$bloodType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])

    // Demographics
    const genderDistribution = await Donor.aggregate([
      { $match: { ...orgFilter, registeredVia: 'drive' } },
      { $group: { _id: '$gender', count: { $sum: 1 } } },
    ])

    const ageGroups = await Donor.aggregate([
      { $match: { ...orgFilter, registeredVia: 'drive', dateOfBirth: { $exists: true } } },
      {
        $addFields: {
          age: {
            $subtract: [new Date().getFullYear(), { $year: '$dateOfBirth' }],
          },
        },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $lt: ['$age', 25] },
              '18-24',
              {
                $cond: [
                  { $lt: ['$age', 35] },
                  '25-34',
                  {
                    $cond: [
                      { $lt: ['$age', 45] },
                      '35-44',
                      {
                        $cond: [
                          { $lt: ['$age', 55] },
                          '45-54',
                          '55+',
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          count: { $sum: 1 },
        },
      },
    ])

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalDrives,
          totalRegistrations,
          totalClicks,
          conversionRate: parseFloat(conversionRate),
          averageRegistrationsPerDrive: totalDrives > 0 ? (totalRegistrations / totalDrives).toFixed(1) : 0,
        },
        drivePerformance,
        registrationTrends,
        bloodTypeDistribution,
        genderDistribution,
        ageGroups,
        topPerformingDrives: drivePerformance
          .sort((a, b) => b.registrations - a.registrations)
          .slice(0, 5),
        lowPerformingDrives: drivePerformance
          .sort((a, b) => a.progress - b.progress)
          .filter(d => d.progress < 50)
          .slice(0, 5),
      },
    })
  } catch (error) {
    console.error('GET /api/admin/analytics/drives error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
