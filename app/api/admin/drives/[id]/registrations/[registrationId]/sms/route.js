/**
 * POST /api/admin/drives/[id]/registrations/[registrationId]/sms
 * Send SMS to a specific donor
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin, isOrgAdmin } from '@/lib/rbac'
import DonationDrive from '@/lib/models/DonationDrive'
import Donor from '@/lib/models/Donor'
import { sendOTPViaSMS, isTwilioConfigured } from '@/lib/sms-service'

export async function POST(request, { params }) {
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
    const body = await request.json()
    const { message, template } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
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

    // Find donor
    const donor = await Donor.findById(registrationId)
    if (!donor || donor.driveToken !== drive.registrationToken) {
      return NextResponse.json(
        { error: 'Donor not found' },
        { status: 404 }
      )
    }

    if (!isTwilioConfigured()) {
      // Log SMS for demo/testing
      console.log('\n[SMS FALLBACK] ========================================')
      console.log(`[SMS] To: ${donor.phone}`)
      console.log(`[SMS] Message: ${message}`)
      console.log('[SMS] ========================================\n')

      return NextResponse.json({
        success: true,
        message: 'SMS logged (Twilio not configured)',
        data: {
          donorId: donor._id.toString(),
          phone: donor.phone,
          message: message,
          sentAt: new Date().toISOString(),
          demo: true,
        },
      })
    }

    // Use template or custom message
    let smsBody = message

    if (template === 'confirmation') {
      smsBody = `Hi ${donor.firstName}! Your registration for ${drive.name} on ${new Date(drive.date).toLocaleDateString()} is confirmed. Arrive 15 min early. Bring ID. Thank you for being a hero!`
    } else if (template === 'reminder') {
      smsBody = `Hi ${donor.firstName}! Reminder: Blood donation tomorrow at ${drive.location} (${drive.startTime}). Sleep well, eat breakfast, drink water. See you there!`
    }

    // Send SMS
    const smsResult = await sendOTPViaSMS(donor.phone, smsBody)

    if (smsResult.success) {
      console.log('[SMS API] SMS sent to:', donor.phone, 'for drive:', drive.name)

      return NextResponse.json({
        success: true,
        message: 'SMS sent successfully',
        data: {
          donorId: donor._id.toString(),
          phone: donor.phone,
          sentAt: new Date().toISOString(),
        },
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to send SMS', details: smsResult.error },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('POST /api/admin/drives/[id]/registrations/[id]/sms error:', error)
    return NextResponse.json(
      { error: 'Failed to send SMS' },
      { status: 500 }
    )
  }
}
