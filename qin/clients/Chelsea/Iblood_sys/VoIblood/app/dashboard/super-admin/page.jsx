'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Users, Building2, Droplet, FileText, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import Link from 'next/link'

export default function SuperAdminDashboard() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Check if user is authenticated and is super_admin
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/dashboard/super-admin')
      return
    }

    if (user?.role !== 'super_admin') {
      router.push('/dashboard')
      return
    }

    // Fetch platform statistics
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/stats')
        const data = await res.json()
        
        if (res.ok) {
          setStats(data.data)
        } else {
          setError(data.error || 'Failed to fetch statistics')
        }
      } catch (err) {
        setError('Failed to connect to server')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [isAuthenticated, user, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platform Administration</h1>
          <p className="text-gray-600 mt-1">Manage organizations, users, and system settings</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push('/dashboard/super-admin/organizations')}>
            <Building2 className="w-4 h-4 mr-2" />
            Organizations
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/super-admin/users')}>
            <Users className="w-4 h-4 mr-2" />
            Users
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.overview.totalUsers || 0}</div>
            <div className="text-xs text-gray-500 mt-1">
              Active: {stats?.users.active || 0} | Pending: {stats?.users.pending || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.overview.totalOrganizations || 0}</div>
            <div className="text-xs text-gray-500 mt-1">
              Blood Banks: {stats?.organizations.byType.blood_bank || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Donors</CardTitle>
            <Droplet className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.overview.totalDonors || 0}</div>
            <div className="text-xs text-gray-500 mt-1">
              Registered donors
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blood Units</CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.overview.totalBloodUnits || 0}</div>
            <div className="text-xs text-gray-500 mt-1">
              In inventory
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users by Role */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Active Users
            </CardTitle>
            <CardDescription>Users with active accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats?.users.active || 0}
            </div>
            <div className="mt-4 space-y-2">
              {Object.entries(stats?.users.byRole || {}).map(([role, count]) => (
                <div key={role} className="flex justify-between text-sm">
                  <span className="capitalize">{role.replace('_', ' ')}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              Pending Users
            </CardTitle>
            <CardDescription>Awaiting organization assignment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {stats?.users.pending || 0}
            </div>
            <p className="text-sm text-gray-500 mt-4">
              These users need to be assigned to an organization
            </p>
            <Button 
              className="w-full mt-4" 
              variant="outline"
              onClick={() => router.push('/dashboard/super-admin/users?status=pending_approval')}
            >
              Review Pending Users
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Organizations by Type
            </CardTitle>
            <CardDescription>Distribution of organization types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats?.organizations.byType || {}).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="capitalize text-sm text-gray-600">
                    {type.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ 
                          width: `${Math.min(100, (count / (stats?.overview.totalOrganizations || 1)) * 100)}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>Latest users to join the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentActivity.users.slice(0, 5).map((user) => (
                <div key={user.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium">{user.fullName}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded capitalize">
                      {user.role.replace('_', ' ')}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {(!stats?.recentActivity.users || stats.recentActivity.users.length === 0) && (
                <p className="text-gray-500 text-sm">No users yet</p>
              )}
            </div>
            <Button 
              className="w-full mt-4" 
              variant="outline"
              onClick={() => router.push('/dashboard/super-admin/users')}
            >
              View All Users
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Organizations</CardTitle>
            <CardDescription>Latest organizations to join</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentActivity.organizations.slice(0, 5).map((org) => (
                <div key={org.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-sm text-gray-500">{org.city}, {org.country}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded capitalize">
                      {org.type.replace('_', ' ')}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {(!stats?.recentActivity.organizations || stats.recentActivity.organizations.length === 0) && (
                <p className="text-gray-500 text-sm">No organizations yet</p>
              )}
            </div>
            <Button 
              className="w-full mt-4" 
              variant="outline"
              onClick={() => router.push('/dashboard/super-admin/organizations')}
            >
              View All Organizations
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
