'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/components/auth/auth-provider'
import { RecordCollectionModal } from '@/components/modals/record-collection-modal'

export default function InventoryPage() {
  const [inventory, setInventory] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { user, isLoading: authLoading } = useAuth()

  useEffect(() => {
    // Don't fetch data while auth is still loading
    if (authLoading) {
      return
    }

    const fetchInventory = async () => {
      try {
        if (!user) {
          setError('User not authenticated')
          setLoading(false)
          return
        }

        // Handle super admin viewing organization context
        let organizationId = user.organizationId
        
        // For super admins, check if they're viewing a specific organization
        if (user?.role === 'super_admin') {
          try {
            const sessionResponse = await fetch('/api/auth/session')
            if (sessionResponse.ok) {
              const sessionData = await sessionResponse.json()
              if (sessionData.user?.viewingOrganizationId) {
                organizationId = sessionData.user.viewingOrganizationId
              }
            }
          } catch (sessionError) {
            console.log('[Inventory] Could not check session context:', sessionError.message)
          }
          
          // If still no organization ID, get first available organization
          if (!organizationId) {
            try {
              const orgsResponse = await fetch('/api/admin/organizations')
              if (orgsResponse.ok) {
                const orgsData = await orgsResponse.json()
                if (orgsData.data && orgsData.data.length > 0) {
                  organizationId = orgsData.data[0].id
                }
              }
            } catch (orgsError) {
              console.log('[Inventory] Could not fetch organizations:', orgsError.message)
            }
          }
        }
        
        if (!organizationId) {
          if (user?.role === 'super_admin') {
            setError('No organization selected. Please select an organization to view.')
          } else {
            setError('No organization assigned')
          }
          setLoading(false)
          return
        }

        const params = new URLSearchParams({
          organizationId,
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
  }, [user, authLoading, search])

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

  const handleRecordSuccess = (newUnit) => {
    setInventory((prev) => [newUnit, ...prev])
    setIsModalOpen(false)
  }

  // Show loading while auth is initializing or data is loading
  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Blood Inventory</h1>
            <p className="mt-2 text-foreground/60">Track all blood units and stock levels</p>
          </div>
          <Button className="gap-2" disabled>
            <Plus className="w-4 h-4" />
            Record Collection
          </Button>
        </div>

        {/* Loading skeleton */}
        <Card className="overflow-hidden">
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-primary mx-auto mb-4"></div>
            <p className="text-foreground/60">Loading inventory...</p>
          </div>
        </Card>
      </div>
    )
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Blood Inventory</h1>
          <p className="mt-2 text-foreground/60">Track all blood units and stock levels</p>
        </div>
        <Button className="gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Record Collection
        </Button>
      </div>

      <RecordCollectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleRecordSuccess}
        organizationId={user.organizationId || user.id}
      />

      {/* Summary Cards */}
      {stats && (
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
      )}

      {/* Search and Filter */}
      <Card className="p-4">
        <div className="flex gap-4">
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
        </div>
      </Card>

      {/* Inventory Table */}
      {error && (
        <Card className="p-6 border-red-500/50 bg-red-500/5">
          <p className="text-red-600">Error: {error}</p>
        </Card>
      )}

      {loading && (
        <Card className="overflow-hidden">
          <div className="p-6 text-center text-foreground/60">Loading inventory...</div>
        </Card>
      )}

      {!loading && !error && (
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
                {inventory.length > 0 ? (
                  inventory.map((unit) => {
                    const expiryStatus = getExpiryStatus(unit.expiryDate)
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
                          <button className="text-primary hover:underline">View</button>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-foreground/60">
                      No blood units found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
