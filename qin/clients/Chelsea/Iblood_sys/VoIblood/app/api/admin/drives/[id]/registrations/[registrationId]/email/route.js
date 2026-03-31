/**
 * POST /api/admin/drives/[id]/registrations/[registrationId]/email
 * Send email to a specific donor
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { isSuperAdmin, isOrgAdmin } from '@/lib/rbac'
import DonationDrive from '@/lib/models/DonationDrive'
import Donor from '@/lib/models/Donor'
import { sendOTPViaEmail } from '@/lib/email-service'

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
    const { subject, message, template } = body

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

    // Use template or custom message
    let emailSubject = subject || 'Blood Donation Drive Reminder'
    let emailBody = message

    if (template === 'confirmation') {
      emailSubject = 'Registration Confirmed - Blood Donation Drive'
      emailBody = `Dear ${donor.firstName},\n\nYour registration for ${drive.name} has been confirmed!\n\nDrive Details:\n📅 Date: ${new Date(drive.date).toLocaleDateString()}\n🕐 Time: ${drive.startTime} - ${drive.endTime}\n📍 Location: ${drive.location}, ${drive.city}\n\nPlease arrive 15 minutes early. Don't forget to bring a valid ID.\n\nThank you for being a hero!\n\nBest regards,\nThe Blood Donation Team`
    } else if (template === 'reminder') {
      emailSubject = 'Reminder: Blood Donation Drive Tomorrow'
      emailBody = `Hi ${donor.firstName},\n\nThis is a friendly reminder about your blood donation appointment tomorrow!\n\nDrive Details:\n📅 Date: ${new Date(drive.date).toLocaleDateString()}\n🕐 Time: ${drive.startTime} - ${drive.endTime}\n📍 Location: ${drive.location}, ${drive.city}\n\nRemember to:\n✅ Get a good night's sleep\n✅ Eat a healthy breakfast\n✅ Drink plenty of water\n✅ Bring a valid ID\n\nSee you tomorrow!\n\nBest regards,\nThe Blood Donation Team`
    }

    // Send email
    const emailResult = await sendOTPViaEmail(donor.email, emailBody, emailSubject)

    if (emailResult.success) {
      // Log communication (would be implemented in a full system)
      console.log('[Email API] Email sent to:', donor.email, 'for drive:', drive.name)

      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
        data: {
          donorId: donor._id.toString(),
          email: donor.email,
          sentAt: new Date().toISOString(),
        },
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to send email', details: emailResult.error },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('POST /api/admin/drives/[id]/registrations/[id]/email error:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
