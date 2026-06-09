'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/components/auth/auth-provider'
import { RecordCollectionModal } from '@/components/modals/record-collection-modal'
import {
  InventoryListAuthSkeleton,
  InventoryStatsSkeleton,
  InventoryTableSkeleton,
} from '@/components/dashboard/inventory-skeletons'
import { OrgFeatureLayout } from '@/components/dashboard/org-route-guard'
import { useOrganizationId } from '@/lib/dashboard/use-organization-id'

export default function InventoryPage() {
  const router = useRouter()
  const [inventory, setInventory] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [orgOptions, setOrgOptions] = useState([])
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [lastFetchTime, setLastFetchTime] = useState(0)
  const { user, isLoading: authLoading } = useAuth()
  const organizationId = useOrganizationId()
  const effectiveOrganizationId = user?.role === 'super_admin'
    ? (selectedOrgId || organizationId || '')
    : organizationId

  useEffect(() => {
    if (user?.role !== 'super_admin') return
    let cancelled = false

    async function loadOrganizations() {
      try {
        const res = await fetch('/api/admin/organizations?limit=200')
        const data = await res.json()
        if (!res.ok || cancelled) return
        const orgs = data.data || []
        setOrgOptions(orgs)
        setSelectedOrgId((prev) => {
          if (prev) return prev
          if (organizationId && orgs.some((o) => o.id === organizationId)) return organizationId
          return orgs[0]?.id || ''
        })
      } catch {
        // Non-blocking; existing error message handles empty context
      }
    }

    loadOrganizations()
    return () => {
      cancelled = true
    }
  }, [user?.role, organizationId])

  useEffect(() => {
    // Don't fetch data while auth is still loading
    if (authLoading) {
      return
    }

    const fetchInventory = async () => {
      try {
        // Prevent redundant fetches within 3 seconds (prevents unnecessary refetches on tab switch)
        const now = Date.now()
        if (lastFetchTime && now - lastFetchTime < 3000) {
          setLoading(false)
          return
        }
        setLastFetchTime(now)

        if (!user) {
          setError('User not authenticated')
          setLoading(false)
          return
        }

        if (!effectiveOrganizationId) {
          if (user?.role === 'super_admin') {
            setError('No organization workspace found yet. Add or activate an organization from Platform Admin, then retry.')
          } else {
            setError('No organization assigned')
          }
          setLoading(false)
          return
        }

        const params = new URLSearchParams({
          organizationId: effectiveOrganizationId,
          search: search || '',
          page: '1',
          limit: '10',
        })

        const response = await fetch(`/api/inventory?${params}`)

        if (!response.ok) {
          throw new Error('Failed to fetch inventory')
        }

        const data = await response.json()
        setInventory(data.data)
        setError(null)
      } catch (err) {
        console.error('[v0] Fetch inventory error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(() => {
      setLoading(true)
      fetchInventory()
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [user?.email, user?.role, authLoading, search, lastFetchTime, effectiveOrganizationId])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (!user || !effectiveOrganizationId) return
        const response = await fetch(`/api/dashboard/stats?organizationId=${effectiveOrganizationId}`)

        if (!response.ok) throw new Error('Failed to fetch stats')

        const data = await response.json()
        setStats(data.data)
      } catch (err) {
        console.error('[v0] Fetch stats error:', err)
      }
    }

    fetchStats()
  }, [user, effectiveOrganizationId])

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const getExpiryStatus = (expiryDate) => {
    const now = new Date()
    const expiry = new Date(expiryDate)
    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { text: 'Expired', color: 'bg-destructive/10 text-destructive' }
    if (diffDays <= 3) return { text: 'Critical', color: 'bg-red-500/10 text-red-700' }
    if (diffDays <= 7) return { text: 'Warning', color: 'bg-yellow-500/10 text-yellow-700' }
    return { text: 'Available', color: 'bg-accent/10 text-accent' }
  }

  const getInventoryStatus = (unit) => {
    if (unit?.transfer?.isTransferredOut) {
      return { text: 'Transferred', color: 'bg-blue-500/10 text-blue-700' }
    }
    if (unit?.status === 'reserved') {
      return { text: 'Reserved', color: 'bg-violet-500/10 text-violet-700' }
    }
    if (unit?.status === 'used') {
      return { text: 'Used', color: 'bg-slate-500/10 text-slate-700' }
    }
    if (unit?.status === 'discarded') {
      return { text: 'Discarded', color: 'bg-destructive/10 text-destructive' }
    }
    return getExpiryStatus(unit.expiryDate)
  }

  const statusFilterDefs = [
    { key: 'all', label: 'All' },
    { key: 'available', label: 'Available' },
    { key: 'reserved', label: 'Reserved' },
    { key: 'transferred', label: 'Transferred Out' },
    { key: 'used', label: 'Used' },
    { key: 'discarded', label: 'Discarded' },
    { key: 'expiring', label: 'Expiring <= 7d' },
  ]

  const filteredInventory =
    statusFilter === 'all'
      ? inventory
      : inventory.filter((unit) => {
          if (statusFilter === 'expiring') {
            const now = new Date()
            const expiry = new Date(unit.expiryDate)
            const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
            return unit.status === 'available' && diffDays >= 0 && diffDays <= 7
          }
          if (statusFilter === 'transferred') {
            return Boolean(unit?.transfer?.isTransferredOut)
          }
          return unit.status === statusFilter
        })

  const handleRecordSuccess = (newUnit) => {
    setInventory((prev) => [newUnit, ...prev])
    setIsModalOpen(false)
  }

  // Auth: full skeleton shell (no user yet)
  if (authLoading) {
    return <InventoryListAuthSkeleton />
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <Card className="p-6 border-red-500/50 bg-red-500/5">
          <p className="text-red-600">Please log in to view inventory</p>
        </Card>
      </div>
    )
  }

  return (
    <OrgFeatureLayout
      feature="inventory"
      actions={
        <Button className="gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Record collection
        </Button>
      }
    >
      <RecordCollectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleRecordSuccess}
        organizationId={effectiveOrganizationId}
      />

      {/* Summary Cards */}
      {stats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Units', value: stats.inventory.totalUnits, color: 'bg-secondary/10 text-secondary' },
            { label: 'Available', value: stats.inventory.totalUnits, color: 'bg-accent/10 text-accent' },
            { label: 'Expiring Soon', value: stats.inventory.alerts.expiring, color: 'bg-primary/10 text-primary' },
            { label: 'Expired', value: stats.inventory.alerts.expired, color: 'bg-destructive/10 text-destructive' },
          ].map((stat, idx) => (
            <Card key={idx} className="p-4">
              <p className="text-sm text-foreground/60 mb-2">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </Card>
          ))}
        </div>
      ) : (
        <InventoryStatsSkeleton />
      )}

      {/* Search and Filter */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          {user?.role === 'super_admin' && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-foreground/70 whitespace-nowrap">Viewing organization</span>
              <select
                value={selectedOrgId}
                onChange={(e) => {
                  setSelectedOrgId(e.target.value)
                  setLastFetchTime(0)
                }}
                className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm min-w-[260px]"
              >
                {orgOptions.length === 0 && <option value="">No organizations available</option>}
                {orgOptions.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({(org.type || '').replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <Input
              type="search"
              placeholder="Search by unit ID or donor name..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {statusFilterDefs.map((filter) => {
              const isActive = statusFilter === filter.key
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setStatusFilter(filter.key)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    isActive
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-foreground/70 hover:bg-secondary/20'
                  }`}
                >
                  {filter.label}
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Inventory Table */}
      {error && (
        <Card className="p-6 border-red-500/50 bg-red-500/5">
          <p className="text-red-600">Error: {error}</p>
        </Card>
      )}

      {loading ? (
        <InventoryTableSkeleton rows={8} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-secondary/5">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Unit ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Blood Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Collection Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Expiry Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInventory.length > 0 ? (
                  filteredInventory.map((unit) => {
                    const expiryStatus = getInventoryStatus(unit)
                    return (
                      <tr key={unit._id} className="hover:bg-secondary/5 transition">
                        <td className="px-6 py-4 text-sm font-medium text-foreground">{unit.unitId}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                            {unit.bloodType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground/60">{formatDate(unit.collectionDate)}</td>
                        <td className="px-6 py-4 text-sm text-foreground/60">{formatDate(unit.expiryDate)}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${expiryStatus.color}`}>
                            {expiryStatus.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            className="text-primary hover:underline cursor-pointer"
                            onClick={() => router.push(`/dashboard/inventory/${unit.id || unit._id}`)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-foreground/60">
                      No blood units match this filter
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </OrgFeatureLayout>
  )
}
