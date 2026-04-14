'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { useFormValidation } from '@/lib/use-form-validation'
import { FormField, FormError } from '@/components/ui/form-error'

export function AddDonorModal({ isOpen, onClose, onSuccess, organizationId }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bloodType: 'O+',
    age: '',
    gender: 'male',
    dateOfBirth: '',
    weight: '',
    hasDonatedBefore: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const { validate } = useFormValidation('donor')

  const bloodTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate form data
    const validation = validate(formData)
    if (!validation.isValid) {
      setFieldErrors(validation.errors)
      setError('Please fix the errors below')
      return
    }

    setLoading(true)
    setError(null)

    // Calculate age from date of birth
    const dob = new Date(formData.dateOfBirth)
    const ageDiff = Date.now() - dob.getTime()
    const age = Math.floor(ageDiff / (1000 * 60 * 60 * 24 * 365.25))

    try {
      const response = await fetch('/api/donors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email.toLowerCase(),
          phone: formData.phone,
          bloodType: formData.bloodType,
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          weight: formData.weight || undefined,
          hasDonatedBefore: formData.hasDonatedBefore || false,
          organizationId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to add donor')
      }

      const data = await response.json()
      onSuccess(data.data)
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        bloodType: 'O+',
        age: '',
        gender: 'male',
        dateOfBirth: '',
        weight: '',
        hasDonatedBefore: false,
      })
      onClose()
    } catch (err) {
      console.error('[v0] Add donor error:', err)
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
          <h2 className="text-xl font-semibold text-foreground">Add New Donor</h2>
          <button onClick={onClose} className="text-foreground/60 hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/50 text-red-600 text-sm flex items-start gap-2">
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="First Name" error={fieldErrors.firstName} required>
              <Input 
                name="firstName" 
                value={formData.firstName} 
                onChange={handleInputChange} 
                placeholder="John"
                className={fieldErrors.firstName ? 'border-red-600' : ''}
              />
            </FormField>
            <FormField label="Last Name" error={fieldErrors.lastName} required>
              <Input 
                name="lastName" 
                value={formData.lastName} 
                onChange={handleInputChange} 
                placeholder="Doe"
                className={fieldErrors.lastName ? 'border-red-600' : ''}
              />
            </FormField>
          </div>

          <FormField label="Email" error={fieldErrors.email} required>
            <Input 
              type="email" 
              name="email" 
              value={formData.email} 
              onChange={handleInputChange} 
              placeholder="john@example.com"
              className={fieldErrors.email ? 'border-red-600' : ''}
            />
          </FormField>

          <FormField label="Phone" error={fieldErrors.phone} required hint="Include country code (e.g., +1 555-1234567)">
            <Input 
              type="tel" 
              name="phone" 
              value={formData.phone} 
              onChange={handleInputChange} 
              placeholder="+1 (555) 123-4567"
              className={fieldErrors.phone ? 'border-red-600' : ''}
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Blood Type" error={fieldErrors.bloodType} required>
              <select
                name="bloodType"
                value={formData.bloodType}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 rounded-md border bg-background text-foreground ${fieldErrors.bloodType ? 'border-red-600' : 'border-border'}`}
              >
                {bloodTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Date of Birth" error={fieldErrors.dateOfBirth} required hint="Must be 18-65 years old">
              <Input 
                type="date" 
                name="dateOfBirth" 
                value={formData.dateOfBirth} 
                onChange={handleInputChange}
                className={fieldErrors.dateOfBirth ? 'border-red-600' : ''}
              />
            </FormField>
          </div>

          <FormField label="Gender" error={fieldErrors.gender} required>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 rounded-md border bg-background text-foreground ${fieldErrors.gender ? 'border-red-600' : 'border-border'}`}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Weight (kg)" error={fieldErrors.weight} hint="Optional - helps determine eligibility">
              <Input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleInputChange}
                placeholder="70"
                min="30"
                max="200"
                className={fieldErrors.weight ? 'border-red-600' : ''}
              />
            </FormField>
            <FormField label="Has Donated Before?" error={fieldErrors.hasDonatedBefore} hint="Previous donation history">
              <select
                name="hasDonatedBefore"
                value={formData.hasDonatedBefore}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 rounded-md border bg-background text-foreground ${fieldErrors.hasDonatedBefore ? 'border-red-600' : 'border-border'}`}
              >
                <option value={false}>No - First Time</option>
                <option value={true}>Yes - Previous Donor</option>
              </select>
            </FormField>
          </div>

          <div className="flex gap-3 pt-6">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Adding Donor...' : 'Add Donor'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
