'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Plus, Trash2 } from 'lucide-react'
import { useFormValidation } from '@/lib/use-form-validation'
import { FormField, FormError } from '@/components/ui/form-error'

export function NewRequestModal({ isOpen, onClose, onSuccess, organizationId }) {
  const [formData, setFormData] = useState({
    requestingOrganizationName: '',
    requestingOrganizationPhone: '',
    requestingOrganizationEmail: '',
    patientName: '',
    patientAge: '',
    medicalCondition: '',
    urgency: 'routine',
    bloodRequirements: [{ bloodType: 'O+', quantity: 1 }],
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const { validate } = useFormValidation('request')

  const bloodTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
  const urgencyLevels = ['routine', 'urgent', 'critical']

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const handleRequirementChange = (index, field, value) => {
    setFormData((prev) => {
      const newRequirements = [...prev.bloodRequirements]
      newRequirements[index] = { ...newRequirements[index], [field]: field === 'quantity' ? parseInt(value) : value }
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
      bloodRequirements: [...prev.bloodRequirements, { bloodType: 'O+', quantity: 1 }],
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
    if (!formData.patientName.trim()) errors.patientName = 'Patient name is required'
    if (!formData.medicalCondition.trim()) errors.medicalCondition = 'Medical condition is required'
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

      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          organizationId,
          patientAge: parseInt(formData.patientAge),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create request')
      }

      const data = await response.json()
      onSuccess(data.data)
      setFormData({
        requestingOrganizationName: '',
        requestingOrganizationPhone: '',
        requestingOrganizationEmail: '',
        patientName: '',
        patientAge: '',
        medicalCondition: '',
        urgency: 'routine',
        bloodRequirements: [{ bloodType: 'O+', quantity: 1 }],
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Phone">
                <Input
                  type="tel"
                  name="requestingOrganizationPhone"
                  value={formData.requestingOrganizationPhone}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 000-0000"
                />
              </FormField>
              <FormField label="Email">
                <Input
                  type="email"
                  name="requestingOrganizationEmail"
                  value={formData.requestingOrganizationEmail}
                  onChange={handleInputChange}
                  placeholder="contact@hospital.com"
                />
              </FormField>
            </div>
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
            <FormField label="Medical Condition" error={fieldErrors.medicalCondition} required hint="e.g., Surgery recovery, Trauma">
              <Input
                type="text"
                name="medicalCondition"
                value={formData.medicalCondition}
                onChange={handleInputChange}
                placeholder="Surgery recovery, Trauma, etc."
                className={fieldErrors.medicalCondition ? 'border-red-600' : ''}
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
