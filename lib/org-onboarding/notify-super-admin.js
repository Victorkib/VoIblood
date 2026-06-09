import User from '@/lib/models/User'
import { sendNewOrgRequestNotification } from '@/lib/org-request-emails'

/**
 * Notify platform super admins of a new create-org request (once).
 */
export async function notifySuperAdminsOfOrgRequest(orgRequest, applicant = {}) {
  if (!orgRequest || orgRequest.notificationSent) {
    return { sent: false, reason: 'already_sent_or_missing' }
  }

  const envEmails =
    process.env.PLATFORM_ADMIN_EMAIL ||
    process.env.SUPER_ADMIN_NOTIFICATION_EMAIL ||
    ''

  let recipients = envEmails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  if (recipients.length === 0) {
    const admins = await User.find({ role: 'super_admin', isActive: true })
      .select('email')
      .lean()
    recipients = admins.map((a) => a.email).filter(Boolean)
  }

  if (recipients.length === 0) {
    console.warn('[notifySuperAdminsOfOrgRequest] No super admin emails configured')
    return { sent: false, reason: 'no_recipients' }
  }

  const userName = applicant.fullName || applicant.email || orgRequest.userEmail || 'Applicant'
  const orgName = orgRequest.requestedOrgName || 'New organization'
  const orgType = orgRequest.requestedOrgType || 'blood_bank'

  for (const to of recipients) {
    try {
      await sendNewOrgRequestNotification({
        to,
        userName,
        orgName,
        orgType,
        requestId: orgRequest._id.toString(),
      })
    } catch (err) {
      console.warn('[notifySuperAdminsOfOrgRequest] Failed for', to, err.message)
    }
  }

  orgRequest.notificationSent = true
  await orgRequest.save()

  return { sent: true, recipients: recipients.length }
}
