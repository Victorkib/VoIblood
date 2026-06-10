/**
 * Signed RSVP links for existing donors (no DB row until they respond).
 * Uses HS256 via `jose` (already a project dependency).
 */

import { SignJWT, jwtVerify } from 'jose'

export function isRsvpJwtConfigured() {
  return Boolean(process.env.RSVP_JWT_SECRET || process.env.NEXTAUTH_SECRET)
}

function getSecretKey() {
  const secret =
    process.env.RSVP_JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-rsvp-secret-not-for-production'
  if (process.env.NODE_ENV === 'production' && !isRsvpJwtConfigured()) {
    throw new Error('Set RSVP_JWT_SECRET (or NEXTAUTH_SECRET) for production RSVP links')
  }
  return new TextEncoder().encode(secret)
}

/**
 * @param {string} donorId
 * @param {string} driveId
 * @returns {Promise<string>}
 */
export async function createDriveRsvpToken(donorId, driveId) {
  return new SignJWT({
    typ: 'drive_rsvp',
    did: String(driveId),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(donorId))
    .setIssuedAt()
    .setExpirationTime('90d')
    .sign(getSecretKey())
}

/**
 * @param {string} token
 * @returns {Promise<{ donorId: string, driveId: string }>}
 */
export async function verifyDriveRsvpToken(token) {
  const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ['HS256'] })
  if (payload.typ !== 'drive_rsvp' || !payload.did) {
    throw new Error('Invalid RSVP token')
  }
  if (!payload.sub) {
    throw new Error('Invalid RSVP token subject')
  }
  return { donorId: String(payload.sub), driveId: String(payload.did) }
}

/**
 * @param {string} token
 * @param {string} appUrl
 */
export function buildRsvpUrl(token, appUrl) {
  const base = (appUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
  return `${base}/rsvp?t=${encodeURIComponent(token)}`
}
