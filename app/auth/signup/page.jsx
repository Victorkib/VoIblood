'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Progress } from '@/components/ui/progress'
import { AuthCard } from '@/components/auth/auth-card'
import { FieldGroup, Field, FieldLabel, FieldDescription } from '@/components/ui/field'
import { useAuth } from '@/components/auth/auth-provider'
import { OrganizationSearch } from '@/components/auth/organization-search'
import { 
  Droplet, Loader2, Building, UserPlus, Key, 
  User, Mail, Lock, CheckCircle, AlertCircle,
  ArrowRight, ArrowLeft, Eye, EyeOff
} from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const { signup, loginWithOAuth, isAuthenticated } = useAuth()

  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1)
  const [direction, setDirection] = useState('forward')
  const totalSteps = 4

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    inviteToken: '',
  })
  
  const [orgSelection, setOrgSelection] = useState('create')
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [requestMessage, setRequestMessage] = useState('')
  const [requestedRole, setRequestedRole] = useState('viewer')
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [requiresConfirmation, setRequiresConfirmation] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [touched, setTouched] = useState({})

  // Password strength
  const [passwordStrength, setPasswordStrength] = useState(0)

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  // Calculate password strength
  useEffect(() => {
    const password = formData.password
    let strength = 0
    
    if (password.length >= 8) strength++
    if (password.length >= 12) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    
    setPasswordStrength(Math.min(strength, 5))
  }, [formData.password])

  const validateStep = (step) => {
    const errors = []
    
    if (step === 1) {
      if (!formData.fullName.trim()) errors.push('Full name is required')
      if (!formData.email) errors.push('Email is required')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.push('Invalid email format')
    }
    
    if (step === 2) {
      if (!formData.password) errors.push('Password is required')
      if (formData.password.length < 6) errors.push('Password must be at least 6 characters')
      if (formData.password !== formData.confirmPassword) errors.push('Passwords do not match')
    }
    
    if (step === 3) {
      if (orgSelection === 'join' && !selectedOrg) {
        errors.push('Please select an organization to join')
      }
      if (orgSelection === 'invite' && !formData.inviteToken) {
        errors.push('Please enter your invitation token')
      }
    }
    
    return errors
  }

  const handleNext = () => {
    const errors = validateStep(currentStep)
    if (errors.length > 0) {
      setError(errors[0])
      return
    }
    
    setError('')
    setDirection('forward')
    setCurrentStep(prev => Math.min(prev + 1, totalSteps))
  }

  const handleBack = () => {
    setError('')
    setDirection('back')
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleStepClick = (step) => {
    // Allow going back to previous steps
    if (step < currentStep) {
      setDirection('back')
      setCurrentStep(step)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    
    // Validate final step
    const errors = validateStep(3)
    if (errors.length > 0) {
      setError(errors[0])
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const result = await signup({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        inviteToken: formData.inviteToken || undefined,
        orgSelection,
        selectedOrg: selectedOrg ? selectedOrg.id : null,
        requestMessage,
        requestedRole,
      })

      if (result.requiresEmailConfirmation) {
        setRequiresConfirmation(true)
      } else {
        if (orgSelection === 'create') {
          router.push('/dashboard/setup')
        } else {
          router.push('/dashboard?pending-approval=true')
        }
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
    } catch (err) {
      setError(err.message || 'OAuth signup failed')
      setIsLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (touched[name]) {
      validateStep(currentStep)
    }
  }

  const handleBlur = (e) => {
    const { name } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
  }

  const getStrengthLabel = () => {
    if (passwordStrength === 0) return ''
    if (passwordStrength <= 2) return { text: 'Weak', color: 'text-red-600' }
    if (passwordStrength <= 3) return { text: 'Fair', color: 'text-yellow-600' }
    if (passwordStrength <= 4) return { text: 'Good', color: 'text-blue-600' }
    return { text: 'Strong', color: 'text-green-600' }
  }

  const strengthLabel = getStrengthLabel()

  // Steps configuration
  const steps = [
    { number: 1, title: 'Personal Info', icon: User },
    { number: 2, title: 'Security', icon: Lock },
    { number: 3, title: 'Organization', icon: Building },
    { number: 4, title: 'Review', icon: CheckCircle },
  ]

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
    <div className="w-full flex justify-center">
      <AuthCard
        title="Create Account"
        description="Join iBlood and start managing your blood bank"
        footerText="Already have an account?"
        footerLink={<Link href="/auth/login" className="font-semibold text-primary hover:underline">Sign in</Link>}
      >
        {/* Progress Steps */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2 overflow-x-auto">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isCompleted = currentStep > step.number
              const isCurrent = currentStep === step.number
              
              return (
                <div key={step.number} className="flex items-center flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStepClick(step.number)}
                    disabled={step.number > currentStep}
                    className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-all ${
                      isCompleted
                        ? 'bg-primary border-primary text-primary-foreground'
                        : isCurrent
                        ? 'border-primary text-primary bg-primary/5'
                        : 'border-gray-300 text-gray-400'
                    } ${step.number > currentStep ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-primary'}`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                  <div className={`w-8 sm:w-16 md:w-20 lg:w-24 h-0.5 mx-1 sm:mx-2 ${
                    currentStep > step.number ? 'bg-primary' : 'bg-gray-300'
                  }`} />
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-2 overflow-x-auto">
            {steps.map(step => (
              <span key={step.number} className={`text-center flex-shrink-0 w-16 sm:w-20 ${
                currentStep >= step.number ? 'text-primary font-medium' : ''
              }`}>
                {step.title}
              </span>
            ))}
          </div>
          <Progress value={(currentStep / totalSteps) * 100} className="mt-4 h-2" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 border border-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Let's get started</h3>
                <p className="text-sm text-muted-foreground">Enter your personal information</p>
              </div>

              <FieldGroup>
                <Field>
                  <FieldLabel>Full Name *</FieldLabel>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="John Doe"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required
                      disabled={isLoading}
                      className={`pl-10 ${touched.fullName && !formData.fullName ? 'border-red-500' : ''}`}
                      autoComplete="name"
                    />
                  </div>
                  {touched.fullName && !formData.fullName && (
                    <FieldDescription className="text-red-600">Full name is required</FieldDescription>
                  )}
                </Field>
              </FieldGroup>

              <FieldGroup>
                <Field>
                  <FieldLabel>Email Address *</FieldLabel>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="name@hospital.com"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required
                      disabled={isLoading}
                      className={`pl-10 ${touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? 'border-red-500' : ''}`}
                      autoComplete="email"
                    />
                  </div>
                  {touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                    <FieldDescription className="text-red-600">Please enter a valid email</FieldDescription>
                  )}
                </Field>
              </FieldGroup>

              <div className="pt-4">
                <Button type="button" onClick={handleNext} className="w-full">
                  Next Step
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Security */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Secure your account</h3>
                <p className="text-sm text-muted-foreground">Create a strong password</p>
              </div>

              <FieldGroup>
                <Field>
                  <FieldLabel>Password *</FieldLabel>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required
                      disabled={isLoading}
                      className={`pl-10 pr-10 ${touched.password && formData.password.length < 6 ? 'border-red-500' : ''}`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[0, 1, 2, 3, 4].map(i => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded ${
                              i < passwordStrength
                                ? passwordStrength <= 2
                                  ? 'bg-red-500'
                                  : passwordStrength <= 3
                                  ? 'bg-yellow-500'
                                  : passwordStrength <= 4
                                  ? 'bg-blue-500'
                                  : 'bg-green-500'
                                : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      {strengthLabel && (
                        <p className={`text-xs ${strengthLabel.color}`}>
                          Password strength: {strengthLabel.text}
                        </p>
                      )}
                    </div>
                  )}
                </Field>
              </FieldGroup>

              <FieldGroup>
                <Field>
                  <FieldLabel>Confirm Password *</FieldLabel>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required
                      disabled={isLoading}
                      className={`pl-10 pr-10 ${
                        touched.confirmPassword && formData.confirmPassword && formData.password !== formData.confirmPassword
                          ? 'border-red-500'
                          : touched.confirmPassword && formData.password === formData.confirmPassword
                          ? 'border-green-500'
                          : ''
                      }`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {touched.confirmPassword && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <FieldDescription className="text-red-600">Passwords do not match</FieldDescription>
                  )}
                  {touched.confirmPassword && formData.password === formData.confirmPassword && formData.password && (
                    <FieldDescription className="text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Passwords match
                    </FieldDescription>
                  )}
                </Field>
              </FieldGroup>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <ul className="text-xs text-blue-800 space-y-1">
                  <li className="flex items-center gap-2">
                    {formData.password.length >= 8 ? <CheckCircle className="w-3 h-3 text-green-600" /> : <div className="w-3 h-3 rounded-full border border-gray-400" />}
                    At least 8 characters (recommended)
                  </li>
                  <li className="flex items-center gap-2">
                    {/[A-Z]/.test(formData.password) ? <CheckCircle className="w-3 h-3 text-green-600" /> : <div className="w-3 h-3 rounded-full border border-gray-400" />}
                    One uppercase letter
                  </li>
                  <li className="flex items-center gap-2">
                    {/[0-9]/.test(formData.password) ? <CheckCircle className="w-3 h-3 text-green-600" /> : <div className="w-3 h-3 rounded-full border border-gray-400" />}
                    One number
                  </li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleBack} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button type="button" onClick={handleNext} className="flex-1">
                  Next Step
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Organization */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Join an organization</h3>
                <p className="text-sm text-muted-foreground">Connect with your team</p>
              </div>

              <div className="space-y-3">
                <Label>How would you like to join?</Label>
                <RadioGroup
                  value={orgSelection}
                  onValueChange={setOrgSelection}
                  disabled={isLoading}
                  className="grid gap-3"
                >
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="create" id="create" className="mt-1" />
                    <Label htmlFor="create" className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        <span className="font-medium">Create new organization</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        You'll become the organization admin
                      </p>
                    </Label>
                  </div>

                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="join" id="join" className="mt-1" />
                    <Label htmlFor="join" className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        <span className="font-medium">Join existing organization</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Request to join and wait for admin approval
                      </p>
                    </Label>
                  </div>

                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="invite" id="invite" className="mt-1" />
                    <Label htmlFor="invite" className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        <span className="font-medium">I have an invitation token</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Enter your token to join with a pre-assigned role
                      </p>
                    </Label>
                  </div>
                </RadioGroup>

                {orgSelection === 'join' && (
                  <div className="mt-4 space-y-3">
                    <Label>Search Organization</Label>
                    <OrganizationSearch
                      onSelect={setSelectedOrg}
                      selectedOrg={selectedOrg}
                    />
                    
                    {selectedOrg && (
                      <>
                        <div className="mt-4">
                          <Label htmlFor="requestedRole">Requested Role</Label>
                          <select
                            id="requestedRole"
                            value={requestedRole}
                            onChange={(e) => setRequestedRole(e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                            disabled={isLoading}
                          >
                            <option value="viewer">Viewer (Read-only access)</option>
                            <option value="staff">Staff (Manage donors & inventory)</option>
                            <option value="manager">Manager (Manage requests & team)</option>
                          </select>
                        </div>
                        
                        <div className="mt-4">
                          <Label htmlFor="requestMessage">Message to Admin (Optional)</Label>
                          <textarea
                            id="requestMessage"
                            value={requestMessage}
                            onChange={(e) => setRequestMessage(e.target.value)}
                            placeholder="Tell us why you want to join..."
                            rows={3}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground resize-none"
                            disabled={isLoading}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {orgSelection === 'invite' && (
                  <FieldGroup className="mt-4">
                    <Field>
                      <FieldLabel>Invitation Token *</FieldLabel>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Enter your invitation token"
                          name="inviteToken"
                          value={formData.inviteToken}
                          onChange={handleChange}
                          disabled={isLoading}
                          className="pl-10"
                        />
                      </div>
                      <FieldDescription>
                        Contact your organization admin to get your invitation token
                      </FieldDescription>
                    </Field>
                  </FieldGroup>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleBack} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button type="button" onClick={handleNext} className="flex-1">
                  Review
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Review your information</h3>
                <p className="text-sm text-muted-foreground">Make sure everything is correct</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Personal Information</p>
                    <p className="font-medium">{formData.fullName}</p>
                    <p className="text-sm text-gray-600">{formData.email}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStepClick(1)}
                    className="ml-auto"
                  >
                    Edit
                  </Button>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Password</p>
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[0, 1, 2, 3, 4].map(i => (
                          <div
                            key={i}
                            className={`w-3 h-3 rounded-full ${
                              i < passwordStrength ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm">{strengthLabel?.text || 'Not set'}</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStepClick(2)}
                    className="ml-auto"
                  >
                    Edit
                  </Button>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Organization</p>
                    <p className="font-medium">
                      {orgSelection === 'create' && 'Create new organization'}
                      {orgSelection === 'join' && selectedOrg?.name}
                      {orgSelection === 'join' && !selectedOrg && 'Not selected'}
                      {orgSelection === 'invite' && 'Join with invitation token'}
                    </p>
                    {orgSelection === 'join' && requestedRole && (
                      <p className="text-sm text-gray-600">Requested role: {requestedRole}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStepClick(3)}
                    className="ml-auto"
                  >
                    Edit
                  </Button>
                </div>
              </div>

              <label className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                <input type="checkbox" className="w-4 h-4 rounded border-border mt-1" required />
                <span className="text-xs text-gray-600">
                  I agree to the{' '}
                  <Link href="/" className="text-primary hover:underline">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/" className="text-primary hover:underline">Privacy Policy</Link>
                </span>
              </label>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleBack} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Create Account
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Divider - Only show on steps 1-3 */}
          {currentStep < 4 && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-background px-2 text-foreground/60">Or sign up with</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => handleOAuthLogin('google')}
                  disabled={isLoading || currentStep !== 1}
                >
                  Google
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => handleOAuthLogin('discord')}
                  disabled={isLoading || currentStep !== 1}
                >
                  Discord
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => handleOAuthLogin('github')}
                  disabled={isLoading || currentStep !== 1}
                >
                  GitHub
                </Button>
              </div>
            </>
          )}

          {/* Security Notice */}
          {currentStep === 4 && (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-foreground/50">
              <Droplet className="w-3 h-3 text-primary" />
              <span>Secure authentication powered by Supabase</span>
            </div>
          )}
        </form>
      </AuthCard>
    </div>
  )
}
