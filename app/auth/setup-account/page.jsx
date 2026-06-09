'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthCard } from '@/components/auth/auth-card'
import { FieldGroup, Field, FieldLabel, FieldDescription } from '@/components/ui/field'
import {
  getPostLoginRedirectLabel,
} from '@/lib/auth/post-login-redirect'
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Building2,
  Lock,
  Mail,
  Sparkles,
  ArrowRight,
  Users,
  Calendar,
} from 'lucide-react'

function SetupAccountForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [done, setDone] = useState(false)
  const [redirectTo, setRedirectTo] = useState('/dashboard')
  const [activatedUser, setActivatedUser] = useState(null)
  const [passwordSavedOnly, setPasswordSavedOnly] = useState(false)

  const goToDestination = useCallback((path) => {
    window.location.href = path
  }, [])

  useEffect(() => {
    if (!token) {
      setError('Missing setup link. Check the email from iBlood or ask your administrator.')
      setLoading(false)
      return
    }

    async function load() {
      try {
        const res = await fetch(`/api/auth/setup-account?token=${encodeURIComponent(token)}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Invalid setup link')
        setProfile(data.data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [token])

  useEffect(() => {
    if (!done || passwordSavedOnly) return
    const timer = setTimeout(() => goToDestination(redirectTo), 4000)
    return () => clearTimeout(timer)
  }, [done, redirectTo, passwordSavedOnly, goToDestination])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/setup-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Setup failed')

      const destination = data.data?.redirectTo || '/dashboard'
      setRedirectTo(destination)

      if (data.passwordSaved && destination === '/auth/login') {
        setPasswordSavedOnly(true)
        setDone(true)
        return
      }

      if (data.data?.user) {
        setActivatedUser(data.data.user)
      }
      setDone(true)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <AuthCard title="Loading…" description="Verifying your setup link">
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AuthCard>
    )
  }

  if (!profile && error) {
    return (
      <AuthCard title="Setup link unavailable" description="We could not activate this link">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <p className="text-sm text-foreground/80">{error}</p>
          <Button className="w-full" onClick={() => router.push('/auth/login')}>
            Go to sign in
          </Button>
        </div>
      </AuthCard>
    )
  }

  if (done) {
    const ctaLabel = activatedUser
      ? getPostLoginRedirectLabel(activatedUser)
      : 'Sign in'

    if (passwordSavedOnly) {
      return (
        <AuthCard title="Password saved" description="Sign in with your new password">
          <div className="text-center space-y-4 py-2">
            <CheckCircle className="w-14 h-14 text-green-600 mx-auto" />
            <p className="text-sm text-foreground/70">
              Your password is set. We could not sign you in automatically — use the button below.
            </p>
            <Button className="w-full" onClick={() => goToDestination('/auth/login')}>
              Go to sign in
            </Button>
          </div>
        </AuthCard>
      )
    }

    const orgName = profile?.organizationName || activatedUser?.organizationName

    return (
      <AuthCard title="You're all set" description={`Welcome to iBlood${orgName ? `, ${orgName}` : ''}`}>
        <div className="text-center space-y-5 py-2">
          <CheckCircle className="w-14 h-14 text-green-600 mx-auto" />
          <p className="text-sm text-foreground/80">
            Hi <strong>{profile?.fullName || activatedUser?.fullName}</strong>, your account is active
            and you&apos;re signed in.
          </p>

          {activatedUser?.role === 'org_admin' && orgName && (
            <ul className="text-left text-sm space-y-2 rounded-xl border bg-muted/40 p-4">
              <li className="flex items-start gap-2">
                <Users className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <span>Invite your team from <strong>Settings → Team</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <span>Create your first <strong>donation drive</strong> from the Drives menu</span>
              </li>
            </ul>
          )}

          <p className="text-xs text-muted-foreground">Redirecting in a few seconds…</p>

          <Button className="w-full" size="lg" onClick={() => goToDestination(redirectTo)}>
            {ctaLabel}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Activate your account"
      description="Set your password — we'll sign you in and open your dashboard"
    >
      <div className="mb-6 rounded-xl border bg-gradient-to-br from-violet-50 to-rose-50 dark:from-violet-950/30 dark:to-rose-950/20 p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-violet-700 dark:text-violet-300 mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          iBlood organization admin
        </div>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-white/80 dark:bg-white/10 p-2">
            <Building2 className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{profile.organizationName}</p>
            <p className="text-sm text-foreground/60">{profile.fullName}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 border border-red-200">
            {error}
          </div>
        )}

        <FieldGroup>
          <Field>
            <FieldLabel>Email</FieldLabel>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                value={profile.email}
                readOnly
                disabled
                className="pl-10 bg-muted/50 cursor-not-allowed"
              />
            </div>
            <FieldDescription>This email cannot be changed during setup.</FieldDescription>
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel>Password</FieldLabel>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                placeholder="Choose a secure password"
                autoComplete="new-password"
                required
                minLength={6}
                disabled={submitting}
              />
            </div>
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel>Confirm password</FieldLabel>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                placeholder="Repeat your password"
                autoComplete="new-password"
                required
                disabled={submitting}
              />
            </div>
          </Field>
        </FieldGroup>

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Activating…
            </>
          ) : (
            'Activate & go to dashboard'
          )}
        </Button>
      </form>
    </AuthCard>
  )
}

export default function SetupAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <SetupAccountForm />
    </Suspense>
  )
}
