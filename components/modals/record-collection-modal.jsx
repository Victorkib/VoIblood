'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, UserSearch, UserPlus } from 'lucide-react'
import { useFormValidation } from '@/lib/use-form-validation'
import { FormField, FormError } from '@/components/ui/form-error'
import { DonorSelectorModal } from './donor-selector-modal'
import { QuickDonorModal } from './quick-donor-modal'

export function RecordCollectionModal({ isOpen, onClose, onSuccess, organizationId }) {
  const [formData, setFormData] = useState({
    donorId: '',
    donorName: '',
    donorEmail: '',
    bloodType: 'O+',
    volume: '450',
    collectionDate: new Date().toISOString().split('T')[0],
    collectionMethod: 'venipuncture',
    // New fields
    driveId: '',
    driveName: '',
    technician: '',
    notes: '',
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
  
  // Drive selection
  const [drives, setDrives] = useState([])
  const [drivesLoading, setDrivesLoading] = useState(false)
  
  // Fetch drives on mount
  useEffect(() => {
    if (isOpen && organizationId) {
      fetchDrives()
    }
  }, [isOpen, organizationId])

  const fetchDrives = async () => {
    try {
      setDrivesLoading(true)
      const res = await fetch(`/api/admin/drives?status=&search=`)
      if (res.ok) {
        const data = await res.json()
        console.log("Drives data:", data)
        // Filter by organization
        const orgDrives = (data.data || []).filter(d => 
          d.organizationId === organizationId || d.organizationId?._id === organizationId
        )
        setDrives(orgDrives)
      }
    } catch (err) {
      console.error('Failed to fetch drives:', err)
    } finally {
      setDrivesLoading(false)
    }
  }
  const { validate } = useFormValidation('inventory')

  const bloodTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
  const testStatuses = ['negative', 'positive', 'inconclusive']

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
    setFormData((prev) => ({
      ...prev,
      donorId: donor.id,
      donorName: donor.fullName,
      donorEmail: donor.email,
      bloodType: donor.bloodType,
    }))
  }

  const handleQuickDonorCreate = (newDonor) => {
    handleDonorSelect(newDonor)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Basic validation for required fields
    const errors = {}
    if (!formData.donorName.trim()) errors.donorName = 'Donor name is required'
    if (!formData.bloodType) errors.bloodType = 'Blood type is required'
    if (!formData.volume || parseInt(formData.volume) < 200) errors.volume = 'Volume must be at least 200ml'
    if (!formData.collectionDate) errors.collectionDate = 'Collection date is required'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setError('Please fix the errors below')
      return
    }

    setLoading(true)
    setError(null)

    // Generate unitId and expiryDate
    const unitId = `UNIT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    const collectionDateObj = new Date(formData.collectionDate)
    const expiryDateObj = new Date(collectionDateObj)
    expiryDateObj.setDate(expiryDateObj.getDate() + 35) // RBC expires in 35 days

    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          organizationId,
          unitId,
          volume: parseInt(formData.volume),
          expiryDate: expiryDateObj.toISOString(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to record collection')
      }

      const data = await response.json()
      onSuccess(data.data)
      setFormData({
        donorName: '',
        donorEmail: '',
        bloodType: 'O+',
        volume: '450',
        collectionDate: new Date().toISOString().split('T')[0],
        collectionMethod: 'venipuncture',
        testResults: {
          hiv: 'negative',
          hepatitisB: 'negative',
          hepatitisC: 'negative',
          syphilis: 'negative',
        },
      })
      onClose()
    } catch (err) {
      console.error('[v0] Record collection error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 border-b border-border px-6 py-4 flex items-center justify-between bg-background">
          <h2 className="text-xl font-semibold text-foreground">Record Blood Collection</h2>
          <button onClick={onClose} className="text-foreground/60 hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/50 text-sm text-red-700 flex items-start gap-2">
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          )}

          {/* Donor Selection Section */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Donor Information
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDonorSelectorOpen(true)}
                className="w-full"
              >
                <UserSearch className="w-4 h-4 mr-2" />
                Select Existing
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuickDonorOpen(true)}
                className="w-full"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add New Donor
              </Button>
            </div>
            {formData.donorId && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-900">✓ Donor Selected</p>
                <p className="text-sm text-green-800">{formData.donorName}</p>
                <p className="text-xs text-green-700">{formData.donorEmail} • {formData.bloodType}</p>
              </div>
            )}
          </div>

          {/* Drive Association (Optional) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Donation Drive <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <select
              value={formData.driveId}
              onChange={(e) => {
                const selectedDrive = drives.find(d => d.id === e.target.value || d._id === e.target.value)
                setFormData(prev => ({
                  ...prev,
                  driveId: selectedDrive?.id || selectedDrive?._id || '',
                  driveName: selectedDrive?.name || '',
                }))
              }}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={drivesLoading || drives.length === 0}
            >
              <option value="">-- Select a drive (optional) --</option>
              {drives.map((drive) => (
                <option key={drive.id || drive._id} value={drive.id || drive._id}>
                  {drive.name} • {new Date(drive.date).toLocaleDateString()}
                </option>
              ))}
            </select>
            {drivesLoading && <p className="text-xs text-gray-500">Loading drives...</p>}
            {!drivesLoading && drives.length === 0 && (
              <p className="text-xs text-gray-500">No drives available for this organization</p>
            )}
          </div>

          {/* Technician & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Technician <span className="text-gray-400 font-normal">(Optional)</span></label>
              <Input
                type="text"
                value={formData.technician}
                onChange={(e) => setFormData(prev => ({ ...prev, technician: e.target.value }))}
                placeholder="Who collected this?"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Collection Notes <span className="text-gray-400 font-normal">(Optional)</span></label>
              <Input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Donor Name" error={fieldErrors.donorName} required>
              <Input
                type="text"
                name="donorName"
                value={formData.donorName}
                onChange={handleInputChange}
                placeholder="John Doe"
                className={fieldErrors.donorName ? 'border-red-600' : ''}
                readOnly={!!formData.donorId}
              />
            </FormField>
            <FormField label="Donor Email" error={fieldErrors.donorEmail}>
              <Input
                type="email"
                name="donorEmail"
                value={formData.donorEmail}
                onChange={handleInputChange}
                placeholder="john@example.com"
                className={fieldErrors.donorEmail ? 'border-red-600' : ''}
                readOnly={!!formData.donorId}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Blood Type" error={fieldErrors.bloodType} required>
              <select
                name="bloodType"
                value={formData.bloodType}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary ${fieldErrors.bloodType ? 'border-red-600' : 'border-border'}`}
              >
                {bloodTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Collection Method">
              <select
                name="collectionMethod"
                value={formData.collectionMethod}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="venipuncture">Venipuncture</option>
                <option value="apheresis">Apheresis</option>
                <option value="plasmapheresis">Plasmapheresis</option>
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Volume (ml)" error={fieldErrors.volume} required hint="Standard: 450ml (min: 200ml)">
              <Input
                type="number"
                name="volume"
                value={formData.volume}
                onChange={handleInputChange}
                placeholder="450"
                min="200"
                max="500"
                className={fieldErrors.volume ? 'border-red-600' : ''}
              />
            </FormField>
            <FormField label="Collection Date" error={fieldErrors.collectionDate} required hint="Cannot be in the future">
              <Input
                type="date"
                name="collectionDate"
                value={formData.collectionDate}
                onChange={handleInputChange}
                max={new Date().toISOString().split('T')[0]}
                className={fieldErrors.collectionDate ? 'border-red-600' : ''}
              />
            </FormField>
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
            <h3 className="font-semibold text-foreground">Test Results</h3>
            <div className="grid grid-cols-2 gap-4">
              {['hiv', 'hepatitisB', 'hepatitisC', 'syphilis'].map((test) => (
                <div key={test}>
                  <label className="block text-sm font-medium text-foreground mb-2 capitalize">
                    {test === 'hiv' ? 'HIV' : test === 'hepatitisB' ? 'Hepatitis B' : test === 'hepatitisC' ? 'Hepatitis C' : 'Syphilis'}
                  </label>
                  <select
                    value={formData.testResults[test]}
                    onChange={(e) => handleTestChange(test, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
          </div>

          <div className="flex gap-3 pt-6 border-t border-border">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Recording...' : 'Record Collection'}
            </Button>
          </div>
        </form>

        {/* Donor Selector Modal */}
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

        {/* Quick Donor Modal */}
        <QuickDonorModal
          isOpen={quickDonorOpen}
          onClose={() => setQuickDonorOpen(false)}
          onSuccess={handleQuickDonorCreate}
          organizationId={organizationId}
        />
      </Card>
    </div>
  )
}
