'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthCard } from '@/components/auth/auth-card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Droplet, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isTokenValid, setIsTokenValid] = useState(true)

  // Check if we have the required tokens in URL
  useEffect(() => {
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    
    if (!accessToken || !refreshToken) {
      setIsTokenValid(false)
      setError('Invalid or expired reset link. Please request a new password reset.')
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

    setIsLoading(true)

    try {
      const accessToken = searchParams.get('access_token')
      const refreshToken = searchParams.get('refresh_token')

      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: formData.password,
          accessToken,
          refreshToken,
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
    setFormData(prev => ({ ...prev, [name]: value }))
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
          <p className="text-foreground">
            {error}
          </p>
          <div className="space-y-2">
            <Button 
              onClick={() => router.push('/auth/forgot-password')} 
              className="w-full"
            >
              Request New Reset Link
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/auth/login')} 
              className="w-full"
            >
              Back to Sign In
            </Button>
          </div>
        </div>
      </AuthCard>
    )
  }

  if (success) {
    return (
      <AuthCard
        title="Password Reset Successful"
        description="Your password has been updated"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-foreground">
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
          <Button 
            onClick={() => router.push('/auth/login')} 
            className="w-full"
          >
            Sign In with New Password
          </Button>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Set New Password"
      description="Create your new password"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 border border-red-200">
            {error}
          </div>
        )}

        <div className="text-center mb-4">
          <p className="text-sm text-foreground/60">
            Enter your new password below. Make sure it's at least 6 characters long.
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

        {/* Security Notice */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-foreground/50">
          <Droplet className="w-3 h-3 text-primary" />
          <span>Secure password reset powered by Supabase</span>
        </div>
      </form>
    </AuthCard>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
