/**
 * GET  /api/admin/drives/[id]/outreach — outreach readiness + prior send counts
 * POST /api/admin/drives/[id]/outreach — run or retry donor outreach for this drive
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import DonationDrive from '@/lib/models/DonationDrive'
import Donor from '@/lib/models/Donor'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin, isOrgAdmin } from '@/lib/rbac'
import { getEmailServiceStatus } from '@/lib/email-service'
import { runDriveActivationOutreachJob } from '@/lib/drive-outreach'

async function assertDriveAdmin(user, drive) {
  if (!user || (!isSuperAdmin(user.role) && !isOrgAdmin(user.role))) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }
  if (!isSuperAdmin(user.role) && drive.organizationId.toString() !== user.organizationId) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }
  return null
}

export async function GET(request, { params }) {
  try {
    await connectDB()
    const { id } = await params
    const user = await getCurrentUser(request.cookies)
    const drive = await DonationDrive.findById(id).lean()
    if (!drive) {
      return NextResponse.json({ error: 'Drive not found' }, { status: 404 })
    }

    const denied = await assertDriveAdmin(user, drive)
    if (denied) return denied

    const [alreadyNotified, pendingDonors] = await Promise.all([
      Donor.countDocuments({
        organizationId: drive.organizationId,
        'driveOutreachHistory.driveId': drive._id,
      }),
      Donor.countDocuments({
        organizationId: drive.organizationId,
        $nor: [{ driveOutreachHistory: { $elemMatch: { driveId: drive._id } } }],
      }),
    ])

    const emailStatus = getEmailServiceStatus()

    return NextResponse.json({
      success: true,
      data: {
        driveId: drive._id.toString(),
        driveName: drive.name,
        driveStatus: drive.status,
        outreachEnabled: process.env.DRIVE_OUTREACH_ON_ACTIVATE !== 'false',
        email: emailStatus,
        donorsAlreadyNotified: alreadyNotified,
        donorsPendingOutreach: pendingDonors,
        registrationUrl: drive.registrationUrl,
      },
    })
  } catch (error) {
    console.error('GET outreach status error:', error)
    return NextResponse.json({ error: 'Failed to load outreach status' }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    await connectDB()
    const { id } = await params
    const user = await getCurrentUser(request.cookies)
    const drive = await DonationDrive.findById(id).lean()
    if (!drive) {
      return NextResponse.json({ error: 'Drive not found' }, { status: 404 })
    }

    const denied = await assertDriveAdmin(user, drive)
    if (denied) return denied

    if (process.env.DRIVE_OUTREACH_ON_ACTIVATE === 'false') {
      return NextResponse.json(
        { error: 'Drive outreach is disabled (DRIVE_OUTREACH_ON_ACTIVATE=false)' },
        { status: 400 }
      )
    }

    if (!drive.registrationUrl) {
      return NextResponse.json(
        { error: 'Drive has no registration URL. Activate the drive first.' },
        { status: 400 }
      )
    }

    const emailStatus = getEmailServiceStatus()
    if (!emailStatus.configured) {
      return NextResponse.json(
        {
          error:
            'Email is not configured. Set GMAIL_USER + GMAIL_APP_PASSWORD or Mailjet API keys.',
        },
        { status: 400 }
      )
    }

    const stats = await runDriveActivationOutreachJob(id)

    return NextResponse.json({
      success: true,
      message: 'Donor outreach completed',
      data: {
        email: emailStatus,
        stats: stats || null,
      },
    })
  } catch (error) {
    console.error('POST outreach error:', error)
    return NextResponse.json({ error: error.message || 'Outreach failed' }, { status: 500 })
  }
}
