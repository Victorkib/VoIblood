'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthCard } from '@/components/auth/auth-card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { useAuth } from '@/components/auth/auth-provider'
import { Droplet, Loader2 } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const { signup, loginWithOAuth, isAuthenticated } = useAuth()
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    organizationName: '',
    userRole: 'staff',
    password: '',
    confirmPassword: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [requiresConfirmation, setRequiresConfirmation] = useState(false)

  // Redirect if already authenticated
  if (isAuthenticated) {
    router.push('/dashboard')
    return null
  }

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
      const result = await signup({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        organizationName: formData.organizationName,
        role: formData.userRole,
      })

      if (result.requiresEmailConfirmation) {
        setRequiresConfirmation(true)
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleOAuthLogin(provider) {
    setIsLoading(true)
    setError('')
    
    try {
      await loginWithOAuth(provider)
      // Redirect happens automatically
    } catch (err) {
      setError(err.message || 'OAuth signup failed')
      setIsLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  if (requiresConfirmation) {
    return (
      <AuthCard
        title="Check Your Email"
        description="We've sent you a confirmation link"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-foreground">
            Please check your email at <strong className="text-foreground">{formData.email}</strong> to confirm your account.
          </p>
          <Button variant="outline" onClick={() => router.push('/auth/login')} className="w-full">
            Back to Sign In
          </Button>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Create Account"
      description="Join iBlood and start managing your blood bank"
      footerText="Already have an account?"
      footerLink={<Link href="/auth/login" className="font-semibold text-primary hover:underline">Sign in</Link>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 border border-red-200">
            {error}
          </div>
        )}

        <FieldGroup>
          <Field>
            <FieldLabel>Full Name</FieldLabel>
            <Input
              type="text"
              placeholder="John Doe"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              disabled={isLoading}
              autoComplete="name"
            />
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel>Email Address</FieldLabel>
            <Input
              type="email"
              placeholder="name@hospital.com"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel>Organization Name</FieldLabel>
            <Input
              type="text"
              placeholder="City Blood Bank"
              name="organizationName"
              value={formData.organizationName}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel>Your Role</FieldLabel>
            <select
              name="userRole"
              value={formData.userRole}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="staff">Blood Bank Staff</option>
              <option value="admin">Administrator</option>
              <option value="hospital">Hospital User</option>
            </select>
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel>Password</FieldLabel>
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
            <FieldLabel>Confirm Password</FieldLabel>
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

        <label className="flex items-start gap-2">
          <input type="checkbox" className="w-4 h-4 rounded border-border mt-1" required />
          <span className="text-xs text-foreground/60">
            I agree to the{' '}
            <Link href="/" className="text-primary hover:underline">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/" className="text-primary hover:underline">Privacy Policy</Link>
          </span>
        </label>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-background px-2 text-foreground/60">Or sign up with</span>
          </div>
        </div>

        {/* OAuth Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <Button 
            variant="outline" 
            size="sm"
            type="button"
            onClick={() => handleOAuthLogin('google')}
            disabled={isLoading}
          >
            Google
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            type="button"
            onClick={() => handleOAuthLogin('discord')}
            disabled={isLoading}
          >
            Discord
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            type="button"
            onClick={() => handleOAuthLogin('github')}
            disabled={isLoading}
          >
            GitHub
          </Button>
        </div>

        {/* Security Notice */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-foreground/50">
          <Droplet className="w-3 h-3 text-primary" />
          <span>Secure authentication powered by Supabase</span>
        </div>
      </form>
    </AuthCard>
  )
}
