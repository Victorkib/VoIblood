'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { UserSearch, UserPlus, X, Droplet, Info } from 'lucide-react'
import { FormField } from '@/components/ui/form-error'
import { DonorSelectorModal } from './donor-selector-modal'
import { QuickDonorModal } from './quick-donor-modal'

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function RecordCollectionModal({ isOpen, onClose, onSuccess, organizationId }) {
  const [formData, setFormData] = useState({
    donorId: '',
    donorName: '',
    donorEmail: '',
    bloodType: 'O+',
    volume: '450',
    collectionDate: new Date().toISOString().split('T')[0],
    collectionMethod: 'venipuncture',
    driveId: '',
    driveName: '',
    technician: '',
    notes: '',
    eligibilityStatus: 'pending',
    bloodWorkFindings: '',
    recommendations: '',
    testResults: {
      hiv: 'negative',
      hepatitisB: 'negative',
      hepatitisC: 'negative',
      syphilis: 'negative',
    },
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [donorSelectorOpen, setDonorSelectorOpen] = useState(false)
  const [quickDonorOpen, setQuickDonorOpen] = useState(false)
  const [drives, setDrives] = useState([])
  const [drivesLoading, setDrivesLoading] = useState(false)

  const bloodTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
  const testStatuses = ['negative', 'positive', 'inconclusive']
  const eligibilityStatuses = [
    { value: 'eligible', label: 'Eligible for next donation' },
    { value: 'temporarily_deferred', label: 'Temporarily deferred' },
    { value: 'ineligible', label: 'Needs follow-up' },
    { value: 'pending', label: 'Pending review' },
  ]

  useEffect(() => {
    if (isOpen && organizationId) {
      fetchDrives()
      setError(null)
      setFieldErrors({})
    }
  }, [isOpen, organizationId])

  const fetchDrives = async () => {
    try {
      setDrivesLoading(true)
      const res = await fetch('/api/admin/drives?status=&search=')
      if (res.ok) {
        const data = await res.json()
        const orgDrives = (data.data || []).filter(
          (d) => d.organizationId === organizationId || d.organizationId?._id === organizationId
        )
        setDrives(orgDrives)
      }
    } catch (err) {
      console.error('Failed to fetch drives:', err)
    } finally {
      setDrivesLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const handleTestChange = (testName, value) => {
    setFormData((prev) => ({
      ...prev,
      testResults: { ...prev.testResults, [testName]: value },
    }))
  }

  const handleDonorSelect = (donor) => {
    const fullName =
      (donor.fullName && String(donor.fullName).trim()) ||
      `${donor.firstName || ''} ${donor.lastName || ''}`.trim() ||
      'Donor'
    setFormData((prev) => ({
      ...prev,
      donorId: donor.id || donor._id,
      donorName: fullName,
      donorEmail: donor.email,
      bloodType: donor.bloodType,
    }))
  }

  const handleQuickDonorCreate = (newDonor) => {
    handleDonorSelect(newDonor)
  }

  const resetForm = () => {
    setFormData({
      donorId: '',
      donorName: '',
      donorEmail: '',
      bloodType: 'O+',
      volume: '450',
      collectionDate: new Date().toISOString().split('T')[0],
      collectionMethod: 'venipuncture',
      driveId: '',
      driveName: '',
      technician: '',
      notes: '',
      eligibilityStatus: 'pending',
      bloodWorkFindings: '',
      recommendations: '',
      testResults: {
        hiv: 'negative',
        hepatitisB: 'negative',
        hepatitisC: 'negative',
        syphilis: 'negative',
      },
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const errors = {}
    if (!formData.donorName.trim()) errors.donorName = 'Donor name is required'
    if (!formData.bloodType) errors.bloodType = 'Blood type is required'
    if (!formData.volume || parseInt(formData.volume, 10) < 200) errors.volume = 'Volume must be at least 200ml'
    if (!formData.collectionDate) errors.collectionDate = 'Collection date is required'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setError('Please fix the errors below')
      return
    }

    setLoading(true)
    setError(null)

    const unitId = `UNIT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    const collectionDateObj = new Date(formData.collectionDate)
    const expiryDateObj = new Date(collectionDateObj)
    expiryDateObj.setDate(expiryDateObj.getDate() + 35)

    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          organizationId,
          unitId,
          volume: parseInt(formData.volume, 10),
          expiryDate: expiryDateObj.toISOString(),
        }),
      })

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        throw new Error(errJson.message || errJson.error || 'Failed to record collection')
      }

      const data = await response.json()
      onSuccess(data.data)
      resetForm()
      onClose()
    } catch (err) {
      console.error('[RecordCollectionModal]', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setError(null)
            onClose()
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[min(92vh,900px)] w-[calc(100vw-1.25rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-xl p-0 shadow-2xl sm:max-w-xl md:max-w-2xl"
        >
          <div className="relative shrink-0 border-b border-white/10 bg-gradient-to-br from-red-700 via-red-600 to-rose-700 px-5 pb-4 pt-5 text-white sm:px-6 sm:pb-5 sm:pt-6">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-9 w-9 text-white hover:bg-white/15 sm:right-3 sm:top-3"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
            <DialogHeader className="space-y-2 pr-10 text-left sm:pr-12">
              <DialogTitle className="flex items-start gap-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 shadow-inner ring-1 ring-white/20">
                  <Droplet className="h-5 w-5 text-white sm:h-6 sm:w-6" aria-hidden />
                </span>
                <span className="min-w-0 pt-0.5 leading-snug">Record blood collection</span>
              </DialogTitle>
              <DialogDescription className="text-left text-sm leading-relaxed text-white/85">
                Log a collected unit into inventory and capture screening and follow-up notes for the donor record.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-4 sm:px-6 sm:py-5">
              <div className="space-y-5">
                {error && (
                  <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 sm:p-4">
                    <span className="font-semibold shrink-0">Error</span>
                    <span className="min-w-0 break-words">{error}</span>
                  </div>
                )}

                <section className="rounded-xl border border-border/80 bg-muted/30 p-4 sm:p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden />
                    Donor
                  </h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-full justify-center border-dashed sm:justify-start"
                      onClick={() => setDonorSelectorOpen(true)}
                    >
                      <UserSearch className="mr-2 h-4 w-4" />
                      Select existing
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-full justify-center border-dashed sm:justify-start"
                      onClick={() => setQuickDonorOpen(true)}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Quick add donor
                    </Button>
                  </div>
                  {formData.donorId ? (
                    <div className="mt-3 rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-3 py-2.5 text-sm text-emerald-950">
                      <p className="font-semibold text-emerald-900">Donor linked</p>
                      <p className="mt-0.5 font-medium">{formData.donorName}</p>
                      <p className="mt-1 text-xs text-emerald-800/90 break-all">
                        {formData.donorEmail} · {formData.bloodType}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Choose an existing donor or create one — details below stay editable.
                    </p>
                  )}
                </section>

                <section className="rounded-xl border border-border/80 bg-background p-4 sm:p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />
                    Drive link <span className="font-normal normal-case text-muted-foreground/80">(optional)</span>
                  </h3>
                  <select
                    value={formData.driveId}
                    onChange={(e) => {
                      const selectedDrive = drives.find((d) => (d.id || d._id) === e.target.value)
                      setFormData((prev) => ({
                        ...prev,
                        driveId: selectedDrive?.id || selectedDrive?._id || '',
                        driveName: selectedDrive?.name || '',
                      }))
                    }}
                    className={selectClass}
                    disabled={drivesLoading || drives.length === 0}
                  >
                    <option value="">No drive — ad-hoc collection</option>
                    {drives.map((drive) => (
                      <option key={drive.id || drive._id} value={drive.id || drive._id}>
                        {drive.name} · {new Date(drive.date).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                  {drivesLoading && <p className="mt-2 text-xs text-muted-foreground">Loading drives…</p>}
                  {!drivesLoading && drives.length === 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">No drives for this organization.</p>
                  )}
                </section>

                <section className="rounded-xl border border-border/80 bg-muted/20 p-4 sm:p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
                    Donor details
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Donor name" error={fieldErrors.donorName} required>
                      <Input
                        type="text"
                        name="donorName"
                        value={formData.donorName}
                        onChange={handleInputChange}
                        placeholder="Full name"
                        readOnly={!!formData.donorId}
                        className={`h-10 ${fieldErrors.donorName ? 'border-red-600' : ''}`}
                      />
                    </FormField>
                    <FormField label="Email" error={fieldErrors.donorEmail}>
                      <Input
                        type="email"
                        name="donorEmail"
                        value={formData.donorEmail}
                        onChange={handleInputChange}
                        placeholder="email@example.com"
                        readOnly={!!formData.donorId}
                        className={`h-10 ${fieldErrors.donorEmail ? 'border-red-600' : ''}`}
                      />
                    </FormField>
                    <FormField label="Blood type" error={fieldErrors.bloodType} required>
                      <select
                        name="bloodType"
                        value={formData.bloodType}
                        onChange={handleInputChange}
                        className={`${selectClass} ${fieldErrors.bloodType ? 'border-red-600' : ''}`}
                      >
                        {bloodTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Collection method">
                      <select
                        name="collectionMethod"
                        value={formData.collectionMethod}
                        onChange={handleInputChange}
                        className={selectClass}
                      >
                        <option value="venipuncture">Venipuncture</option>
                        <option value="apheresis">Apheresis</option>
                        <option value="plasmapheresis">Plasmapheresis</option>
                      </select>
                    </FormField>
                    <FormField label="Volume (ml)" error={fieldErrors.volume} required hint="Standard 450 ml; min 200 ml">
                      <Input
                        type="number"
                        name="volume"
                        value={formData.volume}
                        onChange={handleInputChange}
                        placeholder="450"
                        min="200"
                        max="500"
                        className={`h-10 ${fieldErrors.volume ? 'border-red-600' : ''}`}
                      />
                    </FormField>
                    <FormField label="Collection date" error={fieldErrors.collectionDate} required>
                      <Input
                        type="date"
                        name="collectionDate"
                        value={formData.collectionDate}
                        onChange={handleInputChange}
                        max={new Date().toISOString().split('T')[0]}
                        className={`h-10 ${fieldErrors.collectionDate ? 'border-red-600' : ''}`}
                      />
                    </FormField>
                  </div>
                </section>

                <section className="rounded-xl border border-border/80 bg-background p-4 sm:p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-500" aria-hidden />
                    Staff & notes
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Technician</label>
                      <Input
                        type="text"
                        value={formData.technician}
                        onChange={(e) => setFormData((prev) => ({ ...prev, technician: e.target.value }))}
                        placeholder="Who collected this unit?"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Notes</label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                        placeholder="Site, reactions, special handling…"
                        rows={3}
                        className="min-h-[5rem] resize-y text-sm"
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-border/80 bg-muted/20 p-4 sm:p-5">
                  <h3 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
                    Test results
                  </h3>
                  <p className="mb-3 text-xs text-muted-foreground">Infectious markers recorded with this unit.</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {['hiv', 'hepatitisB', 'hepatitisC', 'syphilis'].map((test) => (
                      <div key={test} className="space-y-1.5">
                        <label className="text-sm font-medium">
                          {test === 'hiv'
                            ? 'HIV'
                            : test === 'hepatitisB'
                              ? 'Hepatitis B'
                              : test === 'hepatitisC'
                                ? 'Hepatitis C'
                                : 'Syphilis'}
                        </label>
                        <select
                          value={formData.testResults[test]}
                          onChange={(e) => handleTestChange(test, e.target.value)}
                          className={selectClass}
                        >
                          {testStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-xl border border-border/80 bg-background p-4 sm:p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                    Donor follow-up
                  </h3>
                  <p className="mb-3 text-xs text-muted-foreground">Used in post-collection communications where configured.</p>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Eligibility status</label>
                      <select
                        value={formData.eligibilityStatus}
                        onChange={(e) => setFormData((prev) => ({ ...prev, eligibilityStatus: e.target.value }))}
                        className={selectClass}
                      >
                        {eligibilityStatuses.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Blood work findings</label>
                      <Textarea
                        value={formData.bloodWorkFindings}
                        onChange={(e) => setFormData((prev) => ({ ...prev, bloodWorkFindings: e.target.value }))}
                        placeholder="Summary for the donor file or letter."
                        rows={3}
                        className="min-h-[5rem] resize-y text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Recommendations</label>
                      <Textarea
                        value={formData.recommendations}
                        onChange={(e) => setFormData((prev) => ({ ...prev, recommendations: e.target.value }))}
                        placeholder="Diet, hydration, when to donate again…"
                        rows={3}
                        className="min-h-[5rem] resize-y text-sm"
                      />
                    </div>
                  </div>
                </section>

                <div className="flex gap-3 rounded-lg border border-blue-200/80 bg-blue-50/90 px-3 py-3 text-xs text-blue-950 sm:px-4">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                  <p className="leading-relaxed">
                    Expiry is calculated from the collection date (RBC shelf life). Run validation from the inventory list
                    after saving if your workflow requires it.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="shrink-0 gap-2 border-t bg-muted/40 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 sm:w-auto"
              >
                {loading ? 'Recording…' : 'Record collection'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DonorSelectorModal
        isOpen={donorSelectorOpen}
        onClose={() => setDonorSelectorOpen(false)}
        onSelect={handleDonorSelect}
        onAddNew={() => {
          setDonorSelectorOpen(false)
          setQuickDonorOpen(true)
        }}
        organizationId={organizationId}
      />

      <QuickDonorModal
        isOpen={quickDonorOpen}
        onClose={() => setQuickDonorOpen(false)}
        onSuccess={handleQuickDonorCreate}
        organizationId={organizationId}
      />
    </>
  )
}
