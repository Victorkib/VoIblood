/**
 * Server-side donation history normalization and inventory enrichment.
 */

import {
  COMPONENT_LABELS,
  ELIGIBILITY_LABELS,
} from '@/lib/donor-donation-history-shared'

function inferCollectionType(entry) {
  if (entry.collectionType) return entry.collectionType
  if (entry.driveId || entry.driveName) return 'drive'
  return 'facility'
}

export function normalizeDonationHistoryEntry(entry, index = 0) {
  const date = entry.date ? new Date(entry.date) : null
  const collectionType = inferCollectionType(entry)
  const component = entry.component || 'whole_blood'

  return {
    id: entry._id?.toString() || `donation-${index}`,
    date: entry.date,
    dateDisplay: date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString(undefined, {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : 'Unknown date',
    timeDisplay: date && !Number.isNaN(date.getTime())
      ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      : null,
    driveId: entry.driveId?.toString?.() || entry.driveId || null,
    driveName: entry.driveName || null,
    collectionType,
    collectionLabel:
      collectionType === 'drive'
        ? entry.driveName || 'Blood drive'
        : 'In-facility collection',
    component,
    componentLabel: COMPONENT_LABELS[component] || component,
    volume: entry.volume ?? 450,
    bloodType: entry.bloodType || null,
    unitId: entry.unitId || null,
    inventoryId: entry.inventoryId || null,
    eligibilityStatus: entry.eligibilityStatus || 'pending',
    eligibilityLabel: ELIGIBILITY_LABELS[entry.eligibilityStatus] || 'Pending review',
    bloodWorkSummary: entry.bloodWorkSummary || null,
    notes: entry.notes || null,
    donationNumber: index + 1,
  }
}

export function buildDonorDonationSummary(donor, normalizedHistory = []) {
  const historyCount = normalizedHistory.length
  const totalFromField = donor.totalDonations || 0
  const totalDonations = Math.max(totalFromField, historyCount)

  const totalVolumeMl = normalizedHistory.reduce((sum, h) => sum + (h.volume || 0), 0)
  const driveDonations = normalizedHistory.filter((h) => h.collectionType === 'drive').length
  const facilityDonations = historyCount - driveDonations
  const uniqueDrives = new Set(
    normalizedHistory.filter((h) => h.driveId).map((h) => h.driveId)
  ).size

  const componentBreakdown = normalizedHistory.reduce((acc, h) => {
    const key = h.component || 'whole_blood'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const lastEntry = normalizedHistory[0] || null

  return {
    totalDonations,
    historyCount,
    livesImpactEstimate: totalDonations * 3,
    totalVolumeMl,
    driveDonations,
    facilityDonations,
    uniqueDrives,
    componentBreakdown,
    lastDonationDate: donor.lastDonationDate || lastEntry?.date || null,
    nextEligibleDate: donor.nextEligibleDate || null,
    hasHistoryGap: totalFromField > historyCount,
  }
}

/**
 * Attach inventory Mongo IDs for deep-linking to unit detail pages.
 */
export async function enrichDonationHistoryWithInventory(history, organizationId) {
  if (!history?.length || !organizationId) {
    return history.map((e, i) => normalizeDonationHistoryEntry(e, i))
  }

  const BloodInventory = (await import('@/lib/models/BloodInventory')).default
  const unitIds = [...new Set(history.map((h) => h.unitId).filter(Boolean))]

  const units = unitIds.length
    ? await BloodInventory.find({
        organizationId,
        unitId: { $in: unitIds },
      })
        .select('_id unitId status component')
        .lean()
    : []

  const unitMap = Object.fromEntries(units.map((u) => [u.unitId, u]))

  const sorted = [...history].sort((a, b) => new Date(b.date) - new Date(a.date))

  return sorted.map((entry, index) => {
    const chronologicalIndex = sorted.length - 1 - index
    const normalized = normalizeDonationHistoryEntry(entry, chronologicalIndex)
    const inv = entry.unitId ? unitMap[entry.unitId] : null
    if (inv) {
      normalized.inventoryId = inv._id.toString()
      normalized.inventoryStatus = inv.status
      if (!entry.component && inv.component) {
        normalized.component = inv.component
        normalized.componentLabel = COMPONENT_LABELS[inv.component] || inv.component
      }
    }
    return normalized
  })
}
