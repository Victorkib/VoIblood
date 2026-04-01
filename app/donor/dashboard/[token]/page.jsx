'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Heart,
  Droplet,
  Calendar,
  Award,
  TrendingUp,
  Users,
  Share2,
  Download,
  Bell,
  CheckCircle,
  Clock,
  MapPin,
  Loader2,
} from 'lucide-react'

export default function DonorDashboardPage() {
  const params = useParams()
  const [donor, setDonor] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (params.token) {
      fetchDonorDashboard(params.token)
    }
  }, [params.token])

  const fetchDonorDashboard = async (token) => {
    try {
      setLoading(true)
      setError(null)

      // In production, fetch from API
      // For now, use mock data
      setDonor({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1-555-1234',
        bloodType: 'O+',
        totalDonations: 5,
        lastDonationDate: '2026-02-15',
        nextEligibleDate: '2026-04-12',
        registeredVia: 'drive',
        isActive: true,
      })

      setStats({
        livesImpacted: 15, // 3 lives per donation
        daysSinceLastDonation: 42,
        totalVolumeDonated: 2250, // 450ml per donation
        rank: 'Gold Donor',
        nextMilestone: {
          name: 'Platinum Donor',
          donationsNeeded: 5,
        },
      })
    } catch (err) {
      setError('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !donor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white">
        <Card className="max-w-md p-6">
          <div className="text-center">
            <p className="text-red-600">{error || 'Dashboard not found'}</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Donor Dashboard</h1>
            <p className="text-gray-600 mt-1">Track your donations and impact</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download Card
            </Button>
          </div>
        </div>

        {/* Profile Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <Heart className="w-8 h-8 text-red-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{donor.firstName} {donor.lastName}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Droplet className="w-4 h-4 text-red-600" />
                    <Badge className="bg-red-100 text-red-800">{donor.bloodType}</Badge>
                    <Badge className="bg-green-100 text-green-800">Active Donor</Badge>
                  </div>
                </div>
              </div>
              <Button className="bg-red-600 hover:bg-red-700">
                <Share2 className="w-4 h-4 mr-2" />
                Share Profile
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Impact Stats */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lives Impacted</CardTitle>
              <Heart className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats?.livesImpacted || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Each donation saves 3 lives</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
              <Droplet className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{donor.totalDonations || 0}</div>
              <p className="text-xs text-gray-500 mt-1">{stats?.totalVolumeDonated || 0}ml donated</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Days Since Last</CardTitle>
              <Clock className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats?.daysSinceLastDonation || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Eligible in {donor.nextEligibleDate ? Math.max(0, Math.ceil((new Date(donor.nextEligibleDate) - new Date()) / (1000 * 60 * 60 * 24))) : 0} days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Donor Rank</CardTitle>
              <Award className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{stats?.rank || 'Bronze'}</div>
              <p className="text-xs text-gray-500 mt-1">{stats?.nextMilestone?.donationsNeeded || 5} more to {stats?.nextMilestone?.name || 'Gold'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Next Donation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Next Eligible Donation
            </CardTitle>
            <CardDescription>Mark your calendar for your next donation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {donor.nextEligibleDate ? new Date(donor.nextEligibleDate).toLocaleDateString() : 'Calculate based on last donation'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {donor.lastDonationDate ? `Last donated on ${new Date(donor.lastDonationDate).toLocaleDateString()}` : 'No previous donations'}
                </p>
              </div>
              <Button className="bg-red-600 hover:bg-red-700">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Appointment
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Donation History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Donation History
            </CardTitle>
            <CardDescription>Your journey of saving lives</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((donation, index) => (
                <div key={donation} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Donation #{donation}</p>
                    <p className="text-sm text-gray-500">450ml • O+ Blood</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(Date.now() - (index * 60 * 24 * 60 * 60 * 1000)).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">City Hospital</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Drives */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Upcoming Donation Drives
            </CardTitle>
            <CardDescription>Find drives near you</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2].map((drive) => (
                <div key={drive} className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Community Blood Drive #{drive}</p>
                    <p className="text-sm text-gray-500">City Hall • 9:00 AM - 5:00 PM</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Register
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-600" />
              Achievements & Badges
            </CardTitle>
            <CardDescription>Your milestones and accomplishments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {[
                { name: 'First Donation', icon: '🎉', earned: true },
                { name: '5 Donations', icon: '⭐', earned: true },
                { name: '10 Donations', icon: '🌟', earned: false },
                { name: '25 Donations', icon: '💫', earned: false },
                { name: '50 Donations', icon: '🏆', earned: false },
                { name: '100 Donations', icon: '👑', earned: false },
              ].map((badge) => (
                <div
                  key={badge.name}
                  className={`p-4 rounded-lg text-center ${
                    badge.earned ? 'bg-yellow-50 border-2 border-yellow-200' : 'bg-gray-100 opacity-50'
                  }`}
                >
                  <div className="text-3xl mb-2">{badge.icon}</div>
                  <p className="text-xs font-medium text-gray-700">{badge.name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
