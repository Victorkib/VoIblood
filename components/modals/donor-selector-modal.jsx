'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Search, UserPlus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function DonorSelectorModal({ isOpen, onClose, onSelect, onAddNew, organizationId }) {
  const [donors, setDonors] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDonor, setSelectedDonor] = useState(null)

  useEffect(() => {
    if (isOpen && organizationId) {
      fetchDonors()
    }
  }, [isOpen, search, organizationId])

  const fetchDonors = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        organizationId,
        search: search || '',
        page: '1',
        limit: '20',
      })

      const response = await fetch(`/api/donors?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch donors')
      }

      const data = await response.json()
      setDonors(data.data || [])
    } catch (err) {
      console.error('[DonorSelector] Fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = () => {
    if (selectedDonor) {
      onSelect(selectedDonor)
      onClose()
    }
  }

  const getBloodTypeBadge = (bloodType) => {
    const colors = {
      'O+': 'bg-red-100 text-red-800',
      'O-': 'bg-red-200 text-red-900',
      'A+': 'bg-blue-100 text-blue-800',
      'A-': 'bg-blue-200 text-blue-900',
      'B+': 'bg-green-100 text-green-800',
      'B-': 'bg-green-200 text-green-900',
      'AB+': 'bg-purple-100 text-purple-800',
      'AB-': 'bg-purple-200 text-purple-900',
    }
    return colors[bloodType] || 'bg-gray-100 text-gray-800'
  }

  const getEligibilityStatus = (donor) => {
    if (!donor.lastDonationDate) {
      return { eligible: true, text: 'Eligible', color: 'text-green-600' }
    }

    const lastDonation = new Date(donor.lastDonationDate)
    const today = new Date()
    const diffDays = Math.floor((today - lastDonation) / (1000 * 60 * 60 * 24))

    if (diffDays < 56) {
      const daysLeft = 56 - diffDays
      return { 
        eligible: false, 
        text: `${daysLeft} days left`, 
        color: 'text-red-600' 
      }
    }

    return { eligible: true, text: 'Eligible', color: 'text-green-600' }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 border-b border-border px-6 py-4 flex items-center justify-between bg-background z-10">
          <h2 className="text-xl font-semibold text-foreground">Select Donor</h2>
          <button onClick={onClose} className="text-foreground/60 hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Add New Donor Button */}
          <Button
            variant="outline"
            onClick={onAddNew}
            className="w-full"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add New Donor
          </Button>

          {/* Donors List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Loading donors...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">
              <p>{error}</p>
            </div>
          ) : donors.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <UserPlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No donors found</p>
              <p className="text-sm mt-1">Click "Add New Donor" to create one</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {donors.map((donor) => {
                const eligibility = getEligibilityStatus(donor)
                const isSelected = selectedDonor?.id === donor.id

                return (
                  <div
                    key={donor.id}
                    onClick={() => setSelectedDonor(donor)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{donor.fullName}</h3>
                          <Badge className={getBloodTypeBadge(donor.bloodType)}>
                            {donor.bloodType}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{donor.email}</p>
                        <p className="text-sm text-gray-600">{donor.phone}</p>
                        {donor.lastDonationDate && (
                          <p className="text-xs text-gray-500 mt-1">
                            Last donation: {new Date(donor.lastDonationDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${eligibility.color}`}>
                          {eligibility.text}
                        </p>
                        {donor.totalDonations > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            {donor.totalDonations} donation{donor.totalDonations !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSelect} 
              disabled={!selectedDonor}
              className="flex-1"
            >
              Select Donor
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
