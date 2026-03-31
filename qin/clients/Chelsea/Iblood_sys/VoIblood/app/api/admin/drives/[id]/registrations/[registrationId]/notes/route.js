/**
 * PUT /api/admin/drives/[id]/registrations/[registrationId]/notes
 * Update donor notes
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin, isOrgAdmin } from '@/lib/rbac'
import DonationDrive from '@/lib/models/DonationDrive'
import Donor from '@/lib/models/Donor'

export async function PUT(request, { params }) {
  try {
    await connectDB()

    const user = await getCurrentUser(request.cookies)
    if (!user || (!isSuperAdmin(user.role) && !isOrgAdmin(user.role))) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Unwrap params Promise (Next.js 15 requirement)
    const { id:driveId, registrationId } = await params
    const body = await request.json()
    const { notes } = body

    if (notes === undefined) {
      return NextResponse.json(
        { error: 'Notes are required' },
        { status: 400 }
      )
    }

    // Get drive and check permissions
    const drive = await DonationDrive.findById(driveId)
    if (!drive) {
      return NextResponse.json(
        { error: 'Drive not found' },
        { status: 404 }
      )
    }

    if (!isSuperAdmin(user.role) && drive.organizationId.toString() !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Find and update donor notes
    const donor = await Donor.findById(registrationId)
    if (!donor || donor.driveToken !== drive.registrationToken) {
      return NextResponse.json(
        { error: 'Donor not found' },
        { status: 404 }
      )
    }

    // Update notes
    donor.notes = notes
    donor.medicalConditions = notes // Also store in medicalConditions for consistency
    await donor.save()

    console.log('[Notes API] Updated notes for donor:', donor._id, 'drive:', drive.name)

    return NextResponse.json({
      success: true,
      message: 'Notes updated successfully',
      data: {
        donorId: donor._id.toString(),
        notes: donor.notes,
        updatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('PUT /api/admin/drives/[id]/registrations/[registrationId]/notes error:', error)
    return NextResponse.json(
      { error: 'Failed to update notes' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/drives/[id]/registrations/[registrationId]/notes
 * Get donor notes
 */
export async function GET(request, { params }) {
  try {
    await connectDB()

    const user = await getCurrentUser(request.cookies)
    if (!user || (!isSuperAdmin(user.role) && !isOrgAdmin(user.role))) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Unwrap params Promise (Next.js 15 requirement)
    const { id: driveId, registrationId } = await params

    // Get drive and check permissions
    const drive = await DonationDrive.findById(driveId)
    if (!drive) {
      return NextResponse.json(
        { error: 'Drive not found' },
        { status: 404 }
      )
    }

    if (!isSuperAdmin(user.role) && drive.organizationId.toString() !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Find donor
    const donor = await Donor.findById(registrationId)
    if (!donor || donor.driveToken !== drive.registrationToken) {
      return NextResponse.json(
        { error: 'Donor not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        donorId: donor._id.toString(),
        notes: donor.notes || '',
      },
    })
  } catch (error) {
    console.error('GET /api/admin/drives/[id]/registrations/[registrationId]/notes error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    )
  }
}
