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
import { FormField } from '@/components/ui/form-error'

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function QuickDonorModal({ isOpen, onClose, onSuccess, organizationId }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bloodType: 'O+',
    dateOfBirth: '',
    gender: 'male',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

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

    const errors = {}
    if (!formData.firstName.trim()) errors.firstName = 'First name is required'
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required'
    if (!formData.email.trim()) errors.email = 'Email is required'
    if (!formData.phone.trim()) errors.phone = 'Phone is required'
    if (!formData.bloodType) errors.bloodType = 'Blood type is required'
    if (!formData.dateOfBirth) errors.dateOfBirth = 'Date of birth is required'
    if (!formData.gender) errors.gender = 'Gender is required'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/donors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          bloodType: formData.bloodType,
          dateOfBirth: new Date(formData.dateOfBirth).toISOString(),
          gender: formData.gender,
          organizationId,
          registrationType: 'admin_quick',
          status: 'registered',
          skipWelcomeEmail: false,
        }),
      })

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        const msg =
          errJson.error ||
          errJson.message ||
          (response.status === 409
            ? 'This person may already exist in your donor list (same email, phone, or name + date of birth).'
            : 'Failed to create donor')
        throw new Error(msg)
      }

      const data = await response.json()
      const raw = data.data || {}
      const donorWithFullName = {
        ...raw,
        id: raw.id || raw._id,
        fullName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
      }

      onSuccess(donorWithFullName)

      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        bloodType: 'O+',
        dateOfBirth: '',
        gender: 'male',
      })
      onClose()
    } catch (err) {
      console.error('[QuickDonor] Create error:', err)
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
        className="flex max-h-[min(92vh,760px)] w-[calc(100vw-1.25rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-xl p-0 shadow-2xl sm:max-w-md"
      >
        <div className="relative shrink-0 border-b border-white/10 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-800 px-5 pb-4 pt-5 text-white sm:px-6">
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
          <DialogHeader className="space-y-2 pr-10 text-left">
            <DialogTitle className="flex items-start gap-3 text-xl font-bold text-white sm:text-2xl">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                <UserPlus className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 leading-snug">Quick add donor</span>
            </DialogTitle>
            <DialogDescription className="text-left text-sm text-white/85">
              Minimum fields only. Staff can complete medical details later on the donor profile.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-4 sm:px-6">
            <div className="space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}</div>
              )}

              <div className="flex gap-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-3 text-xs text-violet-950">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden />
                <p className="leading-relaxed">
                  We dedupe on email, phone, and name + date of birth. Use real contact info so the donor can receive their
                  profile link.
                </p>
              </div>

              <section className="rounded-xl border border-border/80 bg-muted/25 p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

              <section className="rounded-xl border border-border/80 bg-background p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</h3>
                <div className="space-y-3">
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
                  <FormField label="Phone" error={fieldErrors.phone} required>
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+254… or +1…"
                      autoComplete="tel"
                      className={`h-10 ${fieldErrors.phone ? 'border-red-600' : ''}`}
                    />
                  </FormField>
                </div>
              </section>

              <section className="rounded-xl border border-border/80 bg-muted/20 p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profile</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField label="Date of birth" error={fieldErrors.dateOfBirth} required>
                    <Input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      max={new Date().toISOString().split('T')[0]}
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
                  <div className="sm:col-span-2">
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
                  </div>
                </div>
              </section>
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t bg-muted/40 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 sm:w-auto"
            >
              {loading ? 'Creating…' : 'Create & continue'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
