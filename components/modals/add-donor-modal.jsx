'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { UserPlus, X, Info } from 'lucide-react'
import { useFormValidation } from '@/lib/use-form-validation'
import { FormField } from '@/components/ui/form-error'

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function AddDonorModal({ isOpen, onClose, onSuccess, organizationId }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bloodType: 'O+',
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

  useEffect(() => {
    if (isOpen) {
      setError(null)
      setFieldErrors({})
    }
  }, [isOpen])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const validation = validate(formData)
    if (!validation.isValid) {
      setFieldErrors(validation.errors)
      setError('Please fix the errors below')
      return
    }

    setLoading(true)
    setError(null)

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
        const errJson = await response.json().catch(() => ({}))
        throw new Error(errJson.message || errJson.error || 'Failed to add donor')
      }

      const data = await response.json()
      onSuccess(data.data)
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        bloodType: 'O+',
        gender: 'male',
        dateOfBirth: '',
        weight: '',
        hasDonatedBefore: false,
      })
      onClose()
    } catch (err) {
      console.error('[AddDonorModal]', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
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
        className="flex max-h-[min(92vh,860px)] w-[calc(100vw-1.25rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-xl p-0 shadow-2xl sm:max-w-xl"
      >
        <div className="relative shrink-0 border-b border-white/10 bg-gradient-to-br from-rose-600 via-red-600 to-red-800 px-5 pb-4 pt-5 text-white sm:px-6 sm:pb-5 sm:pt-6">
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
                <UserPlus className="h-5 w-5 text-white sm:h-6 sm:w-6" aria-hidden />
              </span>
              <span className="min-w-0 pt-0.5 leading-snug">Add donor</span>
            </DialogTitle>
            <DialogDescription className="text-left text-sm leading-relaxed text-white/85">
              Register someone in your organization. They can complete their profile later from their donor link.
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
                  Identity
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="First name" error={fieldErrors.firstName} required>
                    <Input
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="John"
                      className={`h-10 ${fieldErrors.firstName ? 'border-red-600' : ''}`}
                    />
                  </FormField>
                  <FormField label="Last name" error={fieldErrors.lastName} required>
                    <Input
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Doe"
                      className={`h-10 ${fieldErrors.lastName ? 'border-red-600' : ''}`}
                    />
                  </FormField>
                </div>
              </section>

              <section className="rounded-xl border border-border/80 bg-background p-4 sm:p-5">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />
                  Contact
                </h3>
                <div className="space-y-4">
                  <FormField label="Email" error={fieldErrors.email} required>
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="john@example.com"
                      autoComplete="email"
                      className={`h-10 ${fieldErrors.email ? 'border-red-600' : ''}`}
                    />
                  </FormField>
                  <FormField
                    label="Phone"
                    error={fieldErrors.phone}
                    required
                    hint="Include country code (e.g. +1 555-123-4567)"
                  >
                    <Input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 123-4567"
                      autoComplete="tel"
                      className={`h-10 ${fieldErrors.phone ? 'border-red-600' : ''}`}
                    />
                  </FormField>
                </div>
              </section>

              <section className="rounded-xl border border-border/80 bg-muted/20 p-4 sm:p-5">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
                  Medical profile
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <FormField label="Date of birth" error={fieldErrors.dateOfBirth} required hint="Must be 18–65 years old">
                    <Input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      className={`h-10 ${fieldErrors.dateOfBirth ? 'border-red-600' : ''}`}
                    />
                  </FormField>
                  <FormField label="Gender" error={fieldErrors.gender} required>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className={`${selectClass} ${fieldErrors.gender ? 'border-red-600' : ''}`}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </FormField>
                  <FormField label="Weight (kg)" error={fieldErrors.weight} hint="Optional — helps eligibility screening">
                    <Input
                      type="number"
                      name="weight"
                      value={formData.weight}
                      onChange={handleInputChange}
                      placeholder="70"
                      min="30"
                      max="200"
                      className={`h-10 ${fieldErrors.weight ? 'border-red-600' : ''}`}
                    />
                  </FormField>
                </div>
              </section>

              <section className="rounded-xl border border-border/80 bg-background p-4 sm:p-5">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
                  Donation history
                </h3>
                <div className="space-y-2">
                  <label htmlFor="add-donor-prev" className="text-sm font-medium">
                    Has donated before?
                  </label>
                  <select
                    id="add-donor-prev"
                    value={formData.hasDonatedBefore ? 'yes' : 'no'}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hasDonatedBefore: e.target.value === 'yes',
                      }))
                    }
                    className={selectClass}
                  >
                    <option value="no">No — first-time donor</option>
                    <option value="yes">Yes — returning donor</option>
                  </select>
                </div>
              </section>

              <div className="flex gap-3 rounded-lg border border-blue-200/80 bg-blue-50/90 px-3 py-3 text-xs text-blue-950 sm:px-4">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                <p className="leading-relaxed">
                  Donors receive a profile link by email when your team enables welcome messages. Duplicates are blocked by
                  email or phone within your organization.
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
              className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 sm:w-auto"
            >
              {loading ? 'Adding…' : 'Add donor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
