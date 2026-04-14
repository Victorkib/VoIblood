/**
 * POST /api/admin/drives/[id]/registrations/[registrationId]/finalize-checkin
 * 
 * Finalizes donor check-in at a drive.
 * The donor already exists from registration - this just ensures they're
 * properly linked to the organization and marks them as checked_in.
 * 
 * This is called when admin marks a volunteer as "Checked In" at the drive.
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Donor from '@/lib/models/Donor'
import DonationDrive from '@/lib/models/DonationDrive'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin, isOrgAdmin } from '@/lib/rbac'

export async function POST(request, { params }) {
  try {
    await connectDB()

    // Unwrap params (Next.js 15+ requirement)
    const resolvedParams = await params
    const { id: driveId, registrationId } = resolvedParams

    // Get user from session
    const user = await getCurrentUser(request.cookies)
    if (!user || (!isSuperAdmin(user.role) && !isOrgAdmin(user.role))) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get the drive
    const drive = await DonationDrive.findById(driveId)
    if (!drive) {
      return NextResponse.json(
        { error: 'Drive not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (!isSuperAdmin(user.role) && drive.organizationId.toString() !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Find the donor registration
    const donor = await Donor.findById(registrationId)
    if (!donor) {
      return NextResponse.json(
        { error: 'Donor registration not found' },
        { status: 404 }
      )
    }

    // Verify donor belongs to this drive
    if (donor.driveToken !== drive.registrationToken) {
      return NextResponse.json(
        { error: 'Donor does not belong to this drive' },
        { status: 400 }
      )
    }

    // Update donor status to checked_in
    donor.status = 'checked_in'
    
    // Ensure organizationId is set (should already be from registration)
    if (!donor.organizationId) {
      donor.organizationId = drive.organizationId
    }

    // Ensure driveId is set
    if (!donor.driveId) {
      donor.driveId = drive._id
    }

    await donor.save()

    return NextResponse.json({
      success: true,
      message: 'Donor checked in successfully',
      data: {
        donorId: donor._id.toString(),
        status: donor.status,
        organizationId: donor.organizationId.toString(),
      },
    })
  } catch (error) {
    console.error('POST /api/admin/drives/[id]/registrations/[id]/finalize-checkin error:', error)
    return NextResponse.json(
      { error: 'Failed to finalize check-in' },
      { status: 500 }
    )
  }
}
