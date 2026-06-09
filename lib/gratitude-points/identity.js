import crypto from 'crypto'
import { normalizeDonorEmail } from '@/lib/donor-dedupe'
import { normalizePhoneDigits } from '@/lib/donor-dedupe'

/**
 * Normalize Kenya national ID / passport for hashing (never store raw in logs).
 */
export function normalizeNationalId(value) {
  if (!value) return ''
  return String(value).replace(/\s+/g, '').toUpperCase()
}

export function hashIdentity(type, rawValue) {
  const normalized =
    type === 'national_id'
      ? normalizeNationalId(rawValue)
      : type === 'email'
        ? normalizeDonorEmail(rawValue)
        : normalizePhoneDigits(rawValue)

  if (!normalized) return null

  const payload = `${type}:${normalized}`
  return crypto.createHash('sha256').update(payload).digest('hex')
}

export function last4ForDisplay(type, rawValue) {
  if (!rawValue) return ''
  const n =
    type === 'national_id'
      ? normalizeNationalId(rawValue)
      : type === 'email'
        ? normalizeDonorEmail(rawValue)
        : normalizePhoneDigits(rawValue)
  if (n.length <= 4) return n
  return n.slice(-4)
}
