'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Plus, Trash2 } from 'lucide-react'
import { useFormValidation } from '@/lib/use-form-validation'
import { FormField, FormError } from '@/components/ui/form-error'

function urgencyDefaultDate(level) {
  const date = new Date()
  if (level === 'urgent') date.setDate(date.getDate() + 1)
  else if (level === 'routine') date.setDate(date.getDate() + 2)
  return date.toISOString().slice(0, 10)
}

function scoreDestination(destination, requirements) {
  return requirements.reduce((sum, req) => {
    const available = destination.inventoryByBloodType?.[req.bloodType] || 0
    return sum + Math.min(available, req.quantity)
  }, 0)
}

export function NewRequestModal({ isOpen, onClose, onSuccess, organizationId }) {
  const [formData, setFormData] = useState({
    sourceOrganizationId: '',
    requestingOrganizationId: '',
    requestingOrganizationName: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    patientName: '',
    patientAge: '',
    diagnosis: '',
    urgency: 'routine',
    requiredDate: urgencyDefaultDate('routine'),
    bloodRequirements: [{ bloodType: 'O+', component: 'whole_blood', quantity: 1 }],
    notes: '',
  })
  const [requestMeta, setRequestMeta] = useState(null)
  const [metaLoading, setMetaLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const { validate } = useFormValidation('request')

  const bloodTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
  const urgencyLevels = ['routine', 'urgent', 'emergency']
  const components = ['whole_blood', 'rbc', 'plasma', 'platelets', 'cryo']

  useEffect(() => {
    if (!isOpen || !organizationId) return
    let cancelled = false
    async function fetchMeta() {
      try {
        setMetaLoading(true)
        const res = await fetch(`/api/requests/meta?organizationId=${organizationId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load request metadata')
        if (cancelled) return
        setRequestMeta(data.data)
        const topDestination = [...(data.data.destinations || [])]
          .sort((a, b) => scoreDestination(b, formData.bloodRequirements) - scoreDestination(a, formData.bloodRequirements))[0]

        setFormData((prev) => ({
          ...prev,
          requestingOrganizationId: organizationId,
          requestingOrganizationName: data.data.requester?.organizationName || prev.requestingOrganizationName,
          contactPerson: data.data.requester?.contactPerson || prev.contactPerson,
          contactPhone: data.data.requester?.contactPhone || prev.contactPhone,
          contactEmail: data.data.requester?.contactEmail || prev.contactEmail,
          sourceOrganizationId: topDestination?.id || prev.sourceOrganizationId,
        }))
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setMetaLoading(false)
      }
    }
    fetchMeta()
    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, organizationId])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => {
      if (name === 'urgency') {
        return { ...prev, urgency: value, requiredDate: urgencyDefaultDate(value) }
      }
      return { ...prev, [name]: value }
    })
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const handleRequirementChange = (index, field, value) => {
    setFormData((prev) => {
      const newRequirements = [...prev.bloodRequirements]
      newRequirements[index] = {
        ...newRequirements[index],
        [field]: field === 'quantity' ? parseInt(value || '1', 10) : value,
      }
      return { ...prev, bloodRequirements: newRequirements }
    })
  }

  const addRequirement = () => {
    if (formData.bloodRequirements.length >= 8) {
      setError('Maximum 8 blood types can be requested')
      return
    }
    setFormData((prev) => ({
      ...prev,
      bloodRequirements: [...prev.bloodRequirements, { bloodType: 'O+', component: 'whole_blood', quantity: 1 }],
    }))
  }

  const removeRequirement = (index) => {
    setFormData((prev) => ({
      ...prev,
      bloodRequirements: prev.bloodRequirements.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate required fields
    const errors = {}
    if (!formData.requestingOrganizationName.trim()) errors.requestingOrganizationName = 'Organization name is required'
    if (!formData.sourceOrganizationId) errors.sourceOrganizationId = 'Select destination organization'
    if (!formData.contactPerson.trim()) errors.contactPerson = 'Contact person is required'
    if (!formData.contactPhone.trim()) errors.contactPhone = 'Contact phone is required'
    if (!formData.patientName.trim()) errors.patientName = 'Patient name is required'
    if (!formData.diagnosis.trim()) errors.diagnosis = 'Diagnosis is required'
    if (!formData.requiredDate) errors.requiredDate = 'Required date is required'
    if (formData.bloodRequirements.length === 0) {
      setError('At least one blood requirement is needed')
      return
    }
    if (formData.bloodRequirements.some((r) => !r.bloodType || r.quantity < 1)) {
      setError('Please fill all blood requirements properly')
      return
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setError('Please fix the errors below')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceOrganizationId: formData.sourceOrganizationId,
          requestingOrganizationId: formData.requestingOrganizationId || organizationId,
          requestingOrganizationName: formData.requestingOrganizationName,
          contactPerson: formData.contactPerson,
          contactPhone: formData.contactPhone,
          contactEmail: formData.contactEmail,
          patientName: formData.patientName,
          patientAge: formData.patientAge ? parseInt(formData.patientAge, 10) : undefined,
          diagnosis: formData.diagnosis,
          urgency: formData.urgency,
          bloodRequirements: formData.bloodRequirements,
          requiredDate: formData.requiredDate,
          notes: formData.notes,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create request')
      }

      const data = await response.json()
      onSuccess(data.data)
      setFormData({
        sourceOrganizationId: '',
        requestingOrganizationId: organizationId || '',
        requestingOrganizationName: '',
        contactPerson: '',
        contactPhone: '',
        contactEmail: '',
        patientName: '',
        patientAge: '',
        diagnosis: '',
        urgency: 'routine',
        requiredDate: urgencyDefaultDate('routine'),
        bloodRequirements: [{ bloodType: 'O+', component: 'whole_blood', quantity: 1 }],
        notes: '',
      })
      onClose()
    } catch (err) {
      console.error('[v0] Create request error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 border-b border-border px-6 py-4 flex items-center justify-between bg-background">
          <h2 className="text-xl font-semibold text-foreground">Create New Blood Request</h2>
          <button onClick={onClose} className="text-foreground/60 hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/50 text-sm text-red-700 flex items-start gap-2">
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          )}

          {/* Hospital/Organization Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Hospital/Organization Details</h3>
            <FormField label="Organization Name" error={fieldErrors.requestingOrganizationName} required>
              <Input
                type="text"
                name="requestingOrganizationName"
                value={formData.requestingOrganizationName}
                onChange={handleInputChange}
                placeholder="City Hospital"
                className={fieldErrors.requestingOrganizationName ? 'border-red-600' : ''}
              />
            </FormField>
            <FormField label="Send Request To" error={fieldErrors.sourceOrganizationId} required>
              <select
                name="sourceOrganizationId"
                value={formData.sourceOrganizationId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={metaLoading}
              >
                <option value="">{metaLoading ? 'Loading destinations...' : 'Select blood bank / transfusion center'}</option>
                {(requestMeta?.destinations || []).map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.type.replace('_', ' ')}) {org.city ? `- ${org.city}` : ''}
                  </option>
                ))}
              </select>
            </FormField>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Contact Person" error={fieldErrors.contactPerson} required>
                <Input
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  placeholder="Dr. Jane Doe"
                />
              </FormField>
              <FormField label="Contact Phone" error={fieldErrors.contactPhone} required>
                <Input
                  type="tel"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleInputChange}
                  placeholder="+2547XXXXXXXX"
                />
              </FormField>
            </div>
            <FormField label="Contact Email">
              <Input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleInputChange}
                placeholder="contact@hospital.co.ke"
              />
            </FormField>
          </div>

          {/* Patient Info */}
          <div className="space-y-4 border-t border-border pt-6">
            <h3 className="font-semibold text-foreground">Patient Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Patient Name" error={fieldErrors.patientName} required>
                <Input
                  type="text"
                  name="patientName"
                  value={formData.patientName}
                  onChange={handleInputChange}
                  placeholder="Jane Smith"
                  className={fieldErrors.patientName ? 'border-red-600' : ''}
                />
              </FormField>
              <FormField label="Age" hint="Optional">
                <Input
                  type="number"
                  name="patientAge"
                  value={formData.patientAge}
                  onChange={handleInputChange}
                  placeholder="45"
                  min="0"
                  max="120"
                />
              </FormField>
            </div>
            <FormField label="Diagnosis" error={fieldErrors.diagnosis} required hint="e.g., Surgery recovery, Trauma">
              <Input
                type="text"
                name="diagnosis"
                value={formData.diagnosis}
                onChange={handleInputChange}
                placeholder="Surgery recovery, Trauma, etc."
                className={fieldErrors.diagnosis ? 'border-red-600' : ''}
              />
            </FormField>
          </div>

          {/* Blood Requirements */}
          <div className="space-y-3 border-t border-border pt-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Blood Requirements *</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRequirement}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Type
              </Button>
            </div>
            <div className="space-y-3">
              {formData.bloodRequirements.map((req, index) => (
                <div key={index} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-foreground/60 mb-1">Blood Type</label>
                    <select
                      value={req.bloodType}
                      onChange={(e) => handleRequirementChange(index, 'bloodType', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {bloodTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-foreground/60 mb-1">Component</label>
                    <select
                      value={req.component || 'whole_blood'}
                      onChange={(e) => handleRequirementChange(index, 'component', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {components.map((type) => (
                        <option key={type} value={type}>
                          {type.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium text-foreground/60 mb-1">Quantity</label>
                    <Input
                      type="number"
                      value={req.quantity}
                      onChange={(e) => handleRequirementChange(index, 'quantity', e.target.value)}
                      min="1"
                      max="10"
                    />
                  </div>
                  {formData.bloodRequirements.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeRequirement(index)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Request Details */}
          <div className="space-y-3 border-t border-border pt-6">
            <h3 className="font-semibold text-foreground">Request Details</h3>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Urgency Level *</label>
              <select
                name="urgency"
                value={formData.urgency}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {urgencyLevels.map((level) => (
                  <option key={level} value={level}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <FormField label="Required Date" error={fieldErrors.requiredDate} required>
              <Input
                type="date"
                name="requiredDate"
                value={formData.requiredDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={handleInputChange}
              />
            </FormField>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Additional Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Any special requirements or notes..."
                rows="3"
              />
            </div>
          </div>

          {formData.sourceOrganizationId && (
            <div className="space-y-3 border-t border-border pt-6">
              <h3 className="font-semibold text-foreground">Availability Preview</h3>
              <div className="rounded-lg border border-border bg-secondary/5 p-4 space-y-2">
                {formData.bloodRequirements.map((req, index) => {
                  const destination = (requestMeta?.destinations || []).find((item) => item.id === formData.sourceOrganizationId)
                  const available = destination?.inventoryByBloodType?.[req.bloodType] || 0
                  const shortage = Math.max(req.quantity - available, 0)
                  return (
                    <div key={`${req.bloodType}-${index}`} className="flex items-center justify-between text-sm">
                      <span>
                        {req.bloodType} {req.component ? `(${req.component.replace('_', ' ')})` : ''}
                      </span>
                      <span className={shortage > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                        Need {req.quantity} / Available {available}
                        {shortage > 0 ? ` (short ${shortage})` : ' (full match)'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-6 border-t border-border">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating...' : 'Create Request'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
