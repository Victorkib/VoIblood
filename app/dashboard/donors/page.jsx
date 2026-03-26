'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/components/auth/auth-provider'
import { AddDonorModal } from '@/components/modals/add-donor-modal'

export default function DonorsPage() {
  const [donors, setDonors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    const fetchDonors = async () => {
      try {
        if (!user) return

        const organizationId = user.organizationId || user.id
        const params = new URLSearchParams({
          organizationId,
          search: search || '',
          page: page.toString(),
          limit: '10',
        })

        const response = await fetch(`/api/donors?${params}`)

        if (!response.ok) {
          throw new Error('Failed to fetch donors')
        }

        const data = await response.json()
        setDonors(data.data)
        setError(null)
      } catch (err) {
        console.error('[v0] Fetch donors error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(() => {
      setLoading(true)
      fetchDonors()
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [user, search, page])

  const formatLastDonation = (date) => {
    if (!date) return 'Never'
    const now = new Date()
    const diffMs = now - new Date(date)
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays} days ago`
  }

  const handleAddDonorSuccess = (newDonor) => {
    setDonors((prev) => [newDonor, ...prev])
    setIsModalOpen(false)
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <Card className="p-6 border-red-500/50 bg-red-500/5">
          <p className="text-red-600">Please log in to view donors</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Donors</h1>
          <p className="mt-2 text-foreground/60">Manage donor information and eligibility</p>
        </div>
        <Button className="gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Donor
        </Button>
      </div>

      <AddDonorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleAddDonorSuccess}
        organizationId={user.organizationId || user.id}
      />

      {/* Search and Filter */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <Input
              type="search"
              placeholder="Search by name, email, or phone..."
              className="pl-10"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>
      </Card>

      {/* Donors Table */}
      {error && (
        <Card className="p-6 border-red-500/50 bg-red-500/5">
          <p className="text-red-600">Error: {error}</p>
        </Card>
      )}

      {loading && (
        <Card className="overflow-hidden">
          <div className="p-6 text-center text-foreground/60">Loading donors...</div>
        </Card>
      )}

      {!loading && !error && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-secondary/5">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Blood Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Contact</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Last Donation</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {donors.length > 0 ? (
                  donors.map((donor) => (
                    <tr key={donor._id} className="hover:bg-secondary/5 transition">
                      <td className="px-6 py-4 text-sm text-foreground">{donor.firstName} {donor.lastName}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          {donor.bloodType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground/60">{donor.phone}</td>
                      <td className="px-6 py-4 text-sm text-foreground/60">{formatLastDonation(donor.lastDonationDate)}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                          donor.donationStatus === 'available'
                            ? 'bg-green-500/10 text-green-700'
                            : donor.donationStatus === 'deferred'
                              ? 'bg-yellow-500/10 text-yellow-700'
                              : 'bg-red-500/10 text-red-700'
                        }`}>
                          {donor.donationStatus.charAt(0).toUpperCase() + donor.donationStatus.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button className="text-primary hover:underline">View</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-foreground/60">
                      No donors found
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
