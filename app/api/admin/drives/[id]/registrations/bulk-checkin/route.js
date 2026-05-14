/**
 * POST /api/admin/drives/[id]/registrations/bulk-checkin
 * Check in all participants who are registered or confirmed for this drive.
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin, isOrgAdmin } from '@/lib/rbac'
import DonationDrive from '@/lib/models/DonationDrive'
import DriveParticipant from '@/lib/models/DriveParticipant'
import Donor from '@/lib/models/Donor'
import {
  recountDriveParticipantStats,
  syncDonorWithParticipant,
} from '@/lib/drive-participant-helpers'

export async function POST(request, { params }) {
  try {
    await connectDB()

    const user = await getCurrentUser(request.cookies)
    if (!user || (!isSuperAdmin(user.role) && !isOrgAdmin(user.role))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id: driveId } = await params

    const drive = await DonationDrive.findById(driveId)
    if (!drive) {
      return NextResponse.json({ error: 'Drive not found' }, { status: 404 })
    }

    if (!isSuperAdmin(user.role) && drive.organizationId.toString() !== user.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const participants = await DriveParticipant.find({
      driveId: drive._id,
      status: { $in: ['registered', 'confirmed'] },
    }).populate('donorId')

    let checkedIn = 0
    for (const p of participants) {
      if (!p.donorId) continue
      p.status = 'checked_in'
      await p.save()
      const donor = await Donor.findById(p.donorId._id || p.donorId)
      if (donor) await syncDonorWithParticipant(donor, p, drive)
      checkedIn += 1
    }

    await recountDriveParticipantStats(drive._id)

    return NextResponse.json({
      success: true,
      message: 'Bulk check-in completed',
      checkedIn,
    })
  } catch (error) {
    console.error('POST bulk-checkin error:', error)
    return NextResponse.json({ error: 'Failed to check in donors' }, { status: 500 })
  }
}
