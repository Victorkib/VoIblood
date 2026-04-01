'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Calendar, Package, Users, TrendingUp, AlertCircle } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'

export default function ReportsPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reportType, setReportType] = useState('inventory')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [format, setFormat] = useState('pdf')
  const { user } = useAuth()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (!user) return

        const organizationId = user.organizationId || user.id
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
  }, [user])

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

  const handleGenerateReport = async () => {
    try {
      if (!user) return

      const organizationId = user.organizationId || user.id
      const params = new URLSearchParams({
        organizationId,
        reportType,
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: endDate || new Date().toISOString().split('T')[0],
        format,
      })

      const response = await fetch(`/api/reports/export?${params}`)

      if (!response.ok) {
        throw new Error('Failed to generate report')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${reportType}-${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : format === 'csv' ? 'csv' : 'xlsx'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('[v0] Generate report error:', err)
      alert(`Error: ${err.message}`)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
        <p className="mt-2 text-foreground/60">View comprehensive reports and data insights</p>
      </div>

      {error && (
        <Card className="p-6 border-red-500/50 bg-red-500/5">
          <p className="text-red-600">Error: {error}</p>
        </Card>
      )}

      {/* Key Metrics */}
      {!loading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-foreground/60 mb-1">Total Units in Stock</p>
            <p className="text-2xl font-bold text-foreground">{stats.inventory.totalUnits}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-foreground/60 mb-1">Active Donors</p>
            <p className="text-2xl font-bold text-foreground">{stats.donors.available}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-foreground/60 mb-1">Pending Requests</p>
            <p className="text-2xl font-bold text-foreground">{stats.requests.pending}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-foreground/60 mb-1">Units Expiring</p>
            <p className="text-2xl font-bold text-red-600">{stats.inventory.alerts.expiring}</p>
          </Card>
        </div>
      )}

      {/* Report Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report, idx) => {
          const Icon = report.icon
          return (
            <Card
              key={idx}
              className="p-6 hover:border-primary/30 hover:shadow-lg transition cursor-pointer"
              onClick={() => setReportType(report.key)}
            >
              <div className={`mb-4 p-3 rounded-lg bg-secondary/10 w-fit`}>
                <Icon className={`w-6 h-6 ${report.color}`} />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{report.title}</h3>
              <p className="text-sm text-foreground/60 mb-4">{report.description}</p>
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setReportType(report.key)}>
                <Download className="w-4 h-4" />
                Generate
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
          <Button className="w-full gap-2" onClick={handleGenerateReport}>
            <Calendar className="w-4 h-4" />
            Generate Custom Report
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
    </div>
  )
}
