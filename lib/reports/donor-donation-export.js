/**
 * Donor donation registry export — donors who have donated plus per-donation detail.
 */

import Donor from '@/lib/models/Donor'
import BloodInventory from '@/lib/models/BloodInventory'
import Organization from '@/lib/models/Organization'
import {
  COMPONENT_LABELS,
  ELIGIBILITY_LABELS,
} from '@/lib/donor-donation-history-shared'
import { formatBloodTypeLabel } from '@/lib/donor-blood-types'
import { escapeCsvValue, rowsToCsv, withBom } from '@/lib/reports/csv-utils'

function toId(value) {
  if (!value) return null
  return value.toString?.() || String(value)
}

function formatIsoDate(value) {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}

function formatDateOnly(value) {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0]
}

function formatTimeOnly(value) {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function inferCollectionType(entry) {
  if (entry.collectionType) return entry.collectionType
  if (entry.driveId || entry.driveName) return 'drive'
  if (entry.source === 'inventory') return 'facility'
  return 'facility'
}

function collectionLabel(entry) {
  const type = inferCollectionType(entry)
  if (type === 'drive') return entry.driveName || 'Blood drive'
  if (type === 'walk_in') return 'Walk-in'
  return 'In-facility collection'
}

function buildDateRangeFilter(startDate, endDate) {
  const filter = {}
  if (startDate) filter.$gte = new Date(startDate)
  if (endDate) {
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
    filter.$lte = end
  }
  return Object.keys(filter).length ? filter : null
}

function donationInRange(donationDate, rangeFilter) {
  if (!rangeFilter) return true
  const d = new Date(donationDate)
  if (Number.isNaN(d.getTime())) return false
  if (rangeFilter.$gte && d < rangeFilter.$gte) return false
  if (rangeFilter.$lte && d > rangeFilter.$lte) return false
  return true
}

function mergeHistoryWithInventory(donor, inventoryUnits) {
  const history = [...(donor.donationHistory || [])]
  const knownUnitIds = new Set(history.map((h) => h.unitId).filter(Boolean))

  for (const unit of inventoryUnits) {
    if (unit.unitId && knownUnitIds.has(unit.unitId)) continue
    history.push({
      date: unit.collectionDate,
      driveId: null,
      driveName: unit.collectionFacility || null,
      component: unit.component || 'whole_blood',
      collectionType: 'facility',
      volume: unit.volume ?? 450,
      bloodType: unit.bloodType || donor.bloodType,
      unitId: unit.unitId,
      eligibilityStatus: 'eligible',
      bloodWorkSummary: '',
      notes: 'Synced from inventory record',
      source: 'inventory',
      inventoryStatus: unit.status,
    })
    if (unit.unitId) knownUnitIds.add(unit.unitId)
  }

  return history.sort((a, b) => new Date(b.date) - new Date(a.date))
}

function buildDonorSummaryRow(donor, donationsForDonor) {
  const totalVolume = donationsForDonor.reduce((s, d) => s + (d.volumeMl || 0), 0)
  const driveCount = donationsForDonor.filter((d) => d.collectionType === 'drive').length
  const facilityCount = donationsForDonor.length - driveCount
  const dates = donationsForDonor.map((d) => d.donationDate).filter(Boolean).sort()
  const firstDonation = dates[0] || donor.lastDonationDate || ''
  const lastDonation = dates[dates.length - 1] || donor.lastDonationDate || ''

  return {
    donorId: toId(donor._id),
    firstName: donor.firstName || '',
    lastName: donor.lastName || '',
    fullName: `${donor.firstName || ''} ${donor.lastName || ''}`.trim(),
    email: donor.email || '',
    phone: donor.phone || '',
    bloodType: donor.bloodType || 'unknown',
    bloodTypeLabel: formatBloodTypeLabel(donor.bloodType),
    dateOfBirth: formatDateOnly(donor.dateOfBirth),
    gender: donor.gender || '',
    weightKg: donor.weight ?? '',
    status: donor.status || '',
    registrationType: donor.registrationType || '',
    registeredAt: formatIsoDate(donor.createdAt),
    totalDonationsRecorded: donor.totalDonations || 0,
    donationHistoryRows: donationsForDonor.length,
    hasIncompleteHistory:
      (donor.totalDonations || 0) > donationsForDonor.length ? 'yes' : 'no',
    firstDonationDate: formatDateOnly(firstDonation),
    lastDonationDate: formatDateOnly(lastDonation),
    nextEligibleDate: formatDateOnly(donor.nextEligibleDate),
    driveDonations: driveCount,
    facilityDonations: facilityCount,
    totalVolumeMl: totalVolume,
    uniqueDrives: new Set(donationsForDonor.map((d) => d.driveId).filter(Boolean)).size,
    medicalConditions: donor.medicalConditions || '',
    medications: donor.medications || '',
    adminNotes: donor.notes || '',
  }
}

function buildDonationDetailRow(donor, entry, donationNumber, inventoryMap) {
  const inv = entry.unitId ? inventoryMap[entry.unitId] : null
  const collectionType = inferCollectionType(entry)

  return {
    donorId: toId(donor._id),
    donorName: `${donor.firstName || ''} ${donor.lastName || ''}`.trim(),
    donorEmail: donor.email || '',
    donorPhone: donor.phone || '',
    donorBloodType: donor.bloodType || 'unknown',
    donorTotalDonations: donor.totalDonations || 0,
    donationNumber,
    donationDate: formatDateOnly(entry.date),
    donationTime: formatTimeOnly(entry.date),
    donationDateTime: formatIsoDate(entry.date),
    component: entry.component || 'whole_blood',
    componentLabel: COMPONENT_LABELS[entry.component] || entry.component || 'Whole blood',
    collectionType,
    collectionLabel: collectionLabel(entry),
    driveId: toId(entry.driveId) || '',
    driveName: entry.driveName || '',
    volumeMl: entry.volume ?? 450,
    bloodTypeAtDonation: entry.bloodType || donor.bloodType || '',
    unitId: entry.unitId || '',
    inventoryStatus: entry.inventoryStatus || inv?.status || '',
    inventoryId: inv?._id ? toId(inv._id) : '',
    eligibilityStatus: entry.eligibilityStatus || 'pending',
    eligibilityLabel: ELIGIBILITY_LABELS[entry.eligibilityStatus] || 'Pending review',
    bloodWorkSummary: entry.bloodWorkSummary || '',
    donationNotes: entry.notes || '',
    dataSource: entry.source === 'inventory' ? 'inventory' : 'donation_history',
  }
}

const DONOR_SUMMARY_HEADERS = [
  'donorId',
  'firstName',
  'lastName',
  'fullName',
  'email',
  'phone',
  'bloodType',
  'bloodTypeLabel',
  'dateOfBirth',
  'gender',
  'weightKg',
  'status',
  'registrationType',
  'registeredAt',
  'totalDonationsRecorded',
  'donationHistoryRows',
  'hasIncompleteHistory',
  'firstDonationDate',
  'lastDonationDate',
  'nextEligibleDate',
  'driveDonations',
  'facilityDonations',
  'totalVolumeMl',
  'uniqueDrives',
  'medicalConditions',
  'medications',
  'adminNotes',
]

const DONATION_DETAIL_HEADERS = [
  'donorId',
  'donorName',
  'donorEmail',
  'donorPhone',
  'donorBloodType',
  'donorTotalDonations',
  'donationNumber',
  'donationDate',
  'donationTime',
  'donationDateTime',
  'component',
  'componentLabel',
  'collectionType',
  'collectionLabel',
  'driveId',
  'driveName',
  'volumeMl',
  'bloodTypeAtDonation',
  'unitId',
  'inventoryStatus',
  'inventoryId',
  'eligibilityStatus',
  'eligibilityLabel',
  'bloodWorkSummary',
  'donationNotes',
  'dataSource',
]

/**
 * @param {import('mongoose').Types.ObjectId} orgObjectId
 * @param {object} options
 */
export async function buildDonorDonationExport(orgObjectId, options = {}) {
  const {
    startDate = null,
    endDate = null,
    scope = 'donated_only',
    includeInventoryOrphans = true,
  } = options

  const rangeFilter = buildDateRangeFilter(startDate, endDate)

  const donorQuery =
    scope === 'all'
      ? { organizationId: orgObjectId }
      : {
          organizationId: orgObjectId,
          $or: [
            { totalDonations: { $gt: 0 } },
            { lastDonationDate: { $ne: null } },
            { 'donationHistory.0': { $exists: true } },
          ],
        }

  const [organization, donors] = await Promise.all([
    Organization.findById(orgObjectId).select('name type').lean(),
    Donor.find(donorQuery)
      .select(
        'firstName lastName email phone bloodType dateOfBirth gender weight status registrationType createdAt totalDonations lastDonationDate nextEligibleDate donationHistory medicalConditions medications notes'
      )
      .sort({ lastDonationDate: -1, createdAt: -1 })
      .lean(),
  ])

  const donorIds = donors.map((d) => d._id)

  let inventoryByDonor = {}
  if (includeInventoryOrphans && donorIds.length) {
    const units = await BloodInventory.find({
      organizationId: orgObjectId,
      donorId: { $in: donorIds },
    })
      .select('donorId unitId collectionDate collectionFacility component volume bloodType status')
      .lean()

    inventoryByDonor = units.reduce((acc, unit) => {
      const key = toId(unit.donorId)
      if (!acc[key]) acc[key] = []
      acc[key].push(unit)
      return acc
    }, {})
  }

  const allUnitIds = [
    ...new Set(
      donors.flatMap((d) => (d.donationHistory || []).map((h) => h.unitId).filter(Boolean))
    ),
  ]

  const inventoryMap = {}
  if (allUnitIds.length) {
    const linkedUnits = await BloodInventory.find({
      organizationId: orgObjectId,
      unitId: { $in: allUnitIds },
    })
      .select('_id unitId status component')
      .lean()
    for (const u of linkedUnits) {
      inventoryMap[u.unitId] = u
    }
  }

  const donationRows = []
  const donorSummaryRows = []
  const donorsWithDonationsInRange = new Set()

  for (const donor of donors) {
    const donorKey = toId(donor._id)
    const mergedHistory = includeInventoryOrphans
      ? mergeHistoryWithInventory(donor, inventoryByDonor[donorKey] || [])
      : [...(donor.donationHistory || [])].sort((a, b) => new Date(b.date) - new Date(a.date))

    const filteredHistory = mergedHistory.filter((entry) =>
      donationInRange(entry.date, rangeFilter)
    )

    const hasLegacyDonationOnly =
      scope === 'donated_only' &&
      filteredHistory.length === 0 &&
      (donor.totalDonations || 0) > 0 &&
      !rangeFilter

    if (scope === 'donated_only' && filteredHistory.length === 0 && !hasLegacyDonationOnly) {
      continue
    }

    if (filteredHistory.length > 0) {
      donorsWithDonationsInRange.add(donorKey)
    }

    const chronological = [...filteredHistory].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    )

    const donorDonationRows = []
    for (let i = 0; i < chronological.length; i++) {
      const row = buildDonationDetailRow(
        donor,
        chronological[i],
        i + 1,
        inventoryMap
      )
      donorDonationRows.push(row)
      donationRows.push(row)
    }

    const hasLegacyDonation =
      (donor.totalDonations || 0) > 0 &&
      donorDonationRows.length === 0 &&
      !rangeFilter

    if (donorDonationRows.length > 0 || hasLegacyDonation) {
      donorSummaryRows.push(buildDonorSummaryRow(donor, donorDonationRows))
    }
  }

  const stats = {
    organizationName: organization?.name || 'Organization',
    organizationType: organization?.type || '',
    scope,
    dateRangeLabel: rangeFilter
      ? `${startDate || '…'} to ${endDate || '…'}`
      : 'All time (since system launch)',
    totalDonorsExported: donorSummaryRows.length,
    donorsWithDonationRows: donorsWithDonationsInRange.size,
    totalDonationRows: donationRows.length,
    totalVolumeMl: donationRows.reduce((s, r) => s + (Number(r.volumeMl) || 0), 0),
    driveDonations: donationRows.filter((r) => r.collectionType === 'drive').length,
    facilityDonations: donationRows.filter((r) => r.collectionType !== 'drive').length,
    uniqueBloodTypes: [...new Set(donorSummaryRows.map((r) => r.bloodType))].length,
    incompleteHistoryCount: donorSummaryRows.filter((r) => r.hasIncompleteHistory === 'yes').length,
    generatedAt: new Date().toISOString(),
  }

  return {
    type: 'Donor Donation Registry',
    stats,
    donorSummaries: donorSummaryRows,
    donations: donationRows,
  }
}

export function generateDonorDonationExportCSV(exportData, layout = 'full') {
  const { stats, donorSummaries, donations } = exportData
  const sections = []

  sections.push('# Donor Donation Registry Export')
  sections.push(`# Organization,${escapeCsvValue(stats.organizationName)}`)
  sections.push(`# Generated At,${escapeCsvValue(stats.generatedAt)}`)
  sections.push(`# Date Range,${escapeCsvValue(stats.dateRangeLabel)}`)
  sections.push(`# Scope,${escapeCsvValue(stats.scope)}`)
  sections.push('')

  sections.push('Summary Statistics')
  sections.push('Metric,Value')
  sections.push(`Total donors exported,${stats.totalDonorsExported}`)
  sections.push(`Total donation records,${stats.totalDonationRows}`)
  sections.push(`Drive donations,${stats.driveDonations}`)
  sections.push(`Facility donations,${stats.facilityDonations}`)
  sections.push(`Total volume (ml),${stats.totalVolumeMl}`)
  sections.push(`Donors with incomplete history,${stats.incompleteHistoryCount}`)
  sections.push('')

  if (layout === 'full' || layout === 'summary') {
    sections.push('Donor Summary (one row per donor)')
    sections.push(rowsToCsv(DONOR_SUMMARY_HEADERS, donorSummaries))
    sections.push('')
  }

  if (layout === 'full' || layout === 'detailed') {
    sections.push('Donation Detail (one row per donation)')
    sections.push(rowsToCsv(DONATION_DETAIL_HEADERS, donations))
  }

  return withBom(sections.join('\n'))
}

export function generateDonorDonationExportPDF(exportData) {
  const { stats, donorSummaries, donations } = exportData
  const lines = [
    'Donor Donation Registry',
    `Organization: ${stats.organizationName}`,
    `Generated: ${new Date(stats.generatedAt).toLocaleString()}`,
    `Date range: ${stats.dateRangeLabel}`,
    '',
    `Donors exported: ${stats.totalDonorsExported}`,
    `Donation records: ${stats.totalDonationRows}`,
    `Total volume (ml): ${stats.totalVolumeMl}`,
    `Drive / facility: ${stats.driveDonations} / ${stats.facilityDonations}`,
    '',
    'Top donors by donations:',
    ...donorSummaries
      .slice()
      .sort((a, b) => b.donationHistoryRows - a.donationHistoryRows)
      .slice(0, 15)
      .map(
        (d, i) =>
          `${i + 1}. ${d.fullName} — ${d.donationHistoryRows} donations, last ${d.lastDonationDate || 'N/A'}`
      ),
    '',
    `Recent donations (first ${Math.min(donations.length, 20)}):`,
    ...donations.slice(0, 20).map(
      (d, i) =>
        `${i + 1}. ${d.donationDate} ${d.donorName} — ${d.componentLabel} @ ${d.collectionLabel}${d.unitId ? ` [${d.unitId}]` : ''}`
    ),
  ]

  return lines
}
