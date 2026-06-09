/**
 * Gratitude Points (Kenya) — non-monetary donor thank-you program.
 * Points have no cash value; hospitals offer catalog benefits only.
 */

/** Points earned per completed eligible donation (blood banks + NGO drives). */
export const GRATITUDE_POINTS_PER_DONATION = 10

/** Only award when screening outcome is eligible. */
export const EARN_ELIGIBILITY_STATUSES = ['eligible']

/** Suggested catalog tiers (hospitals set their own costs within these bands). */
export const CATALOG_POINT_COST_MIN = 50
export const CATALOG_POINT_COST_MAX = 50000

export const CATALOG_CATEGORIES = [
  'consultation',
  'pharmacy',
  'laboratory',
  'wellness',
  'other',
]

export const IDENTITY_TYPES = ['national_id', 'email', 'phone']

export const VERIFICATION_METHODS = ['national_id', 'phone_in_person']

export const REDEMPTION_DISCLAIMER =
  'Community gratitude benefit for blood donors. Not payment for blood donation. No cash value.'
