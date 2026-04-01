'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  Users,
  Target,
  Activity,
  Download,
  Calendar,
  Droplet,
  Award,
  Loader2,
} from 'lucide-react'

export default function AnalyticsPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dateRange, setDateRange] = useState('30')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/dashboard/analytics')
      return
    }
    if (!user || (user.role !== 'super_admin' && user.role !== 'org_admin')) {
      router.push('/dashboard')
      return
    }
    fetchAnalytics()
  }, [isAuthenticated, user, dateRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/admin/analytics/drives?range=${dateRange}`)
      const data = await res.json()

      if (res.ok) {
        setAnalytics(data.data)
      } else {
        setError(data.error || 'Failed to fetch analytics')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md p-6">
          <div className="text-center">
            <p className="text-red-600">{error || 'Failed to load analytics'}</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="mt-2 text-foreground/60">Track donation drive performance</p>
        </div>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg bg-background text-foreground"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Drives</CardTitle>
            <Calendar className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.overview.totalDrives}</div>
            <p className="text-xs text-gray-500 mt-1">Active donation drives</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{analytics.overview.totalRegistrations}</div>
            <p className="text-xs text-gray-500 mt-1">Donors registered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{analytics.overview.conversionRate}%</div>
            <p className="text-xs text-gray-500 mt-1">Click to registration</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per Drive</CardTitle>
            <Activity className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{analytics.overview.averageRegistrationsPerDrive}</div>
            <p className="text-xs text-gray-500 mt-1">Registrations per drive</p>
          </CardContent>
        </Card>
      </div>

      {/* Registration Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Registration Trends (Last 7 Days)
          </CardTitle>
          <CardDescription>Daily registration count</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-48">
            {analytics.registrationTrends.map((day, index) => {
              const maxCount = Math.max(...analytics.registrationTrends.map(d => d.count))
              const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-green-500 rounded-t transition-all hover:bg-green-600"
                    style={{ height: `${height}%`, minHeight: day.count > 0 ? '8px' : '0' }}
                  />
                  <div className="text-xs text-gray-500 text-center">
                    <div>{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div className="font-medium">{day.count}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Drives */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-600" />
              Top Performing Drives
            </CardTitle>
            <CardDescription>Highest registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topPerformingDrives.slice(0, 5).map((drive, index) => (
                <div key={drive.id} className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center font-bold text-yellow-700">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{drive.name}</p>
                    <p className="text-sm text-gray-500">{new Date(drive.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{drive.registrations}</p>
                    <p className="text-xs text-gray-500">{drive.progress.toFixed(0)}% of target</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplet className="w-5 h-5 text-red-600" />
              Blood Type Distribution
            </CardTitle>
            <CardDescription>Donor blood types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.bloodTypeDistribution.map((type) => (
                <div key={type._id} className="flex items-center gap-4">
                  <Badge className="bg-red-100 text-red-800 w-12 justify-center">{type._id}</Badge>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-red-600 h-3 rounded-full transition-all"
                      style={{
                        width: `${(type.count / analytics.bloodTypeDistribution.reduce((sum, t) => sum + t.count, 0)) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-sm font-medium w-8 text-right">{type.count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Demographics */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Gender Distribution</CardTitle>
            <CardDescription>Donor demographics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.genderDistribution.map((gender) => (
                <div key={gender._id} className="flex items-center gap-4">
                  <p className="font-medium capitalize w-20">{gender._id}</p>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full"
                      style={{
                        width: `${(gender.count / analytics.genderDistribution.reduce((sum, g) => sum + g.count, 0)) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-sm font-medium w-8 text-right">{gender.count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Age Groups</CardTitle>
            <CardDescription>Donor age distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.ageGroups.map((group) => (
                <div key={group._id} className="flex items-center gap-4">
                  <p className="font-medium w-16">{group._id}</p>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-purple-600 h-3 rounded-full"
                      style={{
                        width: `${(group.count / analytics.ageGroups.reduce((sum, g) => sum + g.count, 0)) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-sm font-medium w-8 text-right">{group.count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
