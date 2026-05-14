'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search, UserPlus, X, Users } from 'lucide-react'

function donorKey(d) {
  return d?.id ?? d?._id ?? ''
}

export function DonorSelectorModal({ isOpen, onClose, onSelect, onAddNew, organizationId }) {
  const [donors, setDonors] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDonor, setSelectedDonor] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setSelectedDonor(null)
    }
  }, [isOpen])

  const fetchDonors = useCallback(async () => {
    if (!organizationId) return
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        organizationId,
        search: search || '',
        page: '1',
        limit: '40',
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
  }, [organizationId, search])

  useEffect(() => {
    if (isOpen && organizationId) {
      fetchDonors()
    }
  }, [isOpen, organizationId, fetchDonors])

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
        color: 'text-red-600',
      }
    }

    return { eligible: true, text: 'Eligible', color: 'text-green-600' }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[min(90vh,720px)] w-[calc(100vw-1.25rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-w-xl md:max-w-2xl"
      >
        <div className="relative shrink-0 border-b border-white/10 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800 px-5 pb-4 pt-5 text-white sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-9 w-9 text-white hover:bg-white/15"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
          <DialogHeader className="space-y-1 pr-10 text-left">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold text-white sm:text-2xl">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                <Users className="h-5 w-5" aria-hidden />
              </span>
              Select donor
            </DialogTitle>
            <DialogDescription className="text-left text-sm text-white/80">
              Search your roster, tap a row, then confirm. Opens above the collection form.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 space-y-3 border-b bg-muted/30 px-4 py-3 sm:px-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Name, email, or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-10"
              />
            </div>
            <Button type="button" variant="outline" className="h-10 w-full border-dashed" onClick={onAddNew}>
              <UserPlus className="mr-2 h-4 w-4" />
              Quick add new donor
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-3 sm:px-5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm">Loading donors…</p>
              </div>
            ) : error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-800">
                {error}
              </div>
            ) : donors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center text-muted-foreground">
                <UserPlus className="mb-2 h-12 w-12 opacity-40" />
                <p className="font-medium text-foreground">No donors match</p>
                <p className="mt-1 max-w-xs text-sm">Try another search or quick add a new donor.</p>
              </div>
            ) : (
              <ul className="space-y-2 pb-1">
                {donors.map((donor) => {
                  const eligibility = getEligibilityStatus(donor)
                  const id = donorKey(donor)
                  const isSelected = selectedDonor && donorKey(selectedDonor) === id
                  const displayName =
                    donor.fullName?.trim() ||
                    `${donor.firstName || ''} ${donor.lastName || ''}`.trim() ||
                    'Donor'
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => setSelectedDonor(donor)}
                        className={`w-full rounded-xl border p-3 text-left transition-all sm:p-4 ${
                          isSelected
                            ? 'border-primary bg-primary/8 ring-2 ring-primary/25'
                            : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-foreground">{displayName}</span>
                              <Badge className={getBloodTypeBadge(donor.bloodType)}>{donor.bloodType}</Badge>
                            </div>
                            <p className="mt-1 break-all text-sm text-muted-foreground">{donor.email}</p>
                            <p className="break-all text-sm text-muted-foreground">{donor.phone}</p>
                            {donor.lastDonationDate && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Last donation: {new Date(donor.lastDonationDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 text-left sm:text-right">
                            <p className={`text-sm font-medium ${eligibility.color}`}>{eligibility.text}</p>
                            {donor.totalDonations > 0 && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {donor.totalDonations} donation{donor.totalDonations !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t bg-muted/40 px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              className="w-full bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black sm:w-auto"
              onClick={handleSelect}
              disabled={!selectedDonor}
            >
              Use selected donor
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
