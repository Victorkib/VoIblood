/**
 * When a drive is activated, optionally notify existing org donors (email + SMS rules below).
 */

import { connectDB } from '@/lib/db'
import DonationDrive from '@/lib/models/DonationDrive'
import Donor from '@/lib/models/Donor'
import Organization from '@/lib/models/Organization'
import {
  buildDriveActivationEligibleOutreachContent,
  buildDriveActivationSupporterSmsBody,
  sendDriveActivationEligibleOutreachEmail,
  sendDriveActivationSupporterOutreachEmail,
} from '@/lib/email-service'
import { sendStatusSMS } from '@/lib/sms-service'
import { isValidDonorEmail } from '@/lib/donor-dedupe'
import {
  checkDonationEligibility,
  isEligibleForAnyComponent,
} from '@/lib/donation-eligibility'
import { getAppUrl } from '@/lib/app-url'
import { getEmailServiceStatus } from '@/lib/email-service'

const OUTREACH_MAX_DONORS = 800
const OUTREACH_DELAY_MS = 80

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Eligibility + copy blocks for outreach emails/SMS.
 */
function appendSupporterModeParam(registrationUrl) {
  if (!registrationUrl) return ''
  try {
    const url = new URL(registrationUrl)
    url.searchParams.set('mode', 'supporter')
    return url.toString()
  } catch {
    const sep = registrationUrl.includes('?') ? '&' : '?'
    return `${registrationUrl}${sep}mode=supporter`
  }
}

export function getDonationEligibilitySummary(donor, driveDate = new Date()) {
  const first = (donor.firstName || '').trim() || 'there'
  const full = `${(donor.firstName || '').trim()} ${(donor.lastName || '').trim()}`.trim() || first

  const eligibilityOpts = {
    lastDonationDate: donor?.lastDonationDate,
    nextEligibleDate: donor?.nextEligibleDate,
    driveDate,
    donorStatus: donor?.status,
  }

  const wholeBlood = checkDonationEligibility({ ...eligibilityOpts, component: 'whole_blood' })

  if (wholeBlood.reasonCode === 'record_cancelled') {
    const core = wholeBlood
    return {
      ...core,
      eligible: false,
      donorFirstName: first,
      donorFullName: full,
      supporterHeadline: 'Your donor profile is on hold — you can still save lives',
      supporterSubhead:
        'Our records show this profile as cancelled or deferred. That usually means you should speak with the donation center before attempting another donation.',
      medicalDisclaimer:
        'Safety rules protect both donors and patients. If you believe this status is wrong, contact your blood center directly.',
      eligibilityNote:
        'Your donor record is marked cancelled or deferred. You can still help by inviting others to register for this drive.',
    }
  }

  const eligible = isEligibleForAnyComponent(eligibilityOpts)

  if (eligible) {
    return {
      ...wholeBlood,
      eligible: true,
      reasonCode: 'eligible',
      donorFirstName: first,
      donorFullName: full,
      supporterHeadline: null,
      supporterSubhead: null,
      medicalDisclaimer: null,
      eligibilityNote: null,
    }
  }

  const nextStr = wholeBlood.nextEligibleDisplay
  return {
    ...wholeBlood,
    eligible: false,
    donorFirstName: first,
    donorFullName: full,
    supporterHeadline: 'Not quite time for your next whole-blood donation',
    supporterSubhead: nextStr
      ? `To keep donors safe, your next eligible whole-blood donation date is ${nextStr}. You may still be eligible for platelets or plasma sooner — check the registration page. Until then, register as a drive supporter and help fill this drive by sharing the link.`
      : 'You cannot donate at this drive based on our records. You can still register as a drive supporter and help fill this drive by sharing the registration link with eligible friends and family.',
    medicalDisclaimer:
      'Spacing rules: whole blood ~8 weeks, platelets ~2 weeks, plasma ~4 weeks. Your center may adjust after screening.',
    eligibilityNote: nextStr
      ? `Our records show your next eligible whole-blood donation date is ${nextStr}. Register as a supporter or share this drive with eligible friends.`
      : 'Register as a supporter or share this drive with eligible friends and family.',
  }
}

/**
 * Skip if donor is already on this drive roster (participant row or legacy driveToken match).
 */
async function shouldSkipDonorAlreadyOnDriveRoster(donor, drive) {
  const DriveParticipant = (await import('@/lib/models/DriveParticipant')).default
  const existing = await DriveParticipant.findOne({
    donorId: donor._id,
    driveId: drive._id,
    status: { $in: ['registered', 'confirmed', 'checked_in', 'completed'] },
  })
    .select('_id')
    .lean()
  if (existing) return true
  if (!drive.registrationToken || donor.driveToken !== drive.registrationToken) return false
  return donor.status === 'registered' || donor.status === 'confirmed'
}

/**
 * Personalized RSVP links for eligible donors. Never throws — falls back to registrationUrl.
 * @returns {Promise<{ rsvpUrl: string | null, rsvpSmsUrl: string }>}
 */
async function resolveEligibleRsvpLinks(donorId, driveId, registrationUrl) {
  const fallback = { rsvpUrl: null, rsvpSmsUrl: registrationUrl }

  try {
    const { createDriveRsvpToken, buildRsvpUrl } = await import('@/lib/rsvp-jwt')
    const appUrl = getAppUrl()

    let rsvpUrl = null
    try {
      const rsvpToken = await createDriveRsvpToken(donorId, driveId)
      rsvpUrl = buildRsvpUrl(rsvpToken, appUrl)
    } catch (e) {
      console.warn(
        '[drive-outreach] RSVP unavailable, sending eligible email with registration link:',
        e.message
      )
      return fallback
    }

    let rsvpSmsUrl = rsvpUrl
    try {
      const { upsertRsvpSmsLink } = await import('@/lib/rsvp-sms-link')
      const short = await upsertRsvpSmsLink(donorId, driveId)
      rsvpSmsUrl = short.url
    } catch (e) {
      console.warn('[drive-outreach] Short RSVP link failed, using full URL in SMS:', e.message)
    }

    return { rsvpUrl, rsvpSmsUrl }
  } catch (e) {
    console.warn(
      '[drive-outreach] RSVP unavailable, sending eligible email with registration link:',
      e.message
    )
    return fallback
  }
}

async function appendOutreachHistory(donorId, driveId, eligibleVariant, emailSentAt, smsSentAt) {
  await Donor.updateOne(
    { _id: donorId },
    {
      $push: {
        driveOutreachHistory: {
          driveId,
          eligibleVariant,
          emailSentAt: emailSentAt || undefined,
          smsSentAt: smsSentAt || undefined,
          createdAt: new Date(),
        },
      },
    }
  )
}

/**
 * Background job: notify org donors after a drive is activated.
 * @param {string} driveId
 */
export async function runDriveActivationOutreachJob(driveId) {
  if (process.env.DRIVE_OUTREACH_ON_ACTIVATE === 'false') {
    console.log('[drive-outreach] Skipped (DRIVE_OUTREACH_ON_ACTIVATE=false)')
    return
  }

  try {
    await connectDB()
    const drive = await DonationDrive.findById(driveId).lean()
    if (!drive || !drive.registrationUrl) {
      console.warn('[drive-outreach] Drive missing or no registrationUrl:', driveId)
      return
    }

    const org = await Organization.findById(drive.organizationId).select('name').lean()
    const organizationName = org?.name || ''

    const donors = await Donor.find({
      organizationId: drive.organizationId,
      $nor: [{ driveOutreachHistory: { $elemMatch: { driveId: drive._id } } }],
    })
      .select(
        'firstName lastName email phone phoneNormalized status lastDonationDate nextEligibleDate driveToken'
      )
      .limit(OUTREACH_MAX_DONORS)
      .lean()

    const emailStatus = getEmailServiceStatus()
    if (!emailStatus.configured) {
      console.error(
        '[drive-outreach] No email provider configured (set GMAIL_USER + GMAIL_APP_PASSWORD or Mailjet keys)'
      )
      return
    }

    console.log(
      `[drive-outreach] Drive "${drive.name}" (${driveId}): processing ${donors.length} donors (email: ${emailStatus.primary})`
    )

    let emailed = 0
    let eligibleEmailed = 0
    let supporterEmailed = 0
    let smsed = 0
    let skipped = 0
    let emailFailed = 0

    const baseEmailFields = {
      driveName: drive.name,
      driveDate: drive.date,
      driveTime: [drive.startTime, drive.endTime].filter(Boolean).join(' – '),
      location: drive.location,
      city: drive.city,
      registrationUrl: drive.registrationUrl,
      whatsappGroupLink: drive.whatsappGroupLink || '',
      organizationName,
    }

    for (const donor of donors) {
      if (await shouldSkipDonorAlreadyOnDriveRoster(donor, drive)) {
        skipped += 1
        continue
      }

      const donorName = `${donor.firstName} ${donor.lastName}`.trim()
      const eligibility = getDonationEligibilitySummary(donor, drive.date)
      const { eligible } = eligibility

      let emailSentAt = null
      let smsSentAt = null

      if (eligible) {
        const { rsvpUrl, rsvpSmsUrl } = await resolveEligibleRsvpLinks(
          String(donor._id),
          String(drive._id),
          drive.registrationUrl
        )

        const emailPayload = {
          ...baseEmailFields,
          to: donor.email,
          donorName,
          donorFirstName: eligibility.donorFirstName,
          rsvpUrl,
        }

        if (isValidDonorEmail(donor.email)) {
          try {
            const result = await sendDriveActivationEligibleOutreachEmail(emailPayload)
            if (result?.success) {
              emailSentAt = new Date()
              emailed += 1
              eligibleEmailed += 1
            }
          } catch (err) {
            emailFailed += 1
            console.error(
              '[drive-outreach] Eligible email failed for donor',
              donor._id?.toString?.(),
              err.message
            )
          }
        }

        if (donor.phone && process.env.SMS_ENABLED !== 'false') {
          try {
            const { smsBody } = buildDriveActivationEligibleOutreachContent({
              ...baseEmailFields,
              donorName,
              donorFirstName: eligibility.donorFirstName,
              rsvpUrl,
              rsvpSmsUrl,
            })
            const smsResult = await sendStatusSMS(donor.phone, smsBody)
            if (smsResult.success) {
              smsSentAt = new Date()
              smsed += 1
            }
          } catch (err) {
            console.error(
              '[drive-outreach] Eligible SMS failed for donor',
              donor._id?.toString?.(),
              err.message
            )
          }
        }
      } else {
        const supporterRegistrationUrl = appendSupporterModeParam(drive.registrationUrl)
        const supporterBullets = [
          'Forward the public registration link to friends, teammates, or family who can donate.',
          'Register as a drive supporter — we will know you are helping spread the word even if you cannot donate yet.',
          'Invite first-time donors — many patients depend on people who have never given before.',
          'Ask three people you trust today — a quick call or text is often what fills a drive.',
        ]
        if (drive.whatsappGroupLink) {
          supporterBullets.push(
            'Ask people to join the WhatsApp group for updates — social proof helps drives fill faster.'
          )
        }

        if (isValidDonorEmail(donor.email)) {
          try {
            const result = await sendDriveActivationSupporterOutreachEmail({
              ...baseEmailFields,
              registrationUrl: supporterRegistrationUrl || drive.registrationUrl,
              publicRegistrationUrl: drive.registrationUrl,
              to: donor.email,
              donorName,
              donorFirstName: eligibility.donorFirstName,
              supporterHeadline: eligibility.supporterHeadline,
              supporterSubhead: eligibility.supporterSubhead,
              supporterBullets,
              nextEligibleDisplay: eligibility.nextEligibleDisplay,
              medicalDisclaimer: eligibility.medicalDisclaimer,
              reasonCode: eligibility.reasonCode,
            })
            if (result?.success) {
              emailSentAt = new Date()
              emailed += 1
              supporterEmailed += 1
            }
          } catch (err) {
            emailFailed += 1
            console.error(
              '[drive-outreach] Supporter email failed for donor',
              donor._id?.toString?.(),
              err.message
            )
          }
        }

        if (donor.phone && process.env.SMS_ENABLED !== 'false') {
          try {
            const smsBody = buildDriveActivationSupporterSmsBody({
              donorFirstName: eligibility.donorFirstName,
              driveName: drive.name,
              registrationUrl: supporterRegistrationUrl || drive.registrationUrl,
              whatsappGroupLink: drive.whatsappGroupLink || '',
              nextEligibleDisplay: eligibility.nextEligibleDisplay,
              reasonCode: eligibility.reasonCode,
            })
            const smsResult = await sendStatusSMS(donor.phone, smsBody)
            if (smsResult.success) {
              smsSentAt = new Date()
              smsed += 1
            }
          } catch (err) {
            console.error(
              '[drive-outreach] Supporter SMS failed for donor',
              donor._id?.toString?.(),
              err.message
            )
          }
        }
      }

      if (emailSentAt || smsSentAt) {
        try {
          await appendOutreachHistory(donor._id, drive._id, eligible, emailSentAt, smsSentAt)
        } catch (err) {
          console.error(
            '[drive-outreach] Outreach history update failed for donor',
            donor._id?.toString?.(),
            err.message
          )
        }
      }

      await sleep(OUTREACH_DELAY_MS)
    }

    console.log(
      `[drive-outreach] Done drive "${drive.name}": emailed=${emailed} (eligible=${eligibleEmailed}, supporter=${supporterEmailed}), sms=${smsed}, skipped_registered=${skipped}, email_failed=${emailFailed}`
    )

    return {
      driveId,
      donorsProcessed: donors.length,
      emailed,
      eligibleEmailed,
      supporterEmailed,
      smsed,
      skipped,
      emailFailed,
    }
  } catch (e) {
    console.error('[drive-outreach] Job failed:', e)
  }
}
