import { connectDB } from '@/lib/db'
import Donor from '@/lib/models/Donor'
import BloodInventory from '@/lib/models/BloodInventory'
import Request from '@/lib/models/Request'
import mongoose from 'mongoose'
import { getCurrentUser, canAccessOrganization } from '@/lib/session'
import {
  buildDonorDonationExport,
  generateDonorDonationExportCSV,
  generateDonorDonationExportPDF,
} from '@/lib/reports/donor-donation-export'

function toObjectId(id) {
  if (!id) return null
  try {
    return new mongoose.Types.ObjectId(id)
  } catch {
    return null
  }
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) return ''
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function flattenRecord(record) {
  const flat = {}
  for (const [key, value] of Object.entries(record)) {
    if (value instanceof Date) {
      flat[key] = value.toISOString()
    } else if (value && typeof value === 'object' && value._id) {
      flat[key] = value._id.toString()
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      flat[key] = JSON.stringify(value)
    } else {
      flat[key] = value
    }
  }
  return flat
}

function generateCSV(data) {
  const lines = []
  lines.push(`Report Type,${escapeCsvValue(data.type)}`)
  lines.push(`Generated At,${escapeCsvValue(new Date().toISOString())}`)
  lines.push('')

  const recordKeys = ['units', 'donors', 'requests', 'expired', 'expiring']
  const recordKey = recordKeys.find((key) => Array.isArray(data[key]) && data[key].length > 0)

  const summaryEntries = Object.entries(data).filter(
    ([key, value]) => !recordKeys.includes(key) && !Array.isArray(value)
  )
  if (summaryEntries.length > 0) {
    lines.push('Summary')
    lines.push('Metric,Value')
    for (const [key, value] of summaryEntries) {
      lines.push(`${escapeCsvValue(key)},${escapeCsvValue(value)}`)
    }
    lines.push('')
  }

  if (recordKey) {
    const records = data[recordKey].map((item) =>
      flattenRecord(typeof item.toObject === 'function' ? item.toObject() : item)
    )
    const headers = [...new Set(records.flatMap((r) => Object.keys(r)))]
    lines.push('Details')
    lines.push(headers.map(escapeCsvValue).join(','))
    for (const record of records) {
      lines.push(headers.map((h) => escapeCsvValue(record[h])).join(','))
    }
  }

  return `\uFEFF${lines.join('\n')}`
}

function escapePdfText(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function buildPdfFromLines(lines) {
  const contentLines = lines.map((line, i) => {
    const y = 750 - i * 14
  if (y < 40) return null
    return `1 0 0 1 50 ${y} Tm (${escapePdfText(line)}) Tj`
  }).filter(Boolean)

  const stream = `BT /F1 10 Tf ${contentLines.join(' ')} ET`
  const streamLength = Buffer.byteLength(stream, 'utf8')

  const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length ${streamLength}>>stream
${stream}
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000${(400 + streamLength).toString().padStart(3, '0')} 00000 n 
trailer<</Size 6/Root 1 0 R>>
startxref
${420 + streamLength}
%%EOF`

  return pdf
}

function generatePDF(data) {
  const lines = [
    data.type || 'Report',
    `Generated: ${new Date().toLocaleString()}`,
    '',
    ...Object.entries(data)
      .filter(([key]) => !['units', 'donors', 'requests', 'expired', 'expiring', 'donorSummaries', 'donations', 'stats'].includes(key))
      .map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          return `${key}: ${JSON.stringify(value)}`
        }
        return `${key}: ${value}`
      }),
  ]

  const recordKeys = ['units', 'donors', 'requests', 'expired', 'expiring']
  const recordKey = recordKeys.find((key) => Array.isArray(data[key]) && data[key].length > 0)
  if (recordKey) {
    lines.push('', `${recordKey} (first ${Math.min(data[recordKey].length, 25)} records):`)
    data[recordKey].slice(0, 25).forEach((item, index) => {
      const flat = flattenRecord(typeof item.toObject === 'function' ? item.toObject() : item)
      lines.push(`${index + 1}. ${JSON.stringify(flat)}`)
    })
  }

  return buildPdfFromLines(lines)
}

export async function GET(req) {
  try {
    await connectDB()

    const user = await getCurrentUser(req.cookies)
    if (!user) {
      return Response.json({ message: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organizationId')
    const reportType = searchParams.get('reportType') || 'inventory'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const format = searchParams.get('format') || 'csv'
    const layout = searchParams.get('layout') || 'full'
    const scope = searchParams.get('scope') || 'donated_only'

    if (!organizationId) {
      return Response.json({ message: 'Organization ID is required' }, { status: 400 })
    }

    const orgObjectId = toObjectId(organizationId)
    if (!orgObjectId) {
      return Response.json({ message: 'Invalid organization ID' }, { status: 400 })
    }

    if (!canAccessOrganization(user, organizationId)) {
      return Response.json({ message: 'Access denied' }, { status: 403 })
    }

    const dateFilter = {}
    if (startDate) dateFilter.$gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      dateFilter.$lte = end
    }
    const hasDateFilter = Object.keys(dateFilter).length > 0

    let data = {}

    switch (reportType) {
      case 'inventory': {
        const units = await BloodInventory.find({
          organizationId: orgObjectId,
          ...(hasDateFilter && { collectionDate: dateFilter }),
        }).lean()
        data = {
          type: 'Inventory Report',
          totalUnits: units.length,
          availableUnits: units.filter((u) => u.status === 'available').length,
          byBloodType: units.reduce((acc, u) => {
            acc[u.bloodType] = (acc[u.bloodType] || 0) + 1
            return acc
          }, {}),
          units,
        }
        break
      }

      case 'donors': {
        const donors = await Donor.find({ organizationId: orgObjectId }).lean()
        data = {
          type: 'Donor Analytics',
          totalDonors: donors.length,
          byStatus: {
            completed: donors.filter((d) => d.status === 'completed').length,
            registered: donors.filter((d) => d.status === 'registered').length,
            confirmed: donors.filter((d) => d.status === 'confirmed').length,
            checked_in: donors.filter((d) => d.status === 'checked_in').length,
            cancelled: donors.filter((d) => d.status === 'cancelled').length,
            no_show: donors.filter((d) => d.status === 'no_show').length,
          },
          withDonations: donors.filter((d) => (d.totalDonations || 0) > 0).length,
          donors,
        }
        break
      }

      case 'donor_donations': {
        data = await buildDonorDonationExport(orgObjectId, {
          startDate,
          endDate,
          scope,
          includeInventoryOrphans: true,
        })
        break
      }

      case 'requests': {
        const requests = await Request.find({
          $or: [
            { requestingOrganizationId: orgObjectId },
            { sourceOrganizationId: orgObjectId },
          ],
          ...(hasDateFilter && { createdAt: dateFilter }),
        }).lean()
        data = {
          type: 'Request Summary',
          totalRequests: requests.length,
          byStatus: {
            pending: requests.filter((r) => r.status === 'pending').length,
            approved: requests.filter((r) => r.status === 'approved').length,
            ready_for_delivery: requests.filter((r) => r.status === 'ready_for_delivery').length,
            fulfilled: requests.filter((r) => r.status === 'fulfilled').length,
            rejected: requests.filter((r) => r.status === 'rejected').length,
          },
          requests,
        }
        break
      }

      case 'usage': {
        const requests = await Request.find({
          $or: [
            { requestingOrganizationId: orgObjectId },
            { sourceOrganizationId: orgObjectId },
          ],
          status: 'fulfilled',
          ...(hasDateFilter && { fulfilledDate: dateFilter }),
        }).lean()
        data = {
          type: 'Usage Trends',
          totalFulfilled: requests.length,
          requests,
        }
        break
      }

      case 'expiry': {
        const units = await BloodInventory.find({ organizationId: orgObjectId }).lean()
        const now = new Date()
        const expired = units.filter((u) => new Date(u.expiryDate) < now)
        const expiring = units.filter((u) => {
          const days = Math.ceil((new Date(u.expiryDate) - now) / (1000 * 60 * 60 * 24))
          return days <= 7 && days >= 0
        })
        data = {
          type: 'Expiry Analysis',
          expiredCount: expired.length,
          expiringCount: expiring.length,
          wastePercentage: units.length > 0 ? ((expired.length / units.length) * 100).toFixed(2) : 0,
          expired,
          expiring,
        }
        break
      }

      case 'performance': {
        const [units, donors, requests] = await Promise.all([
          BloodInventory.countDocuments({ organizationId: orgObjectId }),
          Donor.countDocuments({ organizationId: orgObjectId }),
          Request.countDocuments({
            $or: [
              { requestingOrganizationId: orgObjectId },
              { sourceOrganizationId: orgObjectId },
            ],
          }),
        ])
        const fulfilled = await Request.countDocuments({
          $or: [
            { requestingOrganizationId: orgObjectId },
            { sourceOrganizationId: orgObjectId },
          ],
          status: 'fulfilled',
        })
        data = {
          type: 'Performance Metrics',
          totalInventoryUnits: units,
          totalDonors: donors,
          totalRequests: requests,
          fulfilledRequests: fulfilled,
          fulfillmentRate: requests > 0 ? `${Math.round((fulfilled / requests) * 100)}%` : '0%',
        }
        break
      }

      default:
        return Response.json({ message: 'Invalid report type' }, { status: 400 })
    }

    const filenameBase =
      reportType === 'donor_donations'
        ? `donor-donation-registry-${new Date().toISOString().split('T')[0]}`
        : `report-${reportType}-${new Date().toISOString().split('T')[0]}`

    if (reportType === 'donor_donations' && (format === 'csv' || format === 'xlsx')) {
      const csv = generateDonorDonationExportCSV(data, layout)
      return new Response(csv, {
        headers: {
          'Content-Type': format === 'xlsx'
            ? 'application/vnd.ms-excel'
            : 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filenameBase}.${format === 'xlsx' ? 'xlsx' : 'csv'}"`,
        },
      })
    }

    if (format === 'csv' || format === 'xlsx') {
      const csv = generateCSV(data)
      return new Response(csv, {
        headers: {
          'Content-Type': format === 'xlsx'
            ? 'application/vnd.ms-excel'
            : 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filenameBase}.${format === 'xlsx' ? 'xlsx' : 'csv'}"`,
        },
      })
    }

    if (format === 'pdf') {
      const pdfContent =
        reportType === 'donor_donations'
          ? buildPdfFromLines(generateDonorDonationExportPDF(data))
          : generatePDF(data)

      return new Response(pdfContent, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filenameBase}.pdf"`,
        },
      })
    }

    return Response.json({ message: 'Unsupported format' }, { status: 400 })
  } catch (error) {
    console.error('[API] Export report error:', error)
    return Response.json({ message: error.message }, { status: 500 })
  }
}
