'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  UserCog,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Mail,
  MapPin,
  Sparkles,
  Copy,
  ExternalLink,
} from 'lucide-react'

const ORGANIZATION_TYPES = [
  { value: 'blood_bank', label: 'Blood Bank' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'transfusion_center', label: 'Transfusion Center' },
  { value: 'ngo', label: 'NGO' },
]

const STEPS = [
  { id: 1, title: 'Organization', icon: Building2 },
  { id: 2, title: 'Admin account', icon: UserCog },
  { id: 3, title: 'Complete', icon: CheckCircle2 },
]

const initialOrg = {
  name: '',
  type: 'hospital',
  email: '',
  phone: '',
  address: '',
  city: 'Nairobi',
  state: 'Nairobi County',
  zipCode: '',
  country: 'Kenya',
  subscriptionPlan: 'professional',
}

const initialAdmin = {
  fullName: '',
  email: '',
  phone: '',
  role: 'org_admin',
  sendWelcomeEmail: true,
}

export function CreateOrganizationWizard({ open, onOpenChange, onSuccess }) {
  const [step, setStep] = useState(1)
  const [org, setOrg] = useState(initialOrg)
  const [admin, setAdmin] = useState(initialAdmin)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const reset = () => {
    setStep(1)
    setOrg(initialOrg)
    setAdmin(initialAdmin)
    setError(null)
    setResult(null)
    setLoading(false)
  }

  const handleClose = (isOpen) => {
    if (!isOpen) reset()
    onOpenChange(isOpen)
  }

  const validateStep1 = () => {
    if (!org.name?.trim() || !org.email?.trim() || !org.phone?.trim()) {
      setError('Organization name, email, and phone are required.')
      return false
    }
    setError(null)
    return true
  }

  const validateStep2 = () => {
    if (!admin.fullName?.trim() || !admin.email?.trim()) {
      setError('Admin full name and email are required.')
      return false
    }
    setError(null)
    return true
  }

  const handleSubmit = async () => {
    if (!validateStep2()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...org,
          firstAdmin: admin,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create organization')
      setResult(data.data)
      setStep(3)
      onSuccess?.(data.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copySetupLink = () => {
    if (!result?.credentials?.setupUrl) return
    const text = `iBlood — activate your admin account\nEmail: ${result.admin.email}\nSetup link: ${result.credentials.setupUrl}`
    navigator.clipboard.writeText(text)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-hidden p-0 gap-0 border-0 shadow-2xl">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-rose-950 text-white px-6 py-6">
          <DialogHeader className="text-left space-y-2">
            <div className="flex items-center gap-2 text-rose-300 text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Platform onboarding
            </div>
            <DialogTitle className="text-2xl text-white">Create organization</DialogTitle>
            <DialogDescription className="text-slate-300">
              Set up the facility and first administrator in one flow. Welcome email sent automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-6">
            {STEPS.map((s) => {
              const Icon = s.icon
              const active = step === s.id
              const done = step > s.id
              return (
                <div
                  key={s.id}
                  className={`flex-1 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                    active
                      ? 'bg-white/15 text-white ring-1 ring-white/25'
                      : done
                        ? 'bg-emerald-500/20 text-emerald-200'
                        : 'bg-white/5 text-slate-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {s.title}
                </div>
              )
            })}
          </div>
        </div>

        <div className="px-6 py-6 overflow-y-auto max-h-[calc(92vh-200px)] bg-gradient-to-b from-slate-50 to-white">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="org-name">Organization name *</Label>
                  <Input
                    id="org-name"
                    className="mt-1.5 bg-white"
                    placeholder="e.g. Crystal Hospital"
                    value={org.name}
                    onChange={(e) => setOrg((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Type *</Label>
                  <Select value={org.type} onValueChange={(v) => setOrg((p) => ({ ...p, type: v }))}>
                    <SelectTrigger className="mt-1.5 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORGANIZATION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subscription plan</Label>
                  <Select
                    value={org.subscriptionPlan}
                    onValueChange={(v) => setOrg((p) => ({ ...p, subscriptionPlan: v }))}
                  >
                    <SelectTrigger className="mt-1.5 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Organization email *</Label>
                  <Input
                    type="email"
                    className="mt-1.5 bg-white"
                    placeholder="contact@hospital.co.ke"
                    value={org.email}
                    onChange={(e) => setOrg((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Phone *</Label>
                  <Input
                    className="mt-1.5 bg-white"
                    placeholder="+254..."
                    value={org.phone}
                    onChange={(e) => setOrg((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <MapPin className="w-4 h-4 text-rose-600" />
                  Location (Kenya)
                </div>
                <Textarea
                  placeholder="Street address"
                  rows={2}
                  className="bg-white resize-none"
                  value={org.address}
                  onChange={(e) => setOrg((p) => ({ ...p, address: e.target.value }))}
                />
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    placeholder="City"
                    className="bg-white"
                    value={org.city}
                    onChange={(e) => setOrg((p) => ({ ...p, city: e.target.value }))}
                  />
                  <Input
                    placeholder="County / State"
                    className="bg-white"
                    value={org.state}
                    onChange={(e) => setOrg((p) => ({ ...p, state: e.target.value }))}
                  />
                  <Input
                    placeholder="Country"
                    className="bg-white"
                    value={org.country}
                    onChange={(e) => setOrg((p) => ({ ...p, country: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <p className="text-sm text-slate-600">
                This person receives login credentials and a welcome email. They become{' '}
                <strong>organization admin</strong> for {org.name || 'this facility'}.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>Full name *</Label>
                  <Input
                    className="mt-1.5 bg-white"
                    placeholder="Director or IT lead"
                    value={admin.fullName}
                    onChange={(e) => setAdmin((p) => ({ ...p, fullName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Login email *</Label>
                  <Input
                    type="email"
                    className="mt-1.5 bg-white"
                    value={admin.email}
                    onChange={(e) => setAdmin((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Mobile (optional)</Label>
                  <Input
                    className="mt-1.5 bg-white"
                    value={admin.phone}
                    onChange={(e) => setAdmin((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={admin.sendWelcomeEmail}
                  onChange={(e) => setAdmin((p) => ({ ...p, sendWelcomeEmail: e.target.checked }))}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-emerald-900 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Send welcome email
                  </p>
                  <p className="text-xs text-emerald-800/80 mt-1">
                    One iBlood email with a secure link to set their password (email prefilled, not editable).
                  </p>
                </div>
              </label>
            </div>
          )}

          {step === 3 && result && (
            <div className="space-y-5 text-center animate-in fade-in duration-300">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{result.organization.name}</h3>
                <p className="text-slate-600 mt-1">is live on iBlood</p>
              </div>
              <div className="text-left rounded-xl border bg-white p-4 space-y-2 text-sm">
                <p>
                  <span className="text-slate-500">Admin:</span>{' '}
                  <strong>{result.admin.fullName}</strong> ({result.admin.email})
                </p>
                {result.credentials?.setupUrl ? (
                  <div className="flex flex-col gap-2 pt-2 border-t">
                    <Badge className="bg-blue-100 text-blue-800 w-fit">
                      Activation email sent (single link)
                    </Badge>
                    <Button type="button" size="sm" variant="outline" onClick={copySetupLink}>
                      <Copy className="w-3 h-3 mr-1" />
                      Copy setup link
                    </Button>
                  </div>
                ) : null}
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() =>
                  window.open(`/dashboard/super-admin/organizations/${result.organization.id}`, '_blank')
                }
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View organization
              </Button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-white flex justify-between gap-3">
          {step < 3 ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={step === 1 || loading}
                onClick={() => setStep((s) => Math.max(1, s - 1))}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              {step === 1 ? (
                <Button
                  type="button"
                  onClick={() => {
                    if (validateStep1()) setStep(2)
                  }}
                >
                  Continue
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button type="button" onClick={handleSubmit} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Create organization
                      <CheckCircle2 className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              )}
            </>
          ) : (
            <Button type="button" className="w-full" onClick={() => handleClose(false)}>
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
