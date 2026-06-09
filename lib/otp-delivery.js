/**
 * Shared OTP contact normalization and lookup key helpers.
 * Email is the primary lookup key when both email and phone are present.
 */

export function normalizeOtpContacts({ phone, email }) {
  const normalizedPhone = phone ? String(phone).replace(/[\s\-\(\)]/g, '') : null
  const normalizedEmail = email ? String(email).toLowerCase().trim() : null
  const lookupKey = normalizedEmail || normalizedPhone

  return {
    normalizedPhone,
    normalizedEmail,
    lookupKey,
  }
}
