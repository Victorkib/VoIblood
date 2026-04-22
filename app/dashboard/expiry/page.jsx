'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'

export default function ExpiryPage() {
  const [allUnits, setAllUnits] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user } = useAuth()

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        if (!user) return

        const organizationId = user.organizationId || user.id
        const response = await fetch(`/api/inventory?organizationId=${organizationId}&limit=100`)

        if (!response.ok) throw new Error('Failed to fetch inventory')

        const data = await response.json()
        setAllUnits(data.data || [])
        setError(null)
      } catch (err) {
        console.error('[v0] Fetch inventory error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(() => {
      fetchInventory()
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [user])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (!user) return

        const organizationId = user.organizationId || user.id
        const response = await fetch(`/api/dashboard/stats?organizationId=${organizationId}`)

        if (!response.ok) throw new Error('Failed to fetch stats')

        const data = await response.json()
        setStats(data.data)
      } catch (err) {
        console.error('[v0] Fetch stats error:', err)
      }
    }

    fetchStats()
  }, [user])

  const categorizeUnits = () => {
    const now = new Date()
    const expired = []
    const critical = [] // 1-3 days
    const warning = [] // 4-7 days

    allUnits.forEach((unit) => {
      const expiryDate = new Date(unit.expiryDate)
      const diffMs = expiryDate - now
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays < 0) {
        expired.push({ ...unit, daysRemaining: Math.abs(diffDays) })
      } else if (diffDays <= 3) {
        critical.push({ ...unit, daysRemaining: diffDays })
      } else if (diffDays <= 7) {
        warning.push({ ...unit, daysRemaining: diffDays })
      }
    })

    return { expired, critical, warning }
  }

  const handleDiscard = async (unitId) => {
    try {
      const response = await fetch(`/api/inventory/${unitId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
        body: JSON.stringify({ action: 'discard', reason: 'Expired' }),
      })

      if (!response.ok) throw new Error('Failed to discard unit')

      setAllUnits((prev) => prev.filter((u) => u._id !== unitId))
    } catch (err) {
      console.error('[v0] Discard error:', err)
      alert(`Error: ${err.message}`)
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <Card className="p-6 border-red-500/50 bg-red-500/5">
          <p className="text-red-600">Please log in to view expiry alerts</p>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Expiry Monitoring</h1>
        <p className="text-foreground/60">Track and manage blood units approaching expiration</p>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((idx) => (
            <Card key={idx} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-3 animate-pulse"></div>
                  <div className="h-8 bg-gray-300 rounded w-16 animate-pulse"></div>
                </div>
                <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </Card>
          ))}
        </div>

        {/* Table Skeleton */}
        <Card className="overflow-hidden">
          <div className="border-b border-border px-6 py-4">
            <div className="h-5 bg-gray-200 rounded w-40 animate-pulse"></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-destructive/5">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Unit ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Blood Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Expiry Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Days Expired</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[1, 2, 3, 4, 5].map((idx) => (
                  <tr key={idx} className="hover:bg-destructive/5 transition">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div></td>
                    <td className="px-6 py-4"><div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    )
  }

  const { expired, critical, warning } = categorizeUnits()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Expiry Monitoring</h1>
        <p className="mt-2 text-foreground/60">Track and manage blood units approaching expiration</p>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 border-destructive/30 bg-destructive/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground/60 mb-1">Expired Units</p>
              <p className="text-3xl font-bold text-destructive">{expired.length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-destructive opacity-20" />
          </div>
        </Card>

        <Card className="p-6 border-primary/30 bg-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground/60 mb-1">Expiring in 1-3 Days</p>
              <p className="text-3xl font-bold text-primary">{critical.length}</p>
            </div>
            <Clock className="w-8 h-8 text-primary opacity-20" />
          </div>
        </Card>

        <Card className="p-6 border-accent/30 bg-accent/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground/60 mb-1">Expiring in 4-7 Days</p>
              <p className="text-3xl font-bold text-accent">{warning.length}</p>
            </div>
            <Clock className="w-8 h-8 text-accent opacity-20" />
          </div>
        </Card>
      </div>

      {error && (
        <Card className="p-6 border-red-500/50 bg-red-500/5">
          <p className="text-red-600">Error: {error}</p>
        </Card>
      )}

      {/* Expired Units Table */}
      {expired.length > 0 && (
        <Card>
          <div className="border-b border-border px-6 py-4">
            <h3 className="font-semibold text-foreground">Expired Units (Action Required)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-destructive/5">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Unit ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Blood Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Expiry Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Days Expired</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expired.map((unit) => (
                  <tr key={unit._id} className="hover:bg-destructive/5 transition">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{unit.unitId}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {unit.bloodType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-destructive font-medium">{formatDate(unit.expiryDate)}</td>
                    <td className="px-6 py-4 text-sm text-destructive">{unit.daysRemaining} days</td>
                    <td className="px-6 py-4 text-sm">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDiscard(unit._id)}
                      >
                        Discard
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Critical Expiry Units */}
      {critical.length > 0 && (
        <Card>
          <div className="border-b border-border px-6 py-4">
            <h3 className="font-semibold text-foreground">Critical (Expiring in 1-3 Days)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-primary/5">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Unit ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Blood Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Expiry Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Days Remaining</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {critical.map((unit) => (
                  <tr key={unit._id} className="hover:bg-primary/5 transition">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{unit.unitId}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">
                        {unit.bloodType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-primary font-medium">{formatDate(unit.expiryDate)}</td>
                    <td className="px-6 py-4 text-sm text-primary">{unit.daysRemaining} days</td>
                    <td className="px-6 py-4 text-sm">
                      <button className="text-primary hover:underline">Priority Request</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Warning Expiry Units */}
      {warning.length > 0 && (
        <Card>
          <div className="border-b border-border px-6 py-4">
            <h3 className="font-semibold text-foreground">Warning (Expiring in 4-7 Days)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-accent/5">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Unit ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Blood Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Expiry Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Days Remaining</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {warning.map((unit) => (
                  <tr key={unit._id} className="hover:bg-accent/5 transition">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{unit.unitId}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">
                        {unit.bloodType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-accent font-medium">{formatDate(unit.expiryDate)}</td>
                    <td className="px-6 py-4 text-sm text-accent">{unit.daysRemaining} days</td>
                    <td className="px-6 py-4 text-sm">
                      <button className="text-accent hover:underline">View Options</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {expired.length === 0 && critical.length === 0 && warning.length === 0 && (
        <Card className="p-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-semibold text-foreground mb-2">All Units Healthy</p>
          <p className="text-foreground/60">No blood units are expiring or expired in the monitored period.</p>
        </Card>
      )}
    </div>
  )
}
