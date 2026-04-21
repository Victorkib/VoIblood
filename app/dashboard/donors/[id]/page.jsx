'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  User,
  Droplet,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Heart,
  CheckCircle,
  Loader2,
  Clock,
  Award,
  FileText,
  Activity,
} from 'lucide-react'

const statusConfig = {
  registered: { label: 'Registered', color: 'bg-gray-100 text-gray-800', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  checked_in: { label: 'Checked In', color: 'bg-purple-100 text-purple-800', icon: User },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: FileText },
  no_show: { label: 'No Show', color: 'bg-orange-100 text-orange-800', icon: MapPin },
}

export default function DonorDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const { user, isAuthenticated } = useAuth()
  const [donor, setDonor] = useState(null)
  const [drive, setDrive] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/dashboard/donors/' + params.id)
      return
    }
    fetchDonor()
  }, [isAuthenticated, params.id])

  const fetchDonor = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/donors/${params.id}`)
      const data = await res.json()

      if (res.ok) {
        setDonor(data.data)

        // Fetch associated drive if exists
        if (data.data.driveId) {
          fetchDrive(data.data.driveId)
        }
      } else {
        setError(data.error || 'Failed to load donor details')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const fetchDrive = async (driveId) => {
    try {
      const res = await fetch(`/api/admin/drives/${driveId}`)
      if (res.ok) {
        const data = await res.json()
        setDrive(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch drive:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading donor details...</p>
        </div>
      </div>
    )
  }

  if (error || !donor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md p-6">
          <div className="text-center">
            <p className="text-red-600">{error || 'Donor not found'}</p>
            <Button onClick={() => router.push('/dashboard/donors')} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Donors
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const status = statusConfig[donor.status] || statusConfig.registered
  const StatusIcon = status.icon
  const age = donor.dateOfBirth
    ? new Date().getFullYear() - new Date(donor.dateOfBirth).getFullYear()
    : null

  // Calculate next eligible date as backup (Option 2: Backup Solution)
  const calculateNextEligible = (lastDonationDate) => {
    if (!lastDonationDate) return 'N/A'
    const nextEligible = new Date(lastDonationDate)
    nextEligible.setDate(nextEligible.getDate() + 56)
    return nextEligible.toLocaleDateString()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/dashboard/donors')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Donors
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{donor.fullName}</h1>
            <p className="mt-1 text-foreground/60">Donor Details & History</p>
          </div>
        </div>
        <Badge className={`${status.color} text-sm px-3 py-1`}>
          <StatusIcon className="w-4 h-4 mr-1" />
          {status.label}
        </Badge>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-foreground/60">Full Name</p>
                <p className="font-medium">{donor.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-foreground/60">Email</p>
                <p className="font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {donor.email}
                </p>
              </div>
              <div>
                <p className="text-sm text-foreground/60">Phone</p>
                <p className="font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {donor.phone}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-foreground/60">Blood Type</p>
                <Badge className="bg-red-100 text-red-800">
                  <Droplet className="w-3 h-3 mr-1" />
                  {donor.bloodType}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-foreground/60">Date of Birth</p>
                <p className="font-medium">
                  {new Date(donor.dateOfBirth).toLocaleDateString()} ({age} years)
                </p>
              </div>
              <div>
                <p className="text-sm text-foreground/60">Gender</p>
                <p className="font-medium capitalize">{donor.gender}</p>
              </div>
              {donor.weight && (
                <div>
                  <p className="text-sm text-foreground/60">Weight</p>
                  <p className="font-medium">{donor.weight} kg</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Donation Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-600" />
              Total Donations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{donor.totalDonations || 0}</div>
            <p className="text-xs text-foreground/60 mt-1">Lives saved: {(donor.totalDonations || 0) * 3}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Last Donation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {donor.lastDonationDate ? new Date(donor.lastDonationDate).toLocaleDateString() : 'Never'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="w-4 h-4 text-green-600" />
              Next Eligible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {donor.nextEligibleDate ? new Date(donor.nextEligibleDate).toLocaleDateString() : calculateNextEligible(donor.lastDonationDate)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              Registered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {new Date(donor.createdAt).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drive Association */}
      {drive && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Associated Drive
            </CardTitle>
            <CardDescription>Donation drive this donor registered for</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">{drive.name}</p>
                <p className="text-sm text-foreground/60">
                  {drive.location} • {new Date(drive.date).toLocaleDateString()}
                </p>
              </div>
              <Button variant="outline" onClick={() => router.push(`/dashboard/drives/${drive.id}`)}>
                View Drive
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medical Information */}
      {(donor.medicalConditions || donor.medications || donor.hasDonatedBefore) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-600" />
              Medical Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-foreground/60 mb-1">Previously Donated</p>
                <Badge className={donor.hasDonatedBefore ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {donor.hasDonatedBefore ? 'Yes' : 'No'}
                </Badge>
              </div>
              {donor.medicalConditions && (
                <div>
                  <p className="text-sm text-foreground/60 mb-1">Medical Conditions</p>
                  <p className="text-sm">{donor.medicalConditions || 'None reported'}</p>
                </div>
              )}
              {donor.medications && (
                <div>
                  <p className="text-sm text-foreground/60 mb-1">Current Medications</p>
                  <p className="text-sm">{donor.medications || 'None reported'}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Donation History */}
      {donor.donationHistory && donor.donationHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Donation History
            </CardTitle>
            <CardDescription>Complete donation history for this donor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {donor.donationHistory.map((donation, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-secondary/10 rounded-lg">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Droplet className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Donation #{index + 1}</p>
                    <p className="text-sm text-foreground/60">
                      {donation.driveName || 'Unknown Drive'} • {donation.volume}ml
                    </p>
                    {donation.unitId && (
                      <p className="text-xs text-foreground/40 font-mono">Unit: {donation.unitId}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {new Date(donation.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {donor.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Admin Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{donor.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
