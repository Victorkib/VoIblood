/**
 * Short RSVP links for SMS: /r/{code} → redirects to /rsvp?c={code}
 */

import crypto from 'crypto'
import { connectDB } from '@/lib/db'
import RsvpSmsLink from '@/lib/models/RsvpSmsLink'

function generateCode() {
  return crypto.randomBytes(8).toString('hex')
}

export function buildShortRsvpUrl(code, appUrl) {
  const base = (appUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
  return `${base}/r/${code}`
}

/**
 * Create or refresh a short link for this donor+drive (one row per pair).
 * @returns {Promise<{ code: string, url: string }>}
 */
export async function upsertRsvpSmsLink(donorId, driveId) {
  await connectDB()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 90)
  const code = generateCode()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const doc = await RsvpSmsLink.findOneAndUpdate(
    { donorId, driveId },
    {
      $set: { code, expiresAt },
      $setOnInsert: { donorId, driveId },
    },
    { upsert: true, returnDocument: 'after' }
  )

  if (!doc?.code) {
    throw new Error('Failed to create RSVP SMS link')
  }

  return { code: doc.code, url: buildShortRsvpUrl(doc.code, appUrl) }
}

/**
 * Reuse an existing non-expired short link, or create one.
 * Use this from APIs that may run often (e.g. donor profile GET) so codes stay stable.
 */
export async function getOrCreateRsvpSmsLink(donorId, driveId) {
  await connectDB()
  const now = new Date()
  const existing = await RsvpSmsLink.findOne({ donorId, driveId }).select('code expiresAt').lean()
  if (existing?.code && new Date(existing.expiresAt) > now) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return { code: existing.code, url: buildShortRsvpUrl(existing.code, appUrl) }
  }
  return upsertRsvpSmsLink(donorId, driveId)
}

/**
 * @param {string} code
 * @returns {Promise<{ donorId: string, driveId: string } | null>}
 */
export async function resolveRsvpSmsCode(code) {
  if (!code || typeof code !== 'string') return null
  const normalized = code.trim().toLowerCase()
  if (!/^[a-f0-9]{16}$/.test(normalized)) return null

  await connectDB()
  const row = await RsvpSmsLink.findOne({ code: normalized }).select('donorId driveId expiresAt').lean()
  if (!row) return null
  if (new Date(row.expiresAt) < new Date()) return null
  return {
    donorId: row.donorId.toString(),
    driveId: row.driveId.toString(),
  }
}
