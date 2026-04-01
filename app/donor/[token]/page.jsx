'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  User,
  Droplet,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Heart,
  CheckCircle,
  Loader2,
  Share2,
  Award,
  Clock,
} from 'lucide-react'

export default function DonorProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [donor, setDonor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (params.token) {
      fetchDonorProfile(params.token)
    }
  }, [params.token])

  const fetchDonorProfile = async (token) => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/donors/profile/${token}`)
      const data = await res.json()

      if (res.ok) {
        setDonor(data.data)
      } else {
        setError(data.error || 'Profile not found')
      }
    } catch (err) {
      console.error('Failed to fetch donor profile:', err)
      setError('Failed to load profile. Please check your donor ID.')
    } finally {
      setLoading(false)
    }
  }

  const handleShareProfile = async () => {
    const shareData = {
      title: 'My Donor Profile',
      text: `I'm registered as a blood donor! My blood type is ${donor?.bloodType}.`,
      url: window.location.href,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        console.log('Share cancelled')
      }
    } else {
      // Fallback: copy link to clipboard
      await navigator.clipboard.writeText(window.location.href)
      alert('Profile link copied to clipboard!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (error || !donor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white">
        <Card className="max-w-md p-6">
          <div className="text-center">
            <Heart className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
            <p className="text-gray-600 mb-4">{error || 'This donor profile could not be found'}</p>
            <Button onClick={() => router.push('/')}>
              Go to Homepage
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Calculate age
  const age = donor.dateOfBirth 
    ? new Date().getFullYear() - new Date(donor.dateOfBirth).getFullYear()
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Heart className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Donor Profile</h1>
          <p className="text-gray-600">Thank you for being a hero!</p>
          {donor.status === 'registered' && (
            <Badge className="mt-2 bg-blue-100 text-blue-800">
              Registered Donor
            </Badge>
          )}
        </div>

        {/* Profile Card */}
        <Card className="mb-8">
          <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{donor.fullName}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Droplet className="w-4 h-4 text-red-600" />
                  <Badge className="bg-red-100 text-red-800 text-sm">{donor.bloodType}</Badge>
                  {donor.isVerified && (
                    <Badge className="bg-green-100 text-green-800 text-sm">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-gray-900">{donor.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="text-gray-900">{donor.phone}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="text-gray-900">
                    {donor.dateOfBirth ? new Date(donor.dateOfBirth).toLocaleDateString() : 'N/A'}
                    {age && <span className="text-sm text-gray-500 ml-2">({age} years old)</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-red-600 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Gender</p>
                  <p className="text-gray-900 capitalize">{donor.gender || 'N/A'}</p>
                </div>
              </div>
              {donor.weight && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Weight</p>
                    <p className="text-gray-900">{donor.weight} kg</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Heart className="w-5 h-5 text-red-600 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Total Donations</p>
                  <p className="text-gray-900 font-bold">{donor.totalDonations || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Donation Info */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Last Donation
              </h3>
              {donor.lastDonationDate ? (
                <div>
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    {new Date(donor.lastDonationDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500">Thank you for your donation!</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-gray-500">
                  <Clock className="w-8 h-8" />
                  <div>
                    <p className="font-medium">No donations yet</p>
                    <p className="text-sm">Your first donation will be recorded after you donate</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Next Eligible Date
              </h3>
              {donor.nextEligibleDate ? (
                <div>
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    {new Date(donor.nextEligibleDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500">You can donate again on this date</p>
                </div>
              ) : (
                <div className="text-gray-500">
                  <p className="font-medium">Calculate based on last donation</p>
                  <p className="text-sm">8 weeks between whole blood donations</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Medical Information */}
        {(donor.medicalConditions || donor.medications) && (
          <Card className="mb-8">
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-600" />
                Medical Information
              </h3>
              {donor.medicalConditions && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-1">Medical Conditions</p>
                  <p className="text-gray-900">{donor.medicalConditions}</p>
                </div>
              )}
              {donor.medications && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Current Medications</p>
                  <p className="text-gray-900">{donor.medications}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="grid md:grid-cols-2 gap-4">
          <Button onClick={handleShareProfile} className="bg-red-600 hover:bg-red-700">
            <Share2 className="w-4 h-4 mr-2" />
            Share Profile
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.open('https://www.redcrossblood.org/donate-blood/blood-donation-centers.html', '_blank')}
          >
            <MapPin className="w-4 h-4 mr-2" />
            Find Donation Centers
          </Button>
        </div>

        {/* Important Info */}
        <Card className="mt-8 bg-yellow-50 border-yellow-200">
          <div className="p-6">
            <h3 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 text-yellow-600" />
              Important Reminders
            </h3>
            <ul className="space-y-2 text-sm text-yellow-800">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5" />
                <span>Stay hydrated before and after donation</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5" />
                <span>Eat a healthy meal before donating</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5" />
                <span>Avoid strenuous exercise for 24 hours after donation</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5" />
                <span>Keep this donor ID safe for future donations</span>
              </li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  )
}
