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

const OUTREACH_MAX_DONORS = 800
const OUTREACH_DELAY_MS = 80

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/**
 * Eligibility + copy blocks for outreach emails/SMS.
 * @param {import('mongoose').Types.ObjectId|string} organizationId
 */
export function getDonationEligibilitySummary(donor) {
  const first = (donor.firstName || '').trim() || 'there'
  const full = `${(donor.firstName || '').trim()} ${(donor.lastName || '').trim()}`.trim() || first

  if (donor.status === 'cancelled') {
    return {
      eligible: false,
      reasonCode: 'record_cancelled',
      donorFirstName: first,
      donorFullName: full,
      nextEligibleDisplay: null,
      supporterHeadline: 'Your donor profile is on hold — you can still save lives',
      supporterSubhead:
        'Our records show this profile as cancelled or deferred. That usually means you should speak with the donation center before attempting another donation.',
      medicalDisclaimer:
        'Safety rules protect both donors and patients. If you believe this status is wrong, contact your blood center directly.',
      /** @deprecated plain one-liner for SMS fallback */
      eligibilityNote:
        'Your donor record is marked cancelled or deferred. You can still help by inviting others to register for this drive.',
    }
  }
  if (!donor.nextEligibleDate) {
    return {
      eligible: true,
      reasonCode: 'eligible',
      donorFirstName: first,
      donorFullName: full,
      nextEligibleDisplay: null,
      supporterHeadline: null,
      supporterSubhead: null,
      medicalDisclaimer: null,
      eligibilityNote: null,
    }
  }
  const next = startOfDay(donor.nextEligibleDate)
  const today = startOfDay(new Date())
  if (next <= today) {
    return {
      eligible: true,
      reasonCode: 'eligible',
      donorFirstName: first,
      donorFullName: full,
      nextEligibleDisplay: null,
      supporterHeadline: null,
      supporterSubhead: null,
      medicalDisclaimer: null,
      eligibilityNote: null,
    }
  }
  const nextStr = new Date(donor.nextEligibleDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return {
    eligible: false,
    reasonCode: 'waiting_period',
    donorFirstName: first,
    donorFullName: full,
    nextEligibleDisplay: nextStr,
    supporterHeadline: 'Not quite time for your next whole-blood donation',
    supporterSubhead: `To keep donors safe, our records show your next eligible whole-blood donation date is ${nextStr}. Until then, please do not schedule a new whole-blood donation with us — but you can absolutely help fill this drive in other ways.`,
    medicalDisclaimer:
      'Typical whole-blood spacing follows blood-bank safety guidance (often about 8 weeks). Your center may adjust this after screening.',
    eligibilityNote: `Our records show your next eligible whole-blood donation date is ${nextStr}. You can still help by sharing this drive.`,
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
        'firstName lastName email phone phoneNormalized status nextEligibleDate driveToken'
      )
      .limit(OUTREACH_MAX_DONORS)
      .lean()

    console.log(
      `[drive-outreach] Drive "${drive.name}" (${driveId}): processing ${donors.length} donors`
    )

    let emailed = 0
    let smsed = 0
    let skipped = 0

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
      const eligibility = getDonationEligibilitySummary(donor)
      const { eligible } = eligibility

      let emailSentAt = null
      let smsSentAt = null

      try {
        if (eligible) {
          const { createDriveRsvpToken, buildRsvpUrl } = await import('@/lib/rsvp-jwt')
          const { upsertRsvpSmsLink } = await import('@/lib/rsvp-sms-link')
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          const rsvpToken = await createDriveRsvpToken(String(donor._id), String(drive._id))
          const rsvpUrl = buildRsvpUrl(rsvpToken, appUrl)
          let rsvpSmsUrl = rsvpUrl
          try {
            const short = await upsertRsvpSmsLink(String(donor._id), String(drive._id))
            rsvpSmsUrl = short.url
          } catch (e) {
            console.warn('[drive-outreach] Short RSVP link failed, using full URL in SMS:', e.message)
          }

          const emailPayload = {
            ...baseEmailFields,
            to: donor.email,
            donorName,
            donorFirstName: eligibility.donorFirstName,
            rsvpUrl,
          }
          if (isValidDonorEmail(donor.email)) {
            await sendDriveActivationEligibleOutreachEmail(emailPayload)
            emailSentAt = new Date()
            emailed += 1
          }

          if (donor.phone && process.env.SMS_ENABLED !== 'false') {
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
          }
        } else {
          const supporterBullets = [
            'Forward the public registration link to friends, teammates, or family who can donate.',
            'Invite first-time donors — many patients depend on people who have never given before.',
            'Ask three people you trust today — a quick call or text is often what fills a drive.',
          ]
          if (drive.whatsappGroupLink) {
            supporterBullets.push(
              'Ask people to join the WhatsApp group for updates — social proof helps drives fill faster.'
            )
          }
          if (isValidDonorEmail(donor.email)) {
            await sendDriveActivationSupporterOutreachEmail({
              ...baseEmailFields,
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
            emailSentAt = new Date()
            emailed += 1
          }

          if (donor.phone && process.env.SMS_ENABLED !== 'false') {
            const smsBody = buildDriveActivationSupporterSmsBody({
              donorFirstName: eligibility.donorFirstName,
              driveName: drive.name,
              registrationUrl: drive.registrationUrl,
              whatsappGroupLink: drive.whatsappGroupLink || '',
              nextEligibleDisplay: eligibility.nextEligibleDisplay,
              reasonCode: eligibility.reasonCode,
            })
            const smsResult = await sendStatusSMS(donor.phone, smsBody)
            if (smsResult.success) {
              smsSentAt = new Date()
              smsed += 1
            }
          }
        }

        if (emailSentAt || smsSentAt) {
          await appendOutreachHistory(donor._id, drive._id, eligible, emailSentAt, smsSentAt)
        }
      } catch (err) {
        console.error('[drive-outreach] Failed for donor', donor._id?.toString?.(), err.message)
      }

      await sleep(OUTREACH_DELAY_MS)
    }

    console.log(
      `[drive-outreach] Done drive "${drive.name}": emailed=${emailed}, sms=${smsed}, skipped_registered=${skipped}`
    )
  } catch (e) {
    console.error('[drive-outreach] Job failed:', e)
  }
}
