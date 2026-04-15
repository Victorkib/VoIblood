'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
} from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const params = useParams()
  const [drive, setDrive] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [registrationStep, setRegistrationStep] = useState('landing') // landing, form, otp, success
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bloodType: 'O+',
    dateOfBirth: '',
    gender: 'male',
    weight: '',
    hasDonatedBefore: false,
    lastDonationDate: '',
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

  const handleSendOTP = async () => {
    // Validate phone or email
    if ((!formData.phone || formData.phone.length < 10) && !formData.email) {
      setActionError('Please enter a valid phone number or email')
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
        setActionSuccess(`OTP sent via ${data.method || 'SMS'}! (${otpAttempts + 1}/${maxOtpAttempts})`)
        
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
          verificationToken, // Include verification token
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
        })
        
        setRegistrationStep('success')
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

            {/* Registration Button */}
            <div className="text-center">
              <Button
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-lg"
                onClick={() => setRegistrationStep('form')}
              >
                <Heart className="w-5 h-5 mr-2" />
                Register Now
              </Button>
              <p className="text-sm text-gray-500 mt-4">
                Takes about 5 minutes to complete
              </p>
            </div>
          </>
        )}

        {registrationStep === 'form' && (
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Donor Registration</h2>
                <Button variant="outline" size="sm" onClick={() => setRegistrationStep('landing')}>
                  Back
                </Button>
              </div>

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
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          required
                          placeholder="712 345 678 (e.g., 0712 345 678)"
                          disabled={verified} // Disable if already verified
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSendOTP}
                          disabled={!formData.phone || otpSent || verified}
                        >
                          {verified ? 'Verified ✓' : otpSent ? 'Sent ✓' : 'Send OTP'}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Enter your Kenyan phone number (e.g., 0712 345 678 or +254 712 345 678)
                      </p>
                    </div>
                  </div>
                  {otpSent && !verified && (
                    <div>
                      <Label htmlFor="otp">Enter OTP *</Label>
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
                          disabled={!otp}
                        >
                          Verify
                        </Button>
                      </div>

                      {/* Resend OTP Section */}
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          Didn't receive the code?
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
                            disabled={otpAttempts >= maxOtpAttempts}
                          >
                            Resend OTP
                            {otpAttempts > 0 && (
                              <span className="ml-1 text-gray-500">
                                ({otpAttempts}/{maxOtpAttempts})
                              </span>
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
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="bloodType">Blood Type</Label>
                      <select
                        id="bloodType"
                        name="bloodType"
                        value={formData.bloodType}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      >
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>
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
                </div>

                {/* Medical Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Medical Information</h3>
                  <div>
                    <Label htmlFor="hasDonatedBefore">Have you donated blood before?</Label>
                    <select
                      id="hasDonatedBefore"
                      name="hasDonatedBefore"
                      value={formData.hasDonatedBefore ? 'yes' : 'no'}
                      onChange={(e) => setFormData(prev => ({ ...prev, hasDonatedBefore: e.target.value === 'yes' }))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                  {formData.hasDonatedBefore && (
                    <div>
                      <Label htmlFor="lastDonationDate">Last Donation Date</Label>
                      <Input
                        id="lastDonationDate"
                        name="lastDonationDate"
                        type="date"
                        value={formData.lastDonationDate}
                        onChange={handleInputChange}
                      />
                    </div>
                  )}
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
                </div>

                {/* Consent */}
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="consentGiven"
                      checked={formData.consentGiven}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                    <span className="text-sm text-gray-700">
                      I consent to donating blood and confirm that the information provided is accurate. 
                      I understand that my data will be used for donation purposes only.
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
                    disabled={actionLoading || !otpSent}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      <>
                        <Heart className="w-4 h-4 mr-2" />
                        Complete Registration
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        )}

        {registrationStep === 'success' && (
          <Card>
            <div className="p-6 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Complete!</h2>
              <p className="text-gray-600 mb-6">Thank you for registering to donate blood</p>

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
                          {donorData.bloodType || 'N/A'}
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
                <Button
                  onClick={() => {
                    console.log('[View Profile] donorData:', donorData)
                    console.log('[View Profile] donorToken:', donorData?.donorToken)
                    
                    if (donorData?.donorToken) {
                      const profileUrl = `/donor/${donorData.donorToken}`
                      console.log('[View Profile] Navigating to:', profileUrl)
                      router.push(profileUrl)
                    } else {
                      setActionError('Donor ID not found. Please contact support.')
                      setTimeout(() => setActionError(null), 5000)
                    }
                  }}
                  className="w-full bg-red-600 hover:bg-red-700"
                  disabled={!donorData?.donorToken}
                >
                  <Heart className="w-4 h-4 mr-2" />
                  View My Donor Profile
                </Button>

                <Button
                  onClick={() => {
                    // Copy donor token to clipboard
                    if (donorData?.donorToken) {
                      navigator.clipboard.writeText(donorData.donorToken)
                      setActionSuccess('✅ Donor ID copied to clipboard!')
                      setTimeout(() => setActionSuccess(null), 3000)
                    } else {
                      setActionError('Donor ID not available to copy')
                      setTimeout(() => setActionError(null), 5000)
                    }
                  }}
                  variant="outline"
                  className="w-full"
                  disabled={!donorData?.donorToken}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Donor ID
                </Button>
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
