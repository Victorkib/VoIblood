'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthCard } from '@/components/auth/auth-card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { createBrowserClient } from '@/lib/supabase'
import { Droplet, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

function parseTokensFromUrl(searchParams) {
  if (typeof window === 'undefined') return { accessToken: null, refreshToken: null }

  const fromQuery = {
    accessToken: searchParams.get('access_token'),
    refreshToken: searchParams.get('refresh_token'),
  }
  if (fromQuery.accessToken && fromQuery.refreshToken) return fromQuery

  const hash = window.location.hash?.replace(/^#/, '')
  if (hash) {
    const hashParams = new URLSearchParams(hash)
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    if (accessToken && refreshToken) return { accessToken, refreshToken }
  }

  return { accessToken: null, refreshToken: null }
}

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [tokens, setTokens] = useState({ accessToken: null, refreshToken: null })
  const [isTokenValid, setIsTokenValid] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const parsed = parseTokensFromUrl(searchParams)
      if (parsed.accessToken && parsed.refreshToken) {
        if (!cancelled) {
          setTokens(parsed)
          setIsTokenValid(true)
          setBootstrapping(false)
        }
        return
      }

      const code = searchParams.get('code')
      const supabase = createBrowserClient()

      try {
        if (code && supabase.auth?.exchangeCodeForSession) {
          const { data, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)
          if (!exchangeErr && data?.session) {
            if (!cancelled) {
              setTokens({
                accessToken: data.session.access_token,
                refreshToken: data.session.refresh_token,
              })
              setIsTokenValid(true)
              setBootstrapping(false)
            }
            return
          }
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token && session?.refresh_token) {
          if (!cancelled) {
            setTokens({
              accessToken: session.access_token,
              refreshToken: session.refresh_token,
            })
            setIsTokenValid(true)
            setBootstrapping(false)
          }
          return
        }
      } catch (err) {
        console.warn('[reset-password] session bootstrap failed', err)
      }

      if (!cancelled) {
        setIsTokenValid(false)
        setError('Invalid or expired reset link. Please request a new password reset.')
        setBootstrapping(false)
      }
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [searchParams])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (!tokens.accessToken || !tokens.refreshToken) {
      setError('Session expired. Request a new reset link.')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          password: formData.password,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password')
      }

      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  if (bootstrapping) {
    return (
      <AuthCard title="Verifying link…" description="Please wait">
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AuthCard>
    )
  }

  if (!isTokenValid) {
    return (
      <AuthCard
        title="Invalid Reset Link"
        description="This reset link is no longer valid"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-foreground">{error}</p>
          <div className="space-y-2">
            <Button onClick={() => router.push('/auth/forgot-password')} className="w-full">
              Request New Reset Link
            </Button>
            <Button variant="outline" onClick={() => router.push('/auth/login')} className="w-full">
              Back to Sign In
            </Button>
          </div>
        </div>
      </AuthCard>
    )
  }

  if (success) {
    return (
      <AuthCard title="Password Reset Successful" description="Your password has been updated">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-foreground">
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
          <Button onClick={() => router.push('/auth/login')} className="w-full">
            Sign In with New Password
          </Button>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Set New Password" description="Create your new password">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 border border-red-200">
            {error}
          </div>
        )}

        <div className="text-center mb-4">
          <p className="text-sm text-foreground/60">
            Enter your new password below. Make sure it&apos;s at least 6 characters long.
          </p>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel>New Password</FieldLabel>
            <Input
              type="password"
              placeholder="••••••••"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={isLoading}
              autoComplete="new-password"
            />
            <p className="text-xs text-foreground/50 mt-1">Must be at least 6 characters</p>
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel>Confirm New Password</FieldLabel>
            <Input
              type="password"
              placeholder="••••••••"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              disabled={isLoading}
              autoComplete="new-password"
            />
          </Field>
        </FieldGroup>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isLoading || !formData.password || !formData.confirmPassword}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Resetting password...
            </>
          ) : (
            'Reset Password'
          )}
        </Button>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-foreground/50">
          <Droplet className="w-3 h-3 text-primary" />
          <span>Secure password reset</span>
        </div>
      </form>
    </AuthCard>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
