/**
 * POST /api/admin/drives/[id]/registrations/[registrationId]/record-donation
 * 
 * Records a blood donation for a checked-in donor.
 * This:
 * 1. Updates donor status to 'completed'
 * 2. Creates blood inventory record
 * 3. Updates donor stats (totalDonations, lastDonationDate, nextEligibleDate)
 * 4. Sends thank you notification
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin, isOrgAdmin } from '@/lib/rbac'
import DonationDrive from '@/lib/models/DonationDrive'
import Donor from '@/lib/models/Donor'
import BloodInventory from '@/lib/models/BloodInventory'
import { sendDonorStatusNotification } from '@/lib/notification-service'

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

    // Get request body
    const body = await request.json()
    const {
      volume = 450, // Default 450ml for whole blood
      component = 'whole_blood',
      technician = '',
      notes = '',
      sendNotification = true,
    } = body

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

    // Find the donor
    const donor = await Donor.findById(registrationId)
    if (!donor) {
      return NextResponse.json(
        { error: 'Donor not found' },
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

    // Verify donor is checked in
    if (donor.status !== 'checked_in') {
      return NextResponse.json(
        { error: 'Donor must be checked in before recording donation' },
        { status: 400 }
      )
    }

    // Generate unit ID for blood inventory
    const unitId = `UNIT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // Calculate expiry date (35 days from now for whole blood)
    const collectionDate = new Date()
    const expiryDate = new Date(collectionDate)
    expiryDate.setDate(expiryDate.getDate() + 35)

    // Create blood inventory record
    const bloodUnit = await BloodInventory.create({
      organizationId: drive.organizationId,
      unitId,
      bloodType: donor.bloodType,
      component,
      volume,
      donorId: donor._id,
      donorName: `${donor.firstName} ${donor.lastName}`,
      donorEmail: donor.email,
      collectionDate,
      collectionFacility: drive.location,
      technician,
      expiryDate,
      status: 'available',
      driveId: drive._id,
      driveName: drive.name,
      notes,
    })

    // Update donor record manually (works even if model cache isn't refreshed)
    const today = new Date()
    const nextEligible = new Date(today)
    nextEligible.setDate(nextEligible.getDate() + 56)

    donor.status = 'completed'
    donor.lastDonationDate = today
    donor.totalDonations = (donor.totalDonations || 0) + 1
    donor.nextEligibleDate = nextEligible

    // Add to donation history
    if (!donor.donationHistory) donor.donationHistory = []
    donor.donationHistory.push({
      date: today,
      driveId: drive._id,
      driveName: drive.name,
      volume,
      bloodType: donor.bloodType,
      unitId: bloodUnit.unitId,
      notes,
    })

    await donor.save()

    // Update drive stats
    if (!drive.stats) {
      drive.stats = { clicks: 0, registrations: 0, confirmed: 0, completed: 0 }
    }
    drive.stats.completed = (drive.stats.completed || 0) + 1
    await drive.save()

    // Send thank you notification
    if (sendNotification) {
      try {
        await sendDonorStatusNotification(donor, drive, 'completed')
      } catch (notifErr) {
        console.warn('[Record Donation] Failed to send notification:', notifErr.message)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Donation recorded successfully',
      data: {
        donorId: donor._id.toString(),
        donorName: `${donor.firstName} ${donor.lastName}`,
        unitId: bloodUnit.unitId,
        bloodType: donor.bloodType,
        volume,
        totalDonations: donor.totalDonations,
        nextEligibleDate: donor.nextEligibleDate,
        notificationSent: sendNotification,
      },
    })
  } catch (error) {
    console.error('POST /api/admin/drives/[id]/registrations/[id]/record-donation error:', error)
    return NextResponse.json(
      { error: 'Failed to record donation' },
      { status: 500 }
    )
  }
}
