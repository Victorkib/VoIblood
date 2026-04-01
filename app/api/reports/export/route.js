import { connectDB } from '@/lib/db'
import Donor from '@/lib/models/Donor'
import BloodInventory from '@/lib/models/BloodInventory'
import Request from '@/lib/models/Request'

export async function GET(req) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organizationId')
    const reportType = searchParams.get('reportType') || 'inventory'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const format = searchParams.get('format') || 'pdf'

    if (!organizationId) {
      return Response.json({ message: 'Organization ID is required' }, { status: 400 })
    }

    const dateFilter = {}
    if (startDate) dateFilter.$gte = new Date(startDate)
    if (endDate) dateFilter.$lte = new Date(endDate)

    let data = {}

    switch (reportType) {
      case 'inventory': {
        const units = await BloodInventory.find({
          organizationId,
          ...(Object.keys(dateFilter).length > 0 && { collectionDate: dateFilter }),
        })
        data = {
          type: 'Inventory Report',
          totalUnits: units.length,
          byBloodType: units.reduce((acc, u) => {
            acc[u.bloodType] = (acc[u.bloodType] || 0) + 1
            return acc
          }, {}),
          units: units.slice(0, 100),
        }
        break
      }

      case 'donors': {
        const donors = await Donor.find({ organizationId })
        data = {
          type: 'Donor Analytics',
          totalDonors: donors.length,
          byStatus: {
            available: donors.filter((d) => d.donationStatus === 'available').length,
            deferred: donors.filter((d) => d.donationStatus === 'deferred').length,
            ineligible: donors.filter((d) => d.donationStatus === 'ineligible').length,
          },
          donors: donors.slice(0, 100),
        }
        break
      }

      case 'requests': {
        const requests = await Request.find({
          organizationId,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        })
        data = {
          type: 'Request Summary',
          totalRequests: requests.length,
          byStatus: {
            pending: requests.filter((r) => r.status === 'pending').length,
            approved: requests.filter((r) => r.status === 'approved').length,
            fulfilled: requests.filter((r) => r.status === 'fulfilled').length,
            rejected: requests.filter((r) => r.status === 'rejected').length,
          },
          requests: requests.slice(0, 100),
        }
        break
      }

      case 'usage': {
        const requests = await Request.find({
          organizationId,
          status: 'fulfilled',
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        })
        data = {
          type: 'Usage Trends',
          totalFulfilled: requests.length,
          monthly: {},
          requests: requests.slice(0, 100),
        }
        break
      }

      case 'expiry': {
        const units = await BloodInventory.find({ organizationId })
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
          expired: expired.slice(0, 50),
          expiring: expiring.slice(0, 50),
        }
        break
      }

      default: {
        data = {
          type: 'Performance Metrics',
          metrics: {
            activeUsers: 1,
            totalDonations: 0,
            totalRequests: 0,
            fulfillmentRate: 0,
          },
        }
      }
    }

    const csv = generateCSV(data)
    const json = JSON.stringify(data, null, 2)

    if (format === 'csv') {
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="report-${reportType}.csv"`,
        },
      })
    }

    if (format === 'json') {
      return new Response(json, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="report-${reportType}.json"`,
        },
      })
    }

    return new Response(generatePDF(data), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="report-${reportType}.pdf"`,
      },
    })
  } catch (error) {
    console.error('[API] Export report error:', error)
    return Response.json({ message: error.message }, { status: 500 })
  }
}

function generateCSV(data) {
  const headers = Object.keys(data)
  let csv = headers.join(',') + '\n'

  if (Array.isArray(data[Object.keys(data)[0]])) {
    const records = data[Object.keys(data)[0]]
    records.forEach((record) => {
      const row = headers.map((h) => {
        const val = record[h]
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      })
      csv += row.join(',') + '\n'
    })
  } else {
    const row = headers.map((h) => {
      const val = data[h]
      return typeof val === 'string' && val.includes(',') ? `"${val}"` : val
    })
    csv += row.join(',') + '\n'
  }

  return csv
}

function generatePDF(data) {
  const content = `
    Report Generated: ${new Date().toISOString()}
    
    Type: ${data.type}
    
    ${Object.entries(data)
      .filter(([key]) => key !== 'type')
      .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}`)
      .join('\n\n')}
  `

  return content
}
