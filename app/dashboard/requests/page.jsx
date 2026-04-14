'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/components/auth/auth-provider'
import { NewRequestModal } from '@/components/modals/new-request-modal'

export default function RequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { user } = useAuth()

  const statuses = {
    pending: { label: 'Pending', color: 'bg-primary/10 text-primary' },
    approved: { label: 'Approved', color: 'bg-accent/10 text-accent' },
    partially_fulfilled: { label: 'Partially Fulfilled', color: 'bg-secondary/10 text-secondary' },
    fulfilled: { label: 'Fulfilled', color: 'bg-green-500/10 text-green-700' },
    rejected: { label: 'Rejected', color: 'bg-destructive/10 text-destructive' },
    cancelled: { label: 'Cancelled', color: 'bg-foreground/10 text-foreground' },
  }

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        if (!user) return

        const organizationId = user.organizationId || user.id
        const params = new URLSearchParams({
          organizationId,
          search: search || '',
          page: '1',
          limit: '10',
        })

        const response = await fetch(`/api/requests?${params}`)

        if (!response.ok) {
          throw new Error('Failed to fetch requests')
        }

        const data = await response.json()
        setRequests(data.data)
        setError(null)
      } catch (err) {
        console.error('[v0] Fetch requests error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(() => {
      setLoading(true)
      fetchRequests()
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [user, search])

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
    const now = new Date()
    const d = new Date(date)
    const diffMs = now - d
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays} days ago`
  }

  const getBloodTypesList = (requirements) => {
    return requirements.map((r) => r.bloodType).join(', ')
  }

  const getTotalQuantity = (requirements) => {
    return requirements.reduce((sum, r) => sum + r.quantity, 0)
  }

  const handleCreateRequestSuccess = (newRequest) => {
    setRequests((prev) => [newRequest, ...prev])
    setIsModalOpen(false)
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <Card className="p-6 border-red-500/50 bg-red-500/5">
          <p className="text-red-600">Please log in to view requests</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Hospital Requests</h1>
          <p className="mt-2 text-foreground/60">Manage blood requests from hospitals and healthcare facilities</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>New Request</Button>
      </div>

      <NewRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCreateRequestSuccess}
        organizationId={user.organizationId || user.id}
      />

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Pending', value: stats.requests.pending, color: 'bg-primary/10 text-primary' },
            { label: 'Approved', value: stats.requests.approved, color: 'bg-secondary/10 text-secondary' },
            { label: 'Fulfilled (Month)', value: stats.requests.fulfilledThisMonth, color: 'bg-accent/10 text-accent' },
            { label: 'Total Donors (Month)', value: stats.activities.donationsThisMonth, color: 'bg-green-500/10 text-green-700' },
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
              placeholder="Search by hospital name or request ID..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Requests Table */}
      {error && (
        <Card className="p-6 border-red-500/50 bg-red-500/5">
          <p className="text-red-600">Error: {error}</p>
        </Card>
      )}

      {loading && (
        <Card className="overflow-hidden">
          <div className="p-6 text-center text-foreground/60">Loading requests...</div>
        </Card>
      )}

      {!loading && !error && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-secondary/5">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Request ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Hospital</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Blood Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Quantity</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.length > 0 ? (
                  requests.map((req) => {
                    const statusInfo = statuses[req.status] || statuses.pending
                    return (
                      <tr key={req._id} className="hover:bg-secondary/5 transition">
                        <td className="px-6 py-4 text-sm font-medium text-foreground">{req.requestId}</td>
                        <td className="px-6 py-4 text-sm text-foreground/60">{req.requestingOrganizationName}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="inline-flex items-center rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">
                            {getBloodTypesList(req.bloodRequirements)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground/60">{getTotalQuantity(req.bloodRequirements)} units</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground/60">{formatDate(req.createdAt)}</td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            className="text-accent hover:underline"
                            onClick={() => router.push(`/dashboard/requests/${req.id || req._id}`)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-foreground/60">
                      No requests found
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
