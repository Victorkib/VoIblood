/**
 * POST /api/admin/migrate/donor-organization-ids
 * 
 * ONE-TIME MIGRATION: Backfills organizationId and driveId for existing donors
 * that were created before the schema update.
 * 
 * This ensures all drive registrants appear in the organization's donor list.
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Donor from '@/lib/models/Donor'
import DonationDrive from '@/lib/models/DonationDrive'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin } from '@/lib/rbac'

export async function POST(request) {
  try {
    await connectDB()

    const user = await getCurrentUser(request.cookies)
    if (!user || !isSuperAdmin(user.role)) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    // Find donors missing organizationId
    const donorsWithoutOrg = await Donor.find({
      organizationId: { $exists: false },
    })

    if (donorsWithoutOrg.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All donors already have organizationId. No migration needed.',
        updated: 0,
      })
    }

    let updatedCount = 0
    const errors = []

    for (const donor of donorsWithoutOrg) {
      try {
        // Find the drive using driveToken
        const drive = await DonationDrive.findOne({
          registrationToken: donor.driveToken,
        })

        if (drive) {
          donor.organizationId = drive.organizationId
          donor.driveId = drive._id
          await donor.save()
          updatedCount++
        } else {
          errors.push({
            donorId: donor._id.toString(),
            email: donor.email,
            error: 'Drive not found for driveToken',
          })
        }
      } catch (err) {
        errors.push({
          donorId: donor._id.toString(),
          email: donor.email,
          error: err.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration completed. Updated ${updatedCount} donors.`,
      updated: updatedCount,
      totalProcessed: donorsWithoutOrg.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: 'Migration failed' },
      { status: 500 }
    )
  }
}
