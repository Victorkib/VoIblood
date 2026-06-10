/**
 * Helpers for drive participation (admin + public + RSVP).
 */

import mongoose from 'mongoose'
import DonationDrive from '@/lib/models/DonationDrive'
import Donor from '@/lib/models/Donor'
import DriveParticipant from '@/lib/models/DriveParticipant'

const DONOR_STATUS_SYNC = new Set([
  'registered',
  'confirmed',
  'checked_in',
  'completed',
  'no_show',
  'cancelled',
])

/**
 * Resolve admin "registrationId" to a participant on this drive.
 * Supports legacy URLs that still reference donor ObjectId.
 *
 * @param {import('mongoose').Document} drive Mongoose drive doc (not lean) for registrationToken
 * @param {string} registrationId
 * @returns {Promise<import('mongoose').Document|null>}
 */
export async function resolveParticipantForAdmin(drive, registrationId) {
  if (!mongoose.isValidObjectId(registrationId)) return null

  let participant = await DriveParticipant.findOne({
    _id: registrationId,
    driveId: drive._id,
  }).populate('donorId')

  if (participant) return participant

  const donor = await Donor.findById(registrationId)
  if (!donor) return null

  const onDrive =
    donor.driveToken === drive.registrationToken ||
    (donor.driveId && donor.driveId.toString() === drive._id.toString())

  if (!onDrive) return null

  const status = DONOR_STATUS_SYNC.has(donor.status) ? donor.status : 'registered'

  participant = await DriveParticipant.findOneAndUpdate(
    { driveId: drive._id, donorId: donor._id },
    {
      $setOnInsert: {
        source: donor.registrationType === 'walk_in' ? 'walk_in' : 'public',
        status,
      },
    },
    { upsert: true, returnDocument: 'after' }
  )
  participant = await DriveParticipant.findById(participant._id).populate('donorId')

  return participant
}

/**
 * Keep donor.driveId / driveToken roughly aligned with the drive the staff is managing
 * (single-screen ops). Skips donor.status for participant `declined`.
 */
export async function syncDonorWithParticipant(donor, participant, drive) {
  if (!donor || !participant || !drive) return
  if (participant.status === 'declined') {
    return
  }
  const donorId = donor._id ?? donor.id
  if (!donorId) return

  const updates = {
    driveId: drive._id,
    driveToken: drive.registrationToken,
  }
  if (DONOR_STATUS_SYNC.has(participant.status)) {
    updates.status = participant.status
  }
  // updateOne avoids instance middleware edge cases (Mongoose 9 + validate hooks).
  await Donor.updateOne({ _id: donorId }, { $set: updates })
}

/**
 * Recompute DonationDrive.stats from participants (single source of truth).
 */
export async function recountDriveParticipantStats(driveId) {
  const drive = await DonationDrive.findById(driveId)
  if (!drive) return

  const oid = new mongoose.Types.ObjectId(driveId)
  const agg = await DriveParticipant.aggregate([
    { $match: { driveId: oid } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ])
  const m = Object.fromEntries(agg.map((x) => [x._id, x.count]))

  const roleAgg = await DriveParticipant.aggregate([
    { $match: { driveId: oid } },
    { $group: { _id: '$participantRole', count: { $sum: 1 } } },
  ])
  const roleMap = Object.fromEntries(roleAgg.map((x) => [x._id || 'donor', x.count]))

  const declined = m.declined || 0
  const total = Object.values(m).reduce((a, b) => a + b, 0)
  const registrations = Math.max(0, total - declined)
  const confirmed =
    (m.confirmed || 0) + (m.checked_in || 0) + (m.completed || 0) + (m.no_show || 0) + (m.cancelled || 0)
  const completed = m.completed || 0
  const supporters = roleMap.supporter || 0

  if (!drive.stats) {
    drive.stats = { clicks: 0, registrations: 0, confirmed: 0, completed: 0, supporters: 0 }
  }
  drive.stats.registrations = registrations
  drive.stats.confirmed = confirmed
  drive.stats.completed = completed
  drive.stats.supporters = supporters
  await drive.save()
}

/**
 * If there are zero participants for a drive but legacy donors exist, backfill once.
 */
export async function backfillParticipantsFromLegacyDonors(drive) {
  const count = await DriveParticipant.countDocuments({ driveId: drive._id })
  if (count > 0) return

  const donors = await Donor.find({
    $or: [{ driveToken: drive.registrationToken }, { driveId: drive._id }],
  }).lean()

  for (const d of donors) {
    const status = DONOR_STATUS_SYNC.has(d.status) ? d.status : 'registered'
    const source = d.registrationType === 'walk_in' ? 'walk_in' : 'public'
    try {
      await DriveParticipant.create({
        driveId: drive._id,
        donorId: d._id,
        source,
        status,
        notes: d.notes || '',
      })
    } catch (e) {
      if (e?.code !== 11000) console.warn('[DriveParticipant] backfill skip:', e.message)
    }
  }

  if (donors.length) await recountDriveParticipantStats(drive._id)
}

/**
 * @param {import('mongoose').Types.ObjectId|string} driveId
 * @param {import('mongoose').Types.ObjectId|string} donorId
 * @param {object} opts
 * @param {'public'|'outreach'|'walk_in'|'admin'} opts.source
 * @param {string} opts.status
 */
export async function upsertParticipant(driveId, donorId, opts) {
  const { source, status, notes, participantRole, intendedDonationComponent } = opts
  const doc = await DriveParticipant.findOneAndUpdate(
    { driveId, donorId },
    {
      $set: {
        source,
        status,
        ...(notes !== undefined ? { notes } : {}),
        ...(participantRole ? { participantRole } : {}),
        ...(intendedDonationComponent ? { intendedDonationComponent } : {}),
      },
    },
    { upsert: true, returnDocument: 'after' }
  )
  await recountDriveParticipantStats(driveId)
  return doc
}
