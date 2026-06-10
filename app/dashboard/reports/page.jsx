'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Calendar, Package, Users, TrendingUp, AlertCircle, Heart, FileSpreadsheet } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { OrgFeatureLayout } from '@/components/dashboard/org-route-guard'
import { useOrganizationId } from '@/lib/dashboard/use-organization-id'
import { downloadReport } from '@/lib/dashboard/download-report'

export default function ReportsPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reportType, setReportType] = useState('inventory')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [format, setFormat] = useState('csv')
  const [donorExportLayout, setDonorExportLayout] = useState('full')
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [downloadError, setDownloadError] = useState(null)
  const { user } = useAuth()
  const organizationId = useOrganizationId()
  const orgType = user?.organizationType || 'blood_bank'

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (!user || !organizationId) return

        const response = await fetch(`/api/dashboard/stats?organizationId=${organizationId}`)

        if (!response.ok) throw new Error('Failed to fetch stats')

        const data = await response.json()
        setStats(data.data)
        setError(null)
      } catch (err) {
        console.error('[v0] Fetch stats error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user, organizationId])

  const reports = [
    {
      title: 'Inventory Report',
      description: 'Blood stock levels and distribution by type',
      icon: Package,
      color: 'text-blue-600',
      key: 'inventory',
    },
    {
      title: 'Donor Analytics',
      description: 'Donor activity, eligibility, and trends',
      icon: Users,
      color: 'text-green-600',
      key: 'donors',
    },
    {
      title: 'Donor Donation Registry',
      description: 'All donors who have donated — profile data plus every donation (drive, unit ID, dates)',
      icon: Heart,
      color: 'text-rose-600',
      key: 'donor_donations',
      featured: true,
    },
    {
      title: 'Request Summary',
      description: 'Hospital requests and fulfillment rates',
      icon: TrendingUp,
      color: 'text-purple-600',
      key: 'requests',
    },
    {
      title: 'Usage Trends',
      description: 'Monthly usage patterns and projections',
      icon: TrendingUp,
      color: 'text-orange-600',
      key: 'usage',
    },
    {
      title: 'Expiry Analysis',
      description: 'Wastage reduction and expiry patterns',
      icon: AlertCircle,
      color: 'text-red-600',
      key: 'expiry',
    },
    {
      title: 'Performance Metrics',
      description: 'System performance and KPIs',
      icon: TrendingUp,
      color: 'text-indigo-600',
      key: 'performance',
    },
  ]

  const handleGenerateReport = async (typeOverride) => {
    try {
      if (!user) return
      if (!organizationId) {
        setDownloadError('No organization selected. Choose an organization context and try again.')
        return
      }

      const selectedType = typeOverride || reportType
      setDownloadLoading(true)
      setDownloadError(null)

      await downloadReport({
        organizationId,
        reportType: selectedType,
        format,
        startDate,
        endDate,
        layout: selectedType === 'donor_donations' ? donorExportLayout : undefined,
        scope: selectedType === 'donor_donations' ? 'donated_only' : undefined,
        filenamePrefix:
          selectedType === 'donor_donations' ? 'donor-donation-registry' : `report-${selectedType}`,
      })
    } catch (err) {
      console.error('[v0] Generate report error:', err)
      setDownloadError(err.message)
    } finally {
      setDownloadLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <Card className="p-6 border-red-500/50 bg-red-500/5">
          <p className="text-red-600">Please log in to view reports</p>
        </Card>
      </div>
    )
  }

  const showInventoryMetrics = orgType !== 'ngo'
  const showDonorMetrics = ['blood_bank', 'ngo'].includes(orgType)

  return (
    <OrgFeatureLayout feature="reports">
      {error && (
        <Card className="p-6 border-red-500/50 bg-red-500/5">
          <p className="text-red-600">Error: {error}</p>
        </Card>
      )}

      {downloadError && (
        <Card className="p-6 border-red-500/50 bg-red-500/5">
          <p className="text-red-600">Download error: {downloadError}</p>
        </Card>
      )}

      {/* Key Metrics */}
      {!loading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {showInventoryMetrics && (
            <>
              <Card className="p-4">
                <p className="text-sm text-foreground/60 mb-1">Total units in stock</p>
                <p className="text-2xl font-bold text-foreground">{stats.inventory?.totalUnits ?? 0}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-foreground/60 mb-1">Units expiring</p>
                <p className="text-2xl font-bold text-red-600">{stats.inventory?.alerts?.expiring ?? 0}</p>
              </Card>
            </>
          )}
          {showDonorMetrics && (
            <Card className="p-4">
              <p className="text-sm text-foreground/60 mb-1">Active donors</p>
              <p className="text-2xl font-bold text-foreground">{stats.donors?.available ?? 0}</p>
            </Card>
          )}
          {orgType !== 'ngo' && (
            <Card className="p-4">
              <p className="text-sm text-foreground/60 mb-1">Pending requests</p>
              <p className="text-2xl font-bold text-foreground">
                {stats.requests?.incomingPending ?? stats.requests?.outgoingPending ?? stats.requests?.pending ?? 0}
              </p>
            </Card>
          )}
          {orgType === 'ngo' && (
            <Card className="p-4">
              <p className="text-sm text-foreground/60 mb-1">Active drives</p>
              <p className="text-2xl font-bold text-foreground">{stats.drives?.active ?? 0}</p>
            </Card>
          )}
        </div>
      )}

      {/* Featured donor registry export */}
      {showDonorMetrics && (
        <Card className="p-6 border-rose-200/80 bg-gradient-to-br from-rose-50/80 to-background dark:from-rose-950/20">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Download full donor donation history</h3>
                <p className="text-sm text-foreground/60 mt-1 max-w-2xl">
                  Export every donor who has ever donated since launch — donor profiles, donation dates,
                  blood units, drive names, screening notes, and inventory status. All-time by default;
                  optional date range in the custom builder below.
                </p>
              </div>
            </div>
            <Button
              className="gap-2 shrink-0 bg-rose-600 hover:bg-rose-700"
              disabled={downloadLoading || !organizationId}
              onClick={() => handleGenerateReport('donor_donations')}
            >
              <Download className="w-4 h-4" />
              {downloadLoading ? 'Generating...' : 'Download registry (CSV)'}
            </Button>
          </div>
        </Card>
      )}

      {/* Report Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report, idx) => {
          const Icon = report.icon
          return (
            <Card
              key={idx}
              className={`p-6 hover:border-primary/30 hover:shadow-lg transition cursor-pointer ${
                report.featured ? 'ring-1 ring-rose-200/60' : ''
              }`}
              onClick={() => setReportType(report.key)}
            >
              <div className={`mb-4 p-3 rounded-lg bg-secondary/10 w-fit`}>
                <Icon className={`w-6 h-6 ${report.color}`} />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{report.title}</h3>
              <p className="text-sm text-foreground/60 mb-4">{report.description}</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                disabled={downloadLoading}
                onClick={(e) => {
                  e.stopPropagation()
                  setReportType(report.key)
                  handleGenerateReport(report.key)
                }}
              >
                <Download className="w-4 h-4" />
                {downloadLoading ? 'Generating...' : 'Download'}
              </Button>
            </Card>
          )
        })}
      </div>

      {/* Custom Report Builder */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Generate Custom Report</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
              >
                <option value="inventory">Inventory</option>
                <option value="donors">Donors</option>
                <option value="donor_donations">Donor donation registry</option>
                <option value="requests">Requests</option>
                <option value="usage">Usage</option>
                <option value="expiry">Expiry</option>
                <option value="performance">Performance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-foreground"
                />
                <span className="flex items-center text-foreground/60">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-foreground"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
              >
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
                <option value="xlsx">Excel</option>
              </select>
            </div>
          </div>
          {reportType === 'donor_donations' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Registry layout</label>
                <select
                  value={donorExportLayout}
                  onChange={(e) => setDonorExportLayout(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
                >
                  <option value="full">Full (donor summary + donation detail)</option>
                  <option value="summary">Donor summary only (one row per donor)</option>
                  <option value="detailed">Donation detail only (one row per donation)</option>
                </select>
              </div>
              <div className="flex items-end">
                <p className="text-sm text-foreground/60 pb-2">
                  Leave dates empty to export all donors who have ever donated. Set a range to filter
                  individual donation rows.
                </p>
              </div>
            </div>
          )}
          <Button className="w-full gap-2" onClick={() => handleGenerateReport()} disabled={downloadLoading || !organizationId}>
            <Calendar className="w-4 h-4" />
            {downloadLoading ? 'Generating report...' : 'Download Custom Report'}
          </Button>
        </div>
      </Card>

      {/* Quick Info */}
      {!loading && stats && (
        <Card className="p-6 bg-primary/5 border-primary/30">
          <h3 className="font-semibold text-foreground mb-3">Quick Insights</h3>
          <div className="space-y-2 text-sm text-foreground/70">
            <p>Blood units by type: {Object.entries(stats.inventory.byBloodType || {}).map(([t, c]) => `${t}: ${c}`).join(', ')}</p>
            <p>Fulfillment rate: {stats.requests.fulfilledThisMonth > 0 ? Math.round((stats.requests.fulfilledThisMonth / (stats.requests.pending + stats.requests.approved + stats.requests.fulfilledThisMonth)) * 100) : 0}%</p>
            <p>Average donor age: {stats.donors.averageAge || 'N/A'}</p>
          </div>
        </Card>
      )}
    </OrgFeatureLayout>
  )
}
