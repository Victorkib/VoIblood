/**
 * Notification Service
 * 
 * Handles all donor notifications via SMS and Email
 * Triggered on status changes, donations, and other events
 */

import { sendStatusSMS, isTwilioConfigured, isAfricasTalkingConfigured } from '@/lib/sms-service'
import { sendDonorStatusEmail, sendDonorThankYouEmail } from '@/lib/email-service'

/**
 * Send notification to donor when status changes
 * 
 * @param {Object} donor - Donor document
 * @param {Object} drive - DonationDrive document
 * @param {string} newStatus - New status value
 */
export async function sendDonorStatusNotification(donor, drive, newStatus) {
  const notifications = []

  switch (newStatus) {
    case 'confirmed':
      // Send confirmation SMS and Email
      const confirmSMS = await sendConfirmationSMS(donor, drive)
      const confirmEmail = await sendConfirmationEmail(donor, drive)
      notifications.push({ type: 'sms', status: confirmSMS.success ? 'sent' : 'failed' })
      notifications.push({ type: 'email', status: confirmEmail.success ? 'sent' : 'failed' })
      break

    case 'checked_in':
      // Send check-in acknowledgment SMS
      const checkinSMS = await sendCheckInSMS(donor, drive)
      notifications.push({ type: 'sms', status: checkinSMS.success ? 'sent' : 'failed' })
      break

    case 'completed':
      // Send thank you SMS and Email with next eligible date
      const thanksSMS = await sendThankYouSMS(donor, drive)
      const thanksEmail = await sendThankYouEmail(donor, drive)
      notifications.push({ type: 'sms', status: thanksSMS.success ? 'sent' : 'failed' })
      notifications.push({ type: 'email', status: thanksEmail.success ? 'sent' : 'failed' })
      break

    case 'no_show':
      // Send "we missed you" SMS
      const noShowSMS = await sendNoShowSMS(donor, drive)
      notifications.push({ type: 'sms', status: noShowSMS.success ? 'sent' : 'failed' })
      break

    case 'cancelled':
      // Send cancellation acknowledgment
      const cancelSMS = await sendCancellationSMS(donor, drive)
      notifications.push({ type: 'sms', status: cancelSMS.success ? 'sent' : 'failed' })
      break

    default:
      break
  }

  return {
    donorId: donor._id.toString(),
    status: newStatus,
    notifications,
  }
}

// ============================================
// SMS TEMPLATES & SENDING
// ============================================

/**
 * Send confirmation SMS when donor is confirmed
 */
async function sendConfirmationSMS(donor, drive) {
  const driveDate = new Date(drive.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const message = `Hi ${donor.firstName}! ✅ You're CONFIRMED for ${drive.name} on ${driveDate} at ${drive.startTime || 'TBD'}. Location: ${drive.location}. Arrive 15 mins early. Bring ID. Thank you for being a hero! 🩸`

  return await sendStatusSMS(donor.phone, message)
}

/**
 * Send check-in acknowledgment SMS
 */
async function sendCheckInSMS(donor, drive) {
  const message = `Hi ${donor.firstName}! 👋 Thanks for checking in at ${drive.name}! We'll notify you when it's your turn. Stay hydrated and thank you for saving lives! 🩸❤️`

  return await sendStatusSMS(donor.phone, message)
}

/**
 * Send thank you SMS after donation completion
 */
async function sendThankYouSMS(donor, drive) {
  // Calculate next eligible date
  const nextEligible = new Date()
  nextEligible.setDate(nextEligible.getDate() + 56)
  const nextDate = nextEligible.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const message = `🎉 AMAZING ${donor.firstName}! Your donation will save up to 3 lives! You're a true hero! Next eligible donation date: ${nextDate}. See you then! ❤️🩸`

  return await sendStatusSMS(donor.phone, message)
}

/**
 * Send "we missed you" SMS for no-shows
 */
async function sendNoShowSMS(donor, drive) {
  const message = `Hi ${donor.firstName}! We missed you at ${drive.name} today. 😔 No worries! You can re-register for our next drive. We'd still love to have you! 🩸❤️`

  return await sendStatusSMS(donor.phone, message)
}

/**
 * Send cancellation acknowledgment SMS
 */
async function sendCancellationSMS(donor, drive) {
  const message = `Hi ${donor.firstName}. Your registration for ${drive.name} has been cancelled. If this was a mistake, please contact the organizer. We hope to see you at our next drive! 🩸`

  return await sendStatusSMS(donor.phone, message)
}

// ============================================
// EMAIL TEMPLATES & SENDING
// ============================================

/**
 * Send confirmation email when donor is confirmed
 */
async function sendConfirmationEmail(donor, drive) {
  const driveDate = new Date(drive.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return await sendDonorStatusEmail({
    to: donor.email,
    donorName: `${donor.firstName} ${donor.lastName}`,
    subject: `✅ You're Confirmed - ${drive.name}`,
    status: 'confirmed',
    driveName: drive.name,
    driveDate,
    driveTime: drive.startTime || 'TBD',
    driveLocation: drive.location,
    driveAddress: drive.address,
    additionalInfo: 'Please arrive 15 minutes early. Bring a valid ID. Eat a healthy meal before donating and stay hydrated.',
  })
}

/**
 * Send thank you email after donation completion
 */
async function sendThankYouEmail(donor, drive) {
  const nextEligible = new Date()
  nextEligible.setDate(nextEligible.getDate() + 56)
  const nextDate = nextEligible.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return await sendDonorThankYouEmail({
    to: donor.email,
    donorName: `${donor.firstName} ${donor.lastName}`,
    subject: `🎉 Thank You Hero! - ${drive.name}`,
    driveName: drive.name,
    driveDate: new Date(drive.date).toLocaleDateString(),
    totalDonations: (donor.totalDonations || 0) + 1,
    nextEligibleDate: nextDate,
    impactMessage: 'Your generous donation will save up to 3 lives. You are a true hero!',
  })
}
