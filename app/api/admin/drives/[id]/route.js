/**
 * GET /api/admin/drives/[id] - Get drive details with registrations
 * PUT /api/admin/drives/[id] - Update drive
 * DELETE /api/admin/drives/[id] - Delete drive
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import DonationDrive from '@/lib/models/DonationDrive'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin, isOrgAdmin } from '@/lib/rbac'

/**
 * GET /api/admin/drives/[id]
 */
export async function GET(request, { params }) {
  try {
    await connectDB()
    const {id} = await params

    const user = await getCurrentUser(request.cookies)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get drive details
    const drive = await DonationDrive.findById(id)
      .populate('organizationId', 'name')
      .lean()

    if (!drive) {
      return NextResponse.json(
        { error: 'Drive not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (!isSuperAdmin(user.role)) {
      if (drive.organizationId._id.toString() !== user.organizationId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
    }

    const DriveParticipant = (await import('@/lib/models/DriveParticipant')).default
    const { backfillParticipantsFromLegacyDonors } = await import('@/lib/drive-participant-helpers')

    await backfillParticipantsFromLegacyDonors(drive)

    const participants = await DriveParticipant.find({ driveId: drive._id })
      .populate('donorId', 'firstName lastName email phone bloodType status registeredAt')
      .sort({ createdAt: -1 })
      .lean()

    const registrations = participants
      .filter((p) => p.donorId)
      .map((p) => {
        const d = p.donorId
        return {
          id: p._id.toString(),
          donorId: d._id.toString(),
          fullName: `${d.firstName} ${d.lastName}`,
          email: d.email,
          phone: d.phone,
          bloodType: d.bloodType,
          status: p.status,
          source: p.source,
          registeredAt: p.createdAt || d.registeredAt,
          notes: p.notes || '',
        }
      })

    console.log('[Drive API] Participants for drive', drive.name, ':', registrations.length)

    // Return drive details with registrations
    return NextResponse.json({
      success: true,
      data: {
        id: drive._id.toString(),
        name: drive.name,
        description: drive.description,
        date: drive.date,
        startTime: drive.startTime,
        endTime: drive.endTime,
        location: drive.location,
        address: drive.address,
        city: drive.city,
        targetDonors: drive.targetDonors,
        whatsappGroupLink: drive.whatsappGroupLink,
        registrationToken: drive.registrationToken,
        registrationUrl: drive.registrationUrl,
        isActive: drive.isActive,
        status: drive.status,
        stats: drive.stats,
        organization: drive.organizationId,
        registrations,
      },
    })
  } catch (error) {
    console.error('GET /api/admin/drives/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch drive details' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/drives/[id]
 * Update drive or perform actions (activate/deactivate)
 */
export async function PUT(request, { params }) {
  try {
    await connectDB()

    const {id} = await params
    const user = await getCurrentUser(request.cookies)
    if (!user || (!isSuperAdmin(user.role) && !isOrgAdmin(user.role))) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const drive = await DonationDrive.findById(id)

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

    // Handle actions
    if (body.action) {
      if (body.action === 'activate') {
        // Generate registration token if not exists
        if (!drive.registrationToken) {
          const crypto = require('crypto')
          drive.registrationToken = crypto.randomBytes(16).toString('hex')
        }
        
        // Generate registration URL
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        drive.registrationUrl = `${appUrl}/register/${drive.registrationToken}`
        
        // Set status to active
        drive.status = 'active'
        drive.isActive = true
        
        console.log('[Drive API] Activated drive:', drive._id, 'Token:', drive.registrationToken)
      } 
      else if (body.action === 'deactivate') {
        // Set status to completed (not deleting, just marking as done)
        drive.status = 'completed'
        drive.isActive = false
        
        console.log('[Drive API] Deactivated drive:', drive._id)
      }
      
      await drive.save()

      if (body.action === 'activate' && process.env.DRIVE_OUTREACH_ON_ACTIVATE !== 'false') {
        const { after } = await import('next/server')
        const idStr = drive._id.toString()
        after(async () => {
          const { runDriveActivationOutreachJob } = await import('@/lib/drive-outreach')
          await runDriveActivationOutreachJob(idStr)
        })
      }
      
      return NextResponse.json({
        success: true,
        message: body.action === 'activate' ? 'Drive activated successfully' : 'Drive deactivated successfully',
        data: {
          id: drive._id.toString(),
          name: drive.name,
          description: drive.description,
          date: drive.date,
          startTime: drive.startTime,
          endTime: drive.endTime,
          location: drive.location,
          address: drive.address,
          city: drive.city,
          targetDonors: drive.targetDonors,
          whatsappGroupLink: drive.whatsappGroupLink || '',
          status: drive.status,
          isActive: drive.isActive,
          registrationToken: drive.registrationToken,
          registrationUrl: drive.registrationUrl,
          stats: drive.stats,
          outreachScheduled:
            body.action === 'activate' && process.env.DRIVE_OUTREACH_ON_ACTIVATE !== 'false',
        },
      })
    }

    // Regular update (no action)
    const updatableFields = [
      'name', 'description', 'date', 'startTime', 'endTime',
      'location', 'address', 'city', 'targetDonors',
      'whatsappGroupLink', 'registrationDeadline', 'status', 'isActive',
    ]

    updatableFields.forEach(field => {
      if (body[field] !== undefined) {
        drive[field] = body[field]
      }
    })

    await drive.save()

    return NextResponse.json({
      success: true,
      message: 'Drive updated successfully',
      data: {
        id: drive._id.toString(),
        name: drive.name,
        status: drive.status,
      },
    })
  } catch (error) {
    console.error('PUT /api/admin/drives/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update drive' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/drives/[id]
 */
export async function DELETE(request, { params }) {
  try {
    await connectDB()

    const {id} = await params
    const user = await getCurrentUser(request.cookies)
    if (!user || (!isSuperAdmin(user.role) && !isOrgAdmin(user.role))) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const drive = await DonationDrive.findById(id)

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

    const DriveParticipant = (await import('@/lib/models/DriveParticipant')).default
    await DriveParticipant.deleteMany({ driveId: id })

    const RsvpSmsLink = (await import('@/lib/models/RsvpSmsLink')).default
    await RsvpSmsLink.deleteMany({ driveId: id })

    await DonationDrive.deleteOne({ _id: id })

    return NextResponse.json({
      success: true,
      message: 'Drive deleted successfully',
    })
  } catch (error) {
    console.error('DELETE /api/admin/drives/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete drive' },
      { status: 500 }
    )
  }
}
