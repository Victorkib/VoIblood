'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthCard } from '@/components/auth/auth-card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Droplet, Loader2, Mail, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'

// Separate component for search params (must be inside Suspense)
function VerifyEmailForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [canResend, setCanResend] = useState(true)
  const [waitTime, setWaitTime] = useState(0)

  // Get email from URL params if available
  useEffect(() => {
    const urlEmail = searchParams.get('email')
    if (urlEmail) {
      setEmail(decodeURIComponent(urlEmail))
    }
  }, [searchParams])

  // Countdown timer for resend
  useEffect(() => {
    if (waitTime > 0) {
      const timer = setInterval(() => {
        setWaitTime(prev => {
          if (prev <= 1) {
            setCanResend(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [waitTime])

  // Check resend eligibility
  useEffect(() => {
    if (email) {
      checkResendEligibility(email)
    }
  }, [email])

  const checkResendEligibility = async (emailAddress) => {
    try {
      const res = await fetch(`/api/auth/resend-verification?email=${encodeURIComponent(emailAddress)}`)
      const data = await res.json()

      if (res.ok) {
        setCanResend(data.canResend)
        if (!data.canResend && data.waitTime) {
          setWaitTime(data.waitTime)
        }
      }
    } catch (error) {
      console.error('Failed to check resend eligibility:', error)
    }
  }

  async function handleResend(e) {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend verification email')
      }

      setSuccess(true)
      setWaitTime(60) // Start 60 second cooldown
      setCanResend(false)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <AuthCard
        title="Check Your Email"
        description="Verification email sent"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8 text-green-600" />
          </div>
          <div className="space-y-2">
            <p className="text-foreground font-medium">
              We've sent a verification link to:
            </p>
            <p className="text-sm bg-muted p-2 rounded font-mono">
              {email}
            </p>
          </div>
          <div className="text-sm text-foreground/60 space-y-1">
            <p className="flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Check your spam folder if you don't see it
            </p>
            <p className="flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              The link expires in 24 hours
            </p>
          </div>
          <div className="space-y-2 pt-4">
            <Button
              variant="outline"
              onClick={() => router.push('/auth/login')}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Button>
            {canResend ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setSuccess(false)
                  setError('')
                }}
                className="w-full"
              >
                Send to Different Email
              </Button>
            ) : (
              <Button
                variant="ghost"
                disabled
                className="w-full"
              >
                Resend in {waitTime}s
              </Button>
            )}
          </div>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Verify Your Email"
      description="Email verification required to continue"
      footerText="Remember your password?"
      footerLink={<Link href="/auth/login" className="font-semibold text-primary hover:underline">Sign in</Link>}
    >
      <form onSubmit={handleResend} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 border border-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-sm text-foreground/60">
            Please verify your email address to complete your registration and access your account.
          </p>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel>Email Address</FieldLabel>
            <Input
              type="email"
              placeholder="name@hospital.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading || !canResend}
              autoComplete="email"
            />
          </Field>
        </FieldGroup>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isLoading || !email || !canResend}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending verification email...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4 mr-2" />
              Send Verification Email
            </>
          )}
        </Button>

        {!canResend && waitTime > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
            <p className="text-sm text-amber-800">
              Please wait <strong>{waitTime}s</strong> before requesting another verification email
            </p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2 text-sm">Why verify your email?</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>Protects your account from unauthorized access</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>Ensures we can send you important notifications</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>Required for organization membership verification</span>
            </li>
          </ul>
        </div>

        {/* Security Notice */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-foreground/50">
          <Droplet className="w-3 h-3 text-primary" />
          <span>Secure email verification powered by Supabase</span>
        </div>
      </form>
    </AuthCard>
  )
}

// Main page component with Suspense boundary
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  )
}
