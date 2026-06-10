'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatBloodTypeLabel } from '@/lib/donor-blood-types'
import {
  checkDonationEligibility,
  DONATION_ELIGIBILITY_CRITERIA,
  getComponentEligibilityGrid,
  isEligibleForAnyComponent,
} from '@/lib/donation-eligibility'
import { DonationEligibilityPanel } from '@/components/register/donation-eligibility-panel'
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Droplet,
  CheckCircle,
  AlertCircle,
  Loader2,
  Heart,
  Shield,
  Copy,
  ExternalLink,
  Share2,
  Sparkles,
  Megaphone,
  ChevronRight,
} from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const params = useParams()
  const [drive, setDrive] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [registrationStep, setRegistrationStep] = useState('landing')
  /** donor = donating blood | supporter = share-only when ineligible or chosen */
  const [registrationMode, setRegistrationMode] = useState('donor')
  /** Rich 409 payload when email/phone already exists for this org (same drive). */
  const [existingDonorHelp, setExistingDonorHelp] = useState(null)
  const [notEligibleHelp, setNotEligibleHelp] = useState(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bloodType: 'unknown',
    dateOfBirth: '',
    gender: 'male',
    weight: '',
    hasDonatedBefore: false,
    lastDonationDate: '',
    intendedDonationComponent: 'whole_blood',
    medicalConditions: '',
    medications: '',
    consentGiven: false,
  })
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpResendDisabled, setOtpResendDisabled] = useState(false)
  const [otpResendTimer, setOtpResendTimer] = useState(0)
  const [otpAttempts, setOtpAttempts] = useState(0)
  const [maxOtpAttempts] = useState(5) // Increased to match backend
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [donorToken, setDonorToken] = useState(null)
  const [donorData, setDonorData] = useState(null)
  const [verificationToken, setVerificationToken] = useState(null)
  const [verified, setVerified] = useState(false)

  const [landingEligibility, setLandingEligibility] = useState({
    hasDonatedBefore: false,
    lastDonationDate: '',
  })

  const shareUrl =
    typeof window !== 'undefined' && params.token
      ? `${window.location.origin}/register/${params.token}`
      : ''

  const landingAnyEligible = useMemo(() => {
    if (!drive?.date) return true
    if (!landingEligibility.hasDonatedBefore) return true
    if (!landingEligibility.lastDonationDate) return null
    return isEligibleForAnyComponent({
      lastDonationDate: landingEligibility.lastDonationDate,
      driveDate: drive.date,
    })
  }, [drive?.date, landingEligibility])

  const donationEligibilityPreview = useMemo(() => {
    if (!drive?.date || registrationMode === 'supporter') return null
    if (!formData.hasDonatedBefore && !formData.lastDonationDate) return null
    if (formData.hasDonatedBefore && !formData.lastDonationDate) {
      return {
        eligible: null,
        needsDate: true,
        criteria: DONATION_ELIGIBILITY_CRITERIA,
      }
    }
    return {
      ...checkDonationEligibility({
        lastDonationDate: formData.lastDonationDate,
        driveDate: drive.date,
        component: formData.intendedDonationComponent,
      }),
      needsDate: false,
    }
  }, [
    drive?.date,
    formData.hasDonatedBefore,
    formData.lastDonationDate,
    formData.intendedDonationComponent,
    registrationMode,
  ])

  useEffect(() => {
    if (registrationMode !== 'donor' || !drive?.date || !formData.hasDonatedBefore || !formData.lastDonationDate) {
      return
    }
    const rows = getComponentEligibilityGrid({
      lastDonationDate: formData.lastDonationDate,
      driveDate: drive.date,
    })
    const current = rows.find((r) => r.key === formData.intendedDonationComponent)
    if (current?.eligible) return
    const firstEligible = rows.find((r) => r.eligible)
    if (firstEligible) {
      setFormData((prev) => ({ ...prev, intendedDonationComponent: firstEligible.key }))
    }
  }, [
    registrationMode,
    drive?.date,
    formData.hasDonatedBefore,
    formData.lastDonationDate,
    formData.intendedDonationComponent,
  ])

  const openRegistration = (mode = 'donor') => {
    setRegistrationMode(mode)
    if (mode === 'supporter') {
      setFormData((prev) => ({
        ...prev,
        hasDonatedBefore: landingEligibility.hasDonatedBefore,
        lastDonationDate: landingEligibility.lastDonationDate,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        hasDonatedBefore: landingEligibility.hasDonatedBefore,
        lastDonationDate: landingEligibility.lastDonationDate,
      }))
    }
    setRegistrationStep('form')
  }

  // Load verification state from localStorage on mount
  useEffect(() => {
    try {
      const savedVerification = localStorage.getItem('registration_verification')
      if (savedVerification) {
        const { token, phone, email, expiresAt } = JSON.parse(savedVerification)
        
        // Check if token is still valid
        if (new Date(expiresAt) > new Date()) {
          setVerificationToken(token)
          setVerified(true)
          // Restore contact info
          setFormData(prev => ({
            ...prev,
            phone: phone || prev.phone,
            email: email || prev.email,
          }))
          console.log('[Register] Restored verification from localStorage')
        } else {
          // Token expired, clear it
          localStorage.removeItem('registration_verification')
          console.log('[Register] Cleared expired verification token')
        }
      }
    } catch (err) {
      console.error('[Register] Error loading verification state:', err)
    }
  }, [])

  useEffect(() => {
    if (params.token) {
      fetchDriveDetails(params.token)
    }
  }, [params.token])

  const fetchDriveDetails = async (token) => {
    try {
      setLoading(true)
      setError(null)

      // Track click
      await fetch(`/api/register/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
        body: JSON.stringify({ token, action: 'click' }),
      }).catch(() => {}) // Ignore errors

      const res = await fetch(`/api/register/drive?token=${token}`)
      const data = await res.json()

      if (res.ok) {
        setDrive(data.data)
      } else {
        setError(data.error || 'Invalid registration link')
      }
    } catch (err) {
      setError('Failed to load drive details')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const formatOtpDeliveryMessage = (data) => {
    if (data.method === 'email') {
      return `Verification code sent to ${formData.email}. Check your inbox and spam folder.`
    }
    if (data.method === 'sms') {
      return data.fallbackUsed
        ? `We could not reach your email, so the code was sent via SMS to ${formData.phone}.`
        : `Verification code sent via SMS to ${formData.phone}.`
    }
    if (data.method === 'console') {
      return 'Verification code generated for demo mode. Check the server console if email and SMS are unavailable.'
    }
    return 'Verification code sent.'
  }

  const handleSendOTP = async () => {
    if (!formData.email) {
      setActionError('Please enter your email address to receive the verification code')
      return
    }

    if (!formData.phone || formData.phone.length < 10) {
      setActionError('Please enter a valid phone number as a backup delivery option')
      return
    }

    // Check max attempts
    if (otpAttempts >= maxOtpAttempts) {
      setActionError(`Maximum OTP attempts (${maxOtpAttempts}) reached. Please try again later.`)
      return
    }

    console.log('[Frontend] Sending OTP:', { phone: formData.phone, email: formData.email })

    setActionLoading(true)
    setActionError(null)

    try {
      const res = await fetch('/api/register/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
        body: JSON.stringify({
          phone: formData.phone,
          email: formData.email,
        }),
      })

      const data = await res.json()

      console.log('[Frontend] OTP send response:', data)

      if (res.ok) {
        setOtpSent(true)
        setOtpResendDisabled(true)
        setOtpResendTimer(60) // 60 second cooldown
        setOtpAttempts(prev => prev + 1)
        setActionSuccess(`${formatOtpDeliveryMessage(data)} (${otpAttempts + 1}/${maxOtpAttempts})`)
        
        // Start countdown timer
        const timer = setInterval(() => {
          setOtpResendTimer(prev => {
            if (prev <= 1) {
              clearInterval(timer)
              setOtpResendDisabled(false)
              return 0
            }
            return prev - 1
          })
        }, 1000)
        
        setTimeout(() => setActionSuccess(null), 5000)
      } else {
        setActionError(data.error || 'Failed to send OTP')
      }
    } catch (err) {
      console.error('[Frontend] OTP send error:', err)
      setActionError('Failed to send OTP')
    } finally {
      setActionLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (otpResendDisabled) return
    handleSendOTP()
  }

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setActionError('Please enter a valid 6-digit OTP')
      return
    }

    console.log('[Frontend] Verifying OTP:', { phone: formData.phone, email: formData.email, otp: '***' })

    setActionLoading(true)
    setActionError(null)

    try {
      const res = await fetch('/api/register/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
        body: JSON.stringify({
          phone: formData.phone,
          email: formData.email,
          otp,
        }),
      })

      const data = await res.json()

      console.log('[Frontend] OTP verification response:', data)

      if (res.ok) {
        setActionSuccess('OTP verified successfully!')
        
        // Store verification token in localStorage for persistence
        if (data.verificationToken) {
          setVerificationToken(data.verificationToken)
          setVerified(true)
          
          // Save to localStorage for page refresh resilience
          localStorage.setItem('registration_verification', JSON.stringify({
            token: data.verificationToken,
            phone: formData.phone,
            email: formData.email,
            expiresAt: data.tokenExpiresAt,
          }))
          
          console.log('[Frontend] Verification token stored:', {
            token: '***',
            expiresAt: new Date(data.tokenExpiresAt).toISOString(),
          })
        }
        
        setTimeout(() => setActionSuccess(null), 2000)
        // OTP verified, proceed to registration form
        setRegistrationStep('form')
      } else {
        setActionError(data.error || 'Invalid OTP')
        
        // Update attempts if provided
        if (data.remainingAttempts !== undefined) {
          setActionError(prev => prev + ` (${data.remainingAttempts} attempts remaining)`)
        }
        
        // If max attempts reached, reset OTP state
        if (data.maxAttemptsReached) {
          setOtpSent(false)
          setOtpAttempts(0)
        }
      }
    } catch (err) {
      console.error('[Frontend] OTP verification error:', err)
      setActionError('Failed to verify OTP')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()

    // Validate form
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      setActionError('Please fill in all required fields')
      return
    }

    if (!formData.consentGiven) {
      setActionError('You must give consent to register')
      return
    }

    if (
      registrationMode === 'donor' &&
      formData.hasDonatedBefore &&
      !formData.lastDonationDate
    ) {
      setActionError('Please enter your last donation date so we can check eligibility for this drive')
      return
    }

    if (
      registrationMode === 'donor' &&
      donationEligibilityPreview &&
      donationEligibilityPreview.eligible === false
    ) {
      setNotEligibleHelp({
        message: donationEligibilityPreview.message,
        eligibility: donationEligibilityPreview,
      })
      setRegistrationStep('not_eligible')
      return
    }

    // Check if OTP was verified
    if (!verified || !verificationToken) {
      setActionError('Please verify your phone/email with OTP first')
      setRegistrationStep('form') // OTP is embedded in the form step
      return
    }

    setActionLoading(true)
    setActionError(null)

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL: Send cookies (auth-session)
        body: JSON.stringify({
          ...formData,
          driveToken: params.token,
          verificationToken,
          registerAsSupporter: registrationMode === 'supporter',
          intendedDonationComponent: formData.intendedDonationComponent,
        }),
      })

      const data = await res.json()

      console.log('[Registration Response] Data:', data)
      console.log('[Registration Response] data.data:', data.data)

      if (res.ok) {
        // Clear verification token from localStorage
        localStorage.removeItem('registration_verification')

        // Store donor token - handle both possible response structures
        const token = data.data?.donorToken || data.donorToken
        const donorId = data.data?.donorId || data.donorId
        const fullName = data.data?.fullName || data.fullName
        const bloodType = data.data?.bloodType || data.bloodType
        const profileUrl = data.data?.profileUrl || data.profileUrl
        
        console.log('[Registration] Extracted values:', {
          token,
          donorId,
          fullName,
          bloodType,
          profileUrl,
        })

        setDonorToken(token)
        
        // Store donor data for success page
        setDonorData({
          donorId,
          donorToken: token,
          fullName,
          bloodType,
          profileUrl,
          shareUrl: data.data?.shareUrl || shareUrl,
          participantRole: data.data?.participantRole || data.supporter ? 'supporter' : 'donor',
          intendedDonationComponent: data.data?.intendedDonationComponent,
          welcomeMessage: data.message || null,
        })

        setRegistrationStep('success')
      } else if (res.status === 409 && data.notEligible) {
        setNotEligibleHelp({
          message: data.message || data.error,
          eligibility: data.eligibility,
        })
        setRegistrationStep('not_eligible')
      } else if (res.status === 409 && data.duplicate) {
        setExistingDonorHelp({
          message: data.message || data.error,
          rsvpUrl: data.rsvpUrl,
          rsvpShortUrl: data.rsvpShortUrl,
          profileUrl: data.profileUrl,
          participantStatus: data.participantStatus,
        })
        setRegistrationStep('existing_donor')
      } else {
        setActionError(data.error || 'Registration failed')

        // If token expired, redirect to OTP verification
        if (data.tokenExpired || data.otpRequired) {
          setTimeout(() => {
            setRegistrationStep('form') // OTP is embedded in the form step
            setVerified(false)
            setOtpSent(false)
          }, 2000)
        }
      }
    } catch (err) {
      setActionError('Registration failed')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading drive details...</p>
        </div>
      </div>
    )
  }

  if (error || !drive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white">
        <Card className="max-w-md p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Link</h2>
            <p className="text-gray-600 mb-4">{error || 'This registration link is invalid or expired'}</p>
            <Button onClick={() => router.push('/')}>
              Go to Homepage
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Heart className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Blood Donation Registration</h1>
          <p className="text-gray-600">Join us in saving lives</p>
        </div>

        {registrationStep === 'landing' && (
          <>
            {/* Drive Info Card */}
            <Card className="mb-8 overflow-hidden">
              <div className="bg-red-600 text-white p-6">
                <h2 className="text-2xl font-bold">{drive.name}</h2>
                <p className="text-red-100 mt-2">{drive.description}</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-red-600 mt-1" />
                  <div>
                    <p className="font-semibold">Date & Time</p>
                    <p className="text-gray-600">
                      {new Date(drive.date).toLocaleDateString()}
                      {drive.startTime && ` • ${drive.startTime} - ${drive.endTime}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-red-600 mt-1" />
                  <div>
                    <p className="font-semibold">Location</p>
                    <p className="text-gray-600">{drive.location}{drive.city && `, ${drive.city}`}</p>
                    {drive.address && <p className="text-gray-500 text-sm">{drive.address}</p>}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-red-600 mt-1" />
                  <div>
                    <p className="font-semibold">Target</p>
                    <p className="text-gray-600">{drive.targetDonors} donors needed</p>
                  </div>
                </div>
                {drive.stats && drive.stats.registrations > 0 && (
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
                    <div>
                      <p className="font-semibold">Registrations</p>
                      <p className="text-gray-600">{drive.stats.registrations} donors registered</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Benefits */}
            <Card className="mb-8">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Why Donate Blood?</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Droplet className="w-5 h-5 text-red-600 mt-1" />
                    <p className="text-gray-600">Save up to 3 lives with one donation</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-red-600 mt-1" />
                    <p className="text-gray-600">Free mini health checkup</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Heart className="w-5 h-5 text-red-600 mt-1" />
                    <p className="text-gray-600">Help patients in emergency situations</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-red-600 mt-1" />
                    <p className="text-gray-600">Be part of a life-saving community</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Eligibility preview — before starting the form */}
            <Card className="mb-8 overflow-hidden border-0 shadow-xl shadow-red-100/50">
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-red-300">
                  Step 1 — Know before you go
                </p>
                <h3 className="text-xl font-bold text-white mt-1">Am I eligible to donate?</h3>
              </div>
              <div className="p-6 space-y-5 bg-white">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="landing-donated-before">Have you donated blood before?</Label>
                    <select
                      id="landing-donated-before"
                      value={landingEligibility.hasDonatedBefore ? 'yes' : 'no'}
                      onChange={(e) =>
                        setLandingEligibility((prev) => ({
                          ...prev,
                          hasDonatedBefore: e.target.value === 'yes',
                          lastDonationDate: e.target.value === 'yes' ? prev.lastDonationDate : '',
                        }))
                      }
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium"
                    >
                      <option value="no">No — first time</option>
                      <option value="yes">Yes — I have donated before</option>
                    </select>
                  </div>
                  {landingEligibility.hasDonatedBefore && (
                    <div>
                      <Label htmlFor="landing-last-donation">Last donation date</Label>
                      <Input
                        id="landing-last-donation"
                        type="date"
                        value={landingEligibility.lastDonationDate}
                        onChange={(e) =>
                          setLandingEligibility((prev) => ({
                            ...prev,
                            lastDonationDate: e.target.value,
                          }))
                        }
                        max={new Date().toISOString().split('T')[0]}
                        className="mt-1.5 rounded-xl"
                      />
                    </div>
                  )}
                </div>

                <DonationEligibilityPanel
                  driveDate={drive.date}
                  hasDonatedBefore={landingEligibility.hasDonatedBefore}
                  lastDonationDate={landingEligibility.lastDonationDate}
                  showComponentPicker={false}
                  compact={false}
                />
              </div>
            </Card>

            {/* Registration CTAs */}
            <div className="space-y-4">
              {(landingAnyEligible === true || landingAnyEligible === null) && (
                <Button
                  size="lg"
                  className="w-full h-14 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-lg shadow-lg shadow-red-200/60 rounded-xl"
                  onClick={() => openRegistration('donor')}
                  disabled={landingAnyEligible === null}
                >
                  <Heart className="w-5 h-5 mr-2" />
                  Register to donate
                  <ChevronRight className="w-5 h-5 ml-auto opacity-80" />
                </Button>
              )}

              {landingAnyEligible === false && (
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 text-center">
                  <Megaphone className="w-10 h-10 text-amber-600 mx-auto mb-3" />
                  <p className="text-sm text-amber-900 font-medium mb-4">
                    You are not eligible to donate at this drive date — but you can still save lives as a
                    <strong> drive supporter</strong>.
                  </p>
                  <Button
                    size="lg"
                    className="w-full h-12 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-xl"
                    onClick={() => openRegistration('supporter')}
                  >
                    <Share2 className="w-5 h-5 mr-2" />
                    Register as drive supporter
                  </Button>
                </div>
              )}

              <Button
                variant="outline"
                size="lg"
                className="w-full h-12 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
                onClick={() => openRegistration('supporter')}
              >
                <Sparkles className="w-5 h-5 mr-2 text-amber-600" />
                I want to help by sharing (supporter)
              </Button>

              <p className="text-center text-sm text-gray-500">
                Donor registration takes about 5 minutes · Supporters ~3 minutes
              </p>
            </div>
          </>
        )}

        {registrationStep === 'form' && (
          <Card className="overflow-hidden shadow-xl border-0">
            <div
              className={`px-6 py-5 ${
                registrationMode === 'supporter'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white'
                  : 'bg-gradient-to-r from-red-600 to-rose-600 text-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-90">
                    {registrationMode === 'supporter' ? 'Drive supporter' : 'Blood donor'}
                  </p>
                  <h2 className="text-2xl font-bold mt-0.5">
                    {registrationMode === 'supporter' ? 'Share & support' : 'Donor registration'}
                  </h2>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 text-white border-0 hover:bg-white/30"
                  onClick={() => setRegistrationStep('landing')}
                >
                  Back
                </Button>
              </div>
              {registrationMode === 'supporter' && (
                <p className="text-sm text-amber-50 mt-2 max-w-xl">
                  You will not be in the donation queue. Help us reach eligible donors by sharing this drive.
                </p>
              )}
            </div>
            <div className="p-6">

              {/* Verification Status Banner */}
              {verified && verificationToken && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <div>
                    <p className="font-semibold">Phone/Email Verified</p>
                    <p className="text-sm text-green-700">
                      Your contact information has been verified. You can now complete your registration.
                    </p>
                  </div>
                </div>
              )}

              {actionError && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
                  {actionError}
                </div>
              )}

              {actionSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4">
                  {actionSuccess}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-6">
                {/* Personal Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Personal Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        disabled={verified}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Your verification code is sent here first.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        placeholder="712 345 678 (e.g., 0712 345 678)"
                        disabled={verified}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Used as backup if email delivery fails (e.g., 0712 345 678 or +254 712 345 678)
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendOTP}
                      disabled={!formData.email || !formData.phone || otpSent || verified || actionLoading}
                    >
                      {actionLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : verified ? (
                        <>Verified ✓</>
                      ) : otpSent ? (
                        <>Code sent ✓</>
                      ) : (
                        'Send verification code'
                      )}
                    </Button>
                  </div>
                  {otpSent && !verified && (
                    <div>
                      <Label htmlFor="otp">Enter verification code *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="otp"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          placeholder="123456"
                          maxLength={6}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleVerifyOTP}
                          disabled={!otp || actionLoading}
                        >
                          {actionLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            'Verify'
                          )}
                        </Button>
                      </div>

                      {/* Resend OTP Section */}
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          Didn&apos;t receive the code? Check spam, then resend.
                        </p>
                        {otpResendDisabled ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled
                            className="text-xs"
                          >
                            Resend in {otpResendTimer}s
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={handleResendOTP}
                            className="text-xs p-0 h-auto"
                            disabled={otpAttempts >= maxOtpAttempts || actionLoading}
                          >
                            {actionLoading ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin inline" />
                                Resending...
                              </>
                            ) : (
                              <>
                                Resend OTP
                                {otpAttempts > 0 && (
                                  <span className="ml-1 text-gray-500">
                                    ({otpAttempts}/{maxOtpAttempts})
                                  </span>
                                )}
                              </>
                            )}
                          </Button>
                        )}
                      </div>

                      {otpAttempts >= maxOtpAttempts && (
                        <p className="text-xs text-red-600 mt-2">
                          Maximum attempts reached. Please contact support if you continue to have issues.
                        </p>
                      )}
                    </div>
                  )}
                  <div className={`grid gap-4 ${registrationMode === 'donor' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                    {registrationMode === 'donor' ? (
                      <div>
                        <Label htmlFor="bloodType">Blood Type</Label>
                        <select
                          id="bloodType"
                          name="bloodType"
                          value={formData.bloodType}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                        >
                          <option value="unknown">I don&apos;t know yet</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Choose &quot;I don&apos;t know yet&quot; if unsure - staff will confirm during screening.
                        </p>
                      </div>
                    ) : null}
                    <div>
                      <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                      <Input
                        id="dateOfBirth"
                        name="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="gender">Gender *</Label>
                      <select
                        id="gender"
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  {registrationMode === 'donor' && (
                    <div>
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input
                        id="weight"
                        name="weight"
                        type="number"
                        value={formData.weight}
                        onChange={handleInputChange}
                        placeholder="e.g., 70"
                      />
                    </div>
                  )}
                </div>

                {/* Medical Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">
                    {registrationMode === 'supporter' ? 'Your donation history (optional)' : 'Medical information'}
                  </h3>
                  <div>
                    <Label htmlFor="hasDonatedBefore">Have you donated blood before?</Label>
                    <select
                      id="hasDonatedBefore"
                      name="hasDonatedBefore"
                      value={formData.hasDonatedBefore ? 'yes' : 'no'}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          hasDonatedBefore: e.target.value === 'yes',
                          lastDonationDate: e.target.value === 'yes' ? prev.lastDonationDate : '',
                        }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="no">No — this would be my first time</option>
                      <option value="yes">Yes — I have donated before (anywhere)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      We check whole blood, platelet, and plasma spacing rules against this drive date.
                    </p>
                  </div>
                  {formData.hasDonatedBefore && (
                    <div>
                      <Label htmlFor="lastDonationDate">Last Donation Date *</Label>
                      <Input
                        id="lastDonationDate"
                        name="lastDonationDate"
                        type="date"
                        value={formData.lastDonationDate}
                        onChange={handleInputChange}
                        required={registrationMode === 'donor'}
                        max={new Date().toISOString().split('T')[0]}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Compared to drive date{' '}
                        {drive ? new Date(drive.date).toLocaleDateString() : 'on file'} for each component type.
                      </p>
                    </div>
                  )}
                  {registrationMode === 'donor' && (
                    <DonationEligibilityPanel
                      driveDate={drive.date}
                      hasDonatedBefore={formData.hasDonatedBefore}
                      lastDonationDate={formData.lastDonationDate}
                      intendedComponent={formData.intendedDonationComponent}
                      onIntendedComponentChange={(v) =>
                        setFormData((prev) => ({ ...prev, intendedDonationComponent: v }))
                      }
                      showComponentPicker={formData.hasDonatedBefore && Boolean(formData.lastDonationDate)}
                      compact={!formData.hasDonatedBefore}
                      className="border-t border-slate-100 pt-4"
                    />
                  )}
                  {registrationMode === 'donor' && (
                    <div>
                      <Label htmlFor="medicalConditions">Medical Conditions (if any)</Label>
                    <Textarea
                      id="medicalConditions"
                      name="medicalConditions"
                      value={formData.medicalConditions}
                      onChange={handleInputChange}
                      placeholder="List any medical conditions..."
                      rows={3}
                    />
                    </div>
                  )}
                  {registrationMode === 'donor' && (
                    <div>
                      <Label htmlFor="medications">Current Medications (if any)</Label>
                      <Textarea
                        id="medications"
                        name="medications"
                        value={formData.medications}
                        onChange={handleInputChange}
                        placeholder="List any current medications..."
                        rows={3}
                      />
                    </div>
                  )}
                </div>

                {/* Consent */}
                <div
                  className={`p-4 rounded-xl border ${
                    registrationMode === 'supporter'
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="consentGiven"
                      checked={formData.consentGiven}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                    <span className="text-sm text-gray-700">
                      {registrationMode === 'supporter' ? (
                        <>
                          I consent to be contacted about this blood drive and to help promote it by sharing
                          the registration link. I understand I am registering as a supporter, not as a blood
                          donor for this drive.
                        </>
                      ) : (
                        <>
                          I consent to donating blood and confirm that the information provided is accurate. I
                          understand that my data will be used for donation purposes only.
                        </>
                      )}
                    </span>
                  </label>
                </div>

                {/* Submit */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRegistrationStep('landing')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading || !verified}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Registering...
                      </>
                    ) : registrationMode === 'supporter' ? (
                      <>
                        <Share2 className="w-4 h-4 mr-2" />
                        Join as supporter
                      </>
                    ) : (
                      <>
                        <Heart className="w-4 h-4 mr-2" />
                        Complete registration
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        )}

        {registrationStep === 'not_eligible' && notEligibleHelp && drive && (
          <Card className="overflow-hidden border-amber-200 shadow-xl">
            <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
            <div className="p-8 md:p-10">
              <div className="flex flex-col items-center text-center max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-5">
                  <Clock className="w-9 h-9 text-amber-700" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Not eligible for this drive yet
                </h2>
                <p className="text-gray-600 leading-relaxed mb-6">{notEligibleHelp.message}</p>
                {notEligibleHelp.eligibility?.nextEligibleDisplay && (
                  <p className="text-sm font-semibold text-amber-800 mb-6">
                    Next eligible date: {notEligibleHelp.eligibility.nextEligibleDisplay}
                  </p>
                )}
                <div className="w-full max-w-md rounded-xl bg-slate-50 border border-slate-200 p-4 text-left mb-6">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Why this matters
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                    {(notEligibleHelp.eligibility?.criteria || DONATION_ELIGIBILITY_CRITERIA).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div className="w-full max-w-md rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-5 text-left mb-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Megaphone className="w-5 h-5 text-amber-700" />
                    <p className="text-sm font-bold text-amber-900">Become a drive supporter</p>
                  </div>
                  <p className="text-sm text-amber-800 mb-4">
                    Register to share this drive — no donation required. We will email you the link and tips to
                    help eligible friends sign up.
                  </p>
                  <Button
                    className="w-full h-12 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-xl"
                    onClick={() => {
                      setNotEligibleHelp(null)
                      openRegistration('supporter')
                    }}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Register as supporter
                  </Button>
                  {params.token && (
                    <Button
                      variant="outline"
                      className="mt-3 w-full border-amber-300 text-amber-900 hover:bg-amber-100"
                      onClick={() => {
                        const url = `${window.location.origin}/register/${params.token}`
                        navigator.clipboard.writeText(url)
                        setActionSuccess('Registration link copied!')
                        setTimeout(() => setActionSuccess(null), 2500)
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy link only
                    </Button>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setNotEligibleHelp(null)
                    setRegistrationMode('donor')
                    setRegistrationStep('form')
                  }}
                >
                  Review my answers
                </Button>
              </div>
            </div>
          </Card>
        )}

        {registrationStep === 'existing_donor' && existingDonorHelp && drive && (
          <Card className="overflow-hidden border-rose-200 shadow-xl">
            <div className="h-2 w-full bg-gradient-to-r from-rose-600 via-red-500 to-amber-500" />
            <div className="p-8 md:p-10">
              <div className="flex flex-col items-center text-center max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center mb-5">
                  <Heart className="w-9 h-9 text-rose-600" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  You&apos;re already one of our donors
                </h2>
                <p className="text-gray-600 leading-relaxed mb-6">{existingDonorHelp.message}</p>
                {existingDonorHelp.participantStatus && (
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose-700/80 mb-6">
                    Drive status on file:{' '}
                    <span className="normal-case font-bold">{existingDonorHelp.participantStatus.replace(/_/g, ' ')}</span>
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                  {(existingDonorHelp.rsvpShortUrl || existingDonorHelp.rsvpUrl) && (
                    <Button
                      className="flex-1 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 h-12 text-base shadow-lg"
                      onClick={() =>
                        window.open(existingDonorHelp.rsvpShortUrl || existingDonorHelp.rsvpUrl, '_blank')
                      }
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open your RSVP
                    </Button>
                  )}
                  {existingDonorHelp.profileUrl && (
                    <Button
                      variant="outline"
                      className="flex-1 h-12 text-base border-rose-200 hover:bg-rose-50"
                      onClick={() => window.open(existingDonorHelp.profileUrl, '_blank')}
                    >
                      Donor profile
                    </Button>
                  )}
                </div>
                <div className="mt-8 w-full max-w-md rounded-xl bg-slate-50 border border-slate-200 p-4 text-left">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">This drive</p>
                  <p className="font-semibold text-gray-900">{drive.name}</p>
                  <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4 shrink-0" />
                    {new Date(drive.date).toLocaleDateString()}
                    {drive.startTime && (
                      <span className="text-gray-500">
                        · {drive.startTime}
                        {drive.endTime ? ` – ${drive.endTime}` : ''}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-600 mt-1 flex items-start gap-2">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                    {drive.location}
                    {drive.city ? `, ${drive.city}` : ''}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="mt-6 text-gray-500"
                  onClick={() => {
                    setExistingDonorHelp(null)
                    setRegistrationStep('landing')
                  }}
                >
                  Back to drive info
                </Button>
              </div>
            </div>
          </Card>
        )}

        {registrationStep === 'success' && (
          <Card className="overflow-hidden shadow-xl border-0">
            <div
              className={`h-2 w-full ${
                donorData?.participantRole === 'supporter'
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600'
                  : 'bg-gradient-to-r from-red-500 via-rose-500 to-red-600'
              }`}
            />
            <div className="p-6 text-center">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  donorData?.participantRole === 'supporter' ? 'bg-amber-100' : 'bg-green-100'
                }`}
              >
                {donorData?.participantRole === 'supporter' ? (
                  <Share2 className="w-12 h-12 text-amber-600" />
                ) : (
                  <CheckCircle className="w-12 h-12 text-green-600" />
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {donorData?.participantRole === 'supporter'
                  ? 'You are a drive supporter!'
                  : 'Registration complete!'}
              </h2>
              <p className="text-gray-600 mb-6">
                {donorData?.welcomeMessage ||
                  (donorData?.participantRole === 'supporter'
                    ? 'Thank you for helping spread the word.'
                    : 'Thank you for registering to donate blood')}
              </p>

              {/* Donor Information Card */}
              {donorData && (
                <div className="bg-gradient-to-r from-red-50 to-white border border-red-200 p-6 rounded-lg mb-6 text-left">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-600" />
                    Your Donor Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Full Name</p>
                      <p className="font-semibold text-gray-900">{donorData.fullName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Blood Type</p>
                      <div className="flex items-center gap-2">
                        <Droplet className="w-4 h-4 text-red-600" />
                        <span className="font-semibold text-red-700 bg-red-100 px-3 py-1 rounded-full text-sm">
                          {formatBloodTypeLabel(donorData.bloodType)}
                        </span>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600">Donor ID</p>
                      <p className="font-mono text-lg text-blue-700 bg-blue-50 px-3 py-2 rounded mt-1">
                        {donorData.donorToken || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Save this ID to access your donor profile</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Drive Information */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6 text-left">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Donation Drive Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Drive Name:</span>
                    <span className="font-medium text-gray-900">{drive.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(drive.date).toLocaleDateString()}
                    </span>
                  </div>
                  {drive.startTime && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time:</span>
                      <span className="font-medium text-gray-900">
                        {drive.startTime} - {drive.endTime}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium text-gray-900">{drive.location}</span>
                  </div>
                </div>
              </div>

              {/* WhatsApp Group Link */}
              {drive.whatsappGroupLink && (
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-2">Join our WhatsApp group for updates:</p>
                  <Button
                    onClick={() => window.open(drive.whatsappGroupLink, '_blank')}
                    className="bg-green-600 hover:bg-green-700 w-full"
                  >
                    Join WhatsApp Group
                  </Button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {donorData?.participantRole === 'supporter' ? (
                  <>
                    <Button
                      onClick={() => {
                        const url = donorData.shareUrl || shareUrl
                        if (url) {
                          navigator.clipboard.writeText(url)
                          setActionSuccess('Drive link copied — share it with eligible donors!')
                          setTimeout(() => setActionSuccess(null), 3000)
                        }
                      }}
                      className="w-full h-12 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-xl"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy drive registration link
                    </Button>
                    {typeof navigator !== 'undefined' && navigator.share && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() =>
                          navigator.share({
                            title: drive.name,
                            text: `Join our blood drive: ${drive.name}`,
                            url: donorData.shareUrl || shareUrl,
                          })
                        }
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share via device
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => {
                        if (donorData?.donorToken) {
                          router.push(`/donor/${donorData.donorToken}`)
                        } else {
                          setActionError('Donor ID not found. Please contact support.')
                          setTimeout(() => setActionError(null), 5000)
                        }
                      }}
                      className="w-full bg-red-600 hover:bg-red-700"
                      disabled={!donorData?.donorToken}
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      View my donor profile
                    </Button>
                    <Button
                      onClick={() => {
                        if (donorData?.donorToken) {
                          navigator.clipboard.writeText(donorData.donorToken)
                          setActionSuccess('Donor ID copied to clipboard!')
                          setTimeout(() => setActionSuccess(null), 3000)
                        }
                      }}
                      variant="outline"
                      className="w-full"
                      disabled={!donorData?.donorToken}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy donor ID
                    </Button>
                  </>
                )}
              </div>

              {actionSuccess && (
                <div className="mt-4 bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-lg text-sm">
                  {actionSuccess}
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Need help or have questions?</p>
                <Button
                  variant="link"
                  onClick={() => window.open(`mailto:${drive.organization?.email || 'support@iblood.com'}`)}
                  className="text-red-600"
                >
                  Contact Support
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
