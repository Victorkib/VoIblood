'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthCard } from '@/components/auth/auth-card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Droplet, Loader2, Mail, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send reset email')
      }

      setSuccess(true)
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
        description="Password reset link sent"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8 text-green-600" />
          </div>
          <div className="space-y-2">
            <p className="text-foreground">
              We've sent a password reset link to:
            </p>
            <p className="font-mono text-sm bg-muted p-2 rounded">
              {email}
            </p>
          </div>
          <div className="text-sm text-foreground/60 space-y-1">
            <p>• Check your spam folder if you don't see it</p>
            <p>• The link expires in 24 hours</p>
          </div>
          <div className="space-y-2">
            <Button 
              variant="outline" 
              onClick={() => router.push('/auth/login')} 
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => {
                setSuccess(false)
                setError('')
              }}
              className="w-full"
            >
              Try another email
            </Button>
          </div>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Reset Password"
      description="Enter your email to receive a reset link"
      footerText="Remember your password?"
      footerLink={<Link href="/auth/login" className="font-semibold text-primary hover:underline">Sign in</Link>}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 border border-red-200">
            {error}
          </div>
        )}

        <div className="text-center mb-4">
          <p className="text-sm text-foreground/60">
            Enter your email address and we'll send you a link to reset your password.
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
              disabled={isLoading}
              autoComplete="email"
            />
          </Field>
        </FieldGroup>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isLoading || !email}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending reset link...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4 mr-2" />
              Send Reset Link
            </>
          )}
        </Button>

        {/* Security Notice */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-foreground/50">
          <Droplet className="w-3 h-3 text-primary" />
          <span>Secure password recovery powered by Supabase</span>
        </div>
      </form>
    </AuthCard>
  )
}
