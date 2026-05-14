/**
 * GET/PUT .../notes — drive-specific notes on DriveParticipant
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin, isOrgAdmin } from '@/lib/rbac'
import DonationDrive from '@/lib/models/DonationDrive'
import { resolveParticipantForAdmin } from '@/lib/drive-participant-helpers'

export async function PUT(request, { params }) {
  try {
    await connectDB()

    const user = await getCurrentUser(request.cookies)
    if (!user || (!isSuperAdmin(user.role) && !isOrgAdmin(user.role))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id: driveId, registrationId } = await params
    const body = await request.json()
    const { notes } = body

    if (notes === undefined) {
      return NextResponse.json({ error: 'Notes are required' }, { status: 400 })
    }

    const drive = await DonationDrive.findById(driveId)
    if (!drive) {
      return NextResponse.json({ error: 'Drive not found' }, { status: 404 })
    }

    if (!isSuperAdmin(user.role) && drive.organizationId.toString() !== user.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const participant = await resolveParticipantForAdmin(drive, registrationId)
    if (!participant) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    participant.notes = notes
    await participant.save()

    return NextResponse.json({
      success: true,
      message: 'Notes updated successfully',
      data: {
        participantId: participant._id.toString(),
        notes: participant.notes,
        updatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('PUT notes error:', error)
    return NextResponse.json({ error: 'Failed to update notes' }, { status: 500 })
  }
}

export async function GET(request, { params }) {
  try {
    await connectDB()

    const user = await getCurrentUser(request.cookies)
    if (!user || (!isSuperAdmin(user.role) && !isOrgAdmin(user.role))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id: driveId, registrationId } = await params

    const drive = await DonationDrive.findById(driveId)
    if (!drive) {
      return NextResponse.json({ error: 'Drive not found' }, { status: 404 })
    }

    if (!isSuperAdmin(user.role) && drive.organizationId.toString() !== user.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const participant = await resolveParticipantForAdmin(drive, registrationId)
    if (!participant) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        participantId: participant._id.toString(),
        notes: participant.notes || '',
      },
    })
  } catch (error) {
    console.error('GET notes error:', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}
