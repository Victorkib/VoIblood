/**
 * Donor duplicate detection within one organization (email, phone, name+DOB).
 */

/**
 * @param {string} phone
 * @returns {string}
 */
export function normalizePhoneDigits(phone) {
  if (!phone) return ''
  return String(phone).replace(/\D/g, '')
}

/**
 * @param {string} s
 * @returns {string}
 */
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * @param {string} email
 */
export function normalizeDonorEmail(email) {
  return String(email || '').toLowerCase().trim()
}

/**
 * Obvious non-production / disposable local parts
 */
export function isPlaceholderOrDisposableEmail(email) {
  const e = normalizeDonorEmail(email)
  if (!e.includes('@')) return true
  const [, domain = ''] = e.split('@')
  const blocked = [
    'temp.local',
    'test.local',
    'example.com',
    'example.org',
    'invalid',
  ]
  if (blocked.some((b) => domain === b || e.endsWith(`@${b}`))) return true
  if (e.includes('..')) return true
  return false
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidDonorEmail(email) {
  return EMAIL_RE.test(normalizeDonorEmail(email))
}

/**
 * Find another donor in the same org that likely represents the same person.
 * @param {import('mongoose').Model} Donor
 * @param {string} organizationId
 * @param {{ email?: string, phone?: string, firstName?: string, lastName?: string, dateOfBirth?: Date|string|null, excludeDonorId?: string }} fields
 * @returns {Promise<{ donor: import('mongoose').Document, reason: string } | null>}
 */
export async function findDuplicateDonorForOrganization(Donor, organizationId, fields) {
  const orgId = organizationId?.toString?.() || organizationId
  const normEmail = fields.email ? normalizeDonorEmail(fields.email) : ''
  const phoneDigits = normalizePhoneDigits(fields.phone || '')
  const fn = (fields.firstName || '').trim()
  const ln = (fields.lastName || '').trim()
  const excludeId = fields.excludeDonorId

  const baseFilter = { organizationId: orgId }
  if (excludeId) {
    baseFilter._id = { $ne: excludeId }
  }

  if (normEmail) {
    const byEmail = await Donor.findOne({ ...baseFilter, email: normEmail }).lean()
    if (byEmail) return { donor: byEmail, reason: 'email' }
  }

  if (phoneDigits.length >= 7) {
    const byNorm = await Donor.findOne({ ...baseFilter, phoneNormalized: phoneDigits }).lean()
    if (byNorm) return { donor: byNorm, reason: 'phone_normalized' }
    const legacy = await Donor.find({
      ...baseFilter,
      $or: [{ phoneNormalized: '' }, { phoneNormalized: { $exists: false } }],
    })
      .select('_id phone phoneNormalized')
      .limit(400)
      .lean()
    for (const row of legacy) {
      const existing = normalizePhoneDigits(row.phone)
      if (existing && phoneDigitsMatch(existing, phoneDigits)) {
        return { donor: row, reason: 'phone_legacy' }
      }
    }
  }

  if (fn && ln && fields.dateOfBirth) {
    const dob = new Date(fields.dateOfBirth)
    if (!Number.isNaN(dob.getTime())) {
      const start = new Date(dob)
      start.setHours(0, 0, 0, 0)
      const end = new Date(dob)
      end.setHours(23, 59, 59, 999)
      const byBio = await Donor.findOne({
        ...baseFilter,
        firstName: new RegExp(`^${escapeRegex(fn)}$`, 'i'),
        lastName: new RegExp(`^${escapeRegex(ln)}$`, 'i'),
        dateOfBirth: { $gte: start, $lte: end },
      }).lean()
      if (byBio) return { donor: byBio, reason: 'name_and_date_of_birth' }
    }
  }

  return null
}

/**
 * Compare two digit-only strings (full equality or same last 9 national significant digits).
 */
function phoneDigitsMatch(aDigits, bDigits) {
  if (!aDigits || !bDigits) return false
  if (aDigits === bDigits) return true
  if (aDigits.length >= 9 && bDigits.length >= 9) {
    return aDigits.slice(-9) === bDigits.slice(-9)
  }
  return false
}
