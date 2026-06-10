/**
 * Donation spacing rules - whole blood, platelets, and plasma.
 * Used across registration, RSVP, outreach, and admin flows.
 */

/** Minimum days between whole-blood donations (8 weeks). */
export const WHOLE_BLOOD_INTERVAL_DAYS = 56

/** Minimum days between platelet donations (apheresis). */
export const PLATELETS_INTERVAL_DAYS = 14

/** Minimum days between plasma donations. */
export const PLASMA_INTERVAL_DAYS = 28

export const DONATION_COMPONENTS = {
  whole_blood: {
    key: 'whole_blood',
    label: 'Whole blood',
    shortLabel: 'Whole blood',
    intervalDays: WHOLE_BLOOD_INTERVAL_DAYS,
    intervalLabel: '8 weeks',
    color: 'red',
  },
  platelets: {
    key: 'platelets',
    label: 'Platelets',
    shortLabel: 'Platelets',
    intervalDays: PLATELETS_INTERVAL_DAYS,
    intervalLabel: '2 weeks',
    color: 'amber',
  },
  plasma: {
    key: 'plasma',
    label: 'Plasma',
    shortLabel: 'Plasma',
    intervalDays: PLASMA_INTERVAL_DAYS,
    intervalLabel: '4 weeks',
    color: 'blue',
  },
}

export const DONATION_COMPONENT_KEYS = Object.keys(DONATION_COMPONENTS)

export const DONATION_ELIGIBILITY_CRITERIA = [
  `Whole blood: wait at least ${WHOLE_BLOOD_INTERVAL_DAYS} days (8 weeks) between donations.`,
  `Platelets: wait at least ${PLATELETS_INTERVAL_DAYS} days (2 weeks) between donations.`,
  `Plasma: wait at least ${PLASMA_INTERVAL_DAYS} days (4 weeks) between donations.`,
  'Eligibility is checked against the date of this blood drive - not today\'s registration date.',
  'If you are not eligible to donate yet, you can register as a drive supporter and help by sharing the link.',
  'Final eligibility is always confirmed by staff during on-site screening.',
]

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function resolveIntervalDays(component = 'whole_blood') {
  const config = DONATION_COMPONENTS[component]
  return config?.intervalDays ?? WHOLE_BLOOD_INTERVAL_DAYS
}

/**
 * @param {Date|string|null|undefined} lastDonationDate
 * @param {string} [component='whole_blood']
 * @returns {Date|null}
 */
export function calculateNextEligibleDate(lastDonationDate, component = 'whole_blood') {
  if (!lastDonationDate) return null
  const donation = startOfDay(lastDonationDate)
  if (Number.isNaN(donation.getTime())) return null
  const next = new Date(donation)
  next.setDate(next.getDate() + resolveIntervalDays(component))
  return next
}

/**
 * Pick the most recent donation date from multiple sources.
 * @param  {...(Date|string|null|undefined)} dates
 * @returns {Date|null}
 */
export function resolveMostRecentDonationDate(...dates) {
  let latest = null
  for (const raw of dates) {
    if (!raw) continue
    const d = startOfDay(raw)
    if (Number.isNaN(d.getTime())) continue
    if (!latest || d > latest) latest = d
  }
  return latest
}

/**
 * @param {object} options
 * @param {Date|string|null} [options.lastDonationDate]
 * @param {Date|string|null} [options.nextEligibleDate]
 * @param {Date|string} [options.driveDate] - planned donation day (defaults to today)
 * @param {string} [options.donorStatus]
 * @param {string} [options.component='whole_blood']
 */
export function checkDonationEligibility({
  lastDonationDate = null,
  nextEligibleDate = null,
  driveDate = new Date(),
  donorStatus = null,
  component = 'whole_blood',
} = {}) {
  const componentConfig = DONATION_COMPONENTS[component] || DONATION_COMPONENTS.whole_blood

  if (donorStatus === 'cancelled') {
    return {
      eligible: false,
      reasonCode: 'record_cancelled',
      component,
      componentLabel: componentConfig.label,
      intervalDays: componentConfig.intervalDays,
      nextEligibleDate: null,
      nextEligibleDisplay: null,
      daysRemaining: null,
      message:
        'Your donor profile is on hold. Please contact the donation center before registering for this drive.',
      criteria: DONATION_ELIGIBILITY_CRITERIA,
    }
  }

  const driveDay = startOfDay(driveDate)
  const computedNext =
    nextEligibleDate != null && component === 'whole_blood'
      ? startOfDay(nextEligibleDate)
      : calculateNextEligibleDate(lastDonationDate, component)

  if (!computedNext) {
    return {
      eligible: true,
      reasonCode: 'eligible',
      component,
      componentLabel: componentConfig.label,
      intervalDays: componentConfig.intervalDays,
      nextEligibleDate: null,
      nextEligibleDisplay: null,
      daysRemaining: 0,
      message: null,
      criteria: DONATION_ELIGIBILITY_CRITERIA,
    }
  }

  if (driveDay >= computedNext) {
    return {
      eligible: true,
      reasonCode: 'eligible',
      component,
      componentLabel: componentConfig.label,
      intervalDays: componentConfig.intervalDays,
      nextEligibleDate: computedNext.toISOString(),
      nextEligibleDisplay: computedNext.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      daysRemaining: 0,
      message: null,
      criteria: DONATION_ELIGIBILITY_CRITERIA,
    }
  }

  const msPerDay = 24 * 60 * 60 * 1000
  const daysRemaining = Math.ceil((computedNext.getTime() - driveDay.getTime()) / msPerDay)
  const nextEligibleDisplay = computedNext.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return {
    eligible: false,
    reasonCode: 'waiting_period',
    component,
    componentLabel: componentConfig.label,
    intervalDays: componentConfig.intervalDays,
    nextEligibleDate: computedNext.toISOString(),
    nextEligibleDisplay,
    daysRemaining,
    message: `For ${componentConfig.label.toLowerCase()}, you will be eligible on ${nextEligibleDisplay} - about ${daysRemaining} day(s) after this drive date.`,
    criteria: DONATION_ELIGIBILITY_CRITERIA,
  }
}

/**
 * Eligibility across all donation component types for a given last donation date.
 */
export function getComponentEligibilityGrid({
  lastDonationDate = null,
  nextEligibleDate = null,
  driveDate = new Date(),
  donorStatus = null,
} = {}) {
  if (!lastDonationDate && !nextEligibleDate) {
    return DONATION_COMPONENT_KEYS.map((key) => ({
      ...checkDonationEligibility({ driveDate, donorStatus, component: key }),
      ...DONATION_COMPONENTS[key],
    }))
  }

  return DONATION_COMPONENT_KEYS.map((key) => ({
    ...checkDonationEligibility({
      lastDonationDate,
      nextEligibleDate: key === 'whole_blood' ? nextEligibleDate : null,
      driveDate,
      donorStatus,
      component: key,
    }),
    ...DONATION_COMPONENTS[key],
  }))
}

/**
 * True if eligible for at least one donation component at this drive.
 */
export function isEligibleForAnyComponent(options = {}) {
  const grid = getComponentEligibilityGrid(options)
  return grid.some((row) => row.eligible)
}

/**
 * Adapter for donor documents (RSVP / outreach).
 */
export function getDonationEligibilityFromDonor(donor, driveDate = new Date(), component = 'whole_blood') {
  return checkDonationEligibility({
    lastDonationDate: donor?.lastDonationDate,
    nextEligibleDate: donor?.nextEligibleDate,
    driveDate,
    donorStatus: donor?.status,
    component,
  })
}
