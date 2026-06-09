/**
 * Hospital Rewards Partner access (Kenya).
 * Partner hospitals on Professional+ (or Enterprise with partner included) may redeem points.
 */

const PARTNER_PLANS = ['professional', 'enterprise']

/**
 * @param {import('mongoose').Document|Object} org
 */
export function isRewardsPartnerHospital(org) {
  if (!org || org.type !== 'hospital') return false
  if (!org.isActive || org.accountStatus !== 'active') return false

  const rp = org.rewardsProgram || {}
  if (!rp.partnerActive) return false

  if (rp.partnerExpiresAt && new Date(rp.partnerExpiresAt) < new Date()) {
    return false
  }

  const plan = org.subscriptionPlan || 'free'
  if (PARTNER_PLANS.includes(plan)) return true

  // Explicit partner SKU without plan upgrade (super-admin override)
  return Boolean(rp.partnerActive && rp.partnerOverride)
}

/**
 * Orgs that may issue points when a donation completes.
 */
export function canIssueGratitudePoints(org) {
  if (!org || !org.isActive || org.accountStatus !== 'active') return false
  return ['blood_bank', 'ngo', 'transfusion_center'].includes(org.type)
}

/**
 * @param {import('mongoose').Document|Object} org
 */
export function enterpriseIncludesRewardsPartner(org) {
  return org?.subscriptionPlan === 'enterprise'
}
