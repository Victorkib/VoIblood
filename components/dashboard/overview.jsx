'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Package, Users, AlertCircle, TrendingUp } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'

export function DashboardOverview() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user, isLoading: authLoading } = useAuth()

  useEffect(() => {
    // Don't fetch data while auth is still loading
    if (authLoading) {
      return
    }

    const fetchDashboardStats = async () => {
      try {
        console.log('[Dashboard] Fetching stats for user:', user?.email, 'org:', user?.organizationId)
        
        // Handle super admin viewing organization context
        let organizationId = user?.organizationId
        
        // For super admins, check if they're viewing a specific organization
        if (user?.role === 'super_admin') {
          // Try to get viewing context from session or use first available org
          try {
            const sessionResponse = await fetch('/api/auth/session')
            if (sessionResponse.ok) {
              const sessionData = await sessionResponse.json()
              // Check if there's a viewing context in the session
              if (sessionData.user?.viewingOrganizationId) {
                organizationId = sessionData.user.viewingOrganizationId
              }
            }
          } catch (sessionError) {
            console.log('[Dashboard] Could not check session context:', sessionError.message)
          }
          
          // If still no organization ID, get first available organization
          if (!organizationId) {
            try {
              const orgsResponse = await fetch('/api/admin/organizations')
              if (orgsResponse.ok) {
                const orgsData = await orgsResponse.json()
                if (orgsData.data && orgsData.data.length > 0) {
                  organizationId = orgsData.data[0].id
                }
              }
            } catch (orgsError) {
              console.log('[Dashboard] Could not fetch organizations:', orgsError.message)
            }
          }
        }
        
        if (!user) {
          setError('User not authenticated')
          setLoading(false)
          return
        }

        if (!organizationId) {
          if (user?.role === 'super_admin') {
            setError('No organization selected. Please select an organization to view.')
          } else {
            setError('No organization assigned')
          }
          setLoading(false)
          return
        }

        console.log('[Dashboard] Fetching stats for org:', organizationId)
        
        const response = await fetch(`/api/dashboard/stats?organizationId=${organizationId}`)
        console.log('[Dashboard] Stats response:', response.status)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch dashboard stats')
        }

        const data = await response.json()
        console.log('[Dashboard] Stats loaded:', data.data)
        setStats(data.data)
        setError(null)
      } catch (err) {
        console.error('[Dashboard] Error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardStats()
  }, [user, authLoading])

  // Show loading while auth is initializing or data is loading
  if (authLoading || loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your dashboard...</p>
            <p className="text-sm text-gray-500 mt-2">Fetching organization data</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6 border-red-500/50 bg-red-500/5">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-600 mt-1" />
          <div className="flex-1">
            <p className="text-red-600 font-semibold">Error Loading Dashboard</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            {user?.role === 'org_admin' && !user?.organizationId && (
              <p className="text-red-600 text-sm mt-2">
                Please contact your administrator to be assigned to an organization.
              </p>
            )}
          </div>
        </div>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card className="p-6">
        <p className="text-foreground/60">No data available</p>
      </Card>
    )
  }

  const statCards = [
    {
      label: 'Total Blood Units',
      value: stats.inventory.totalUnits.toLocaleString(),
      icon: Package,
      color: 'text-secondary',
    },
    {
      label: 'Active Donors',
      value: stats.donors.available.toLocaleString(),
      icon: Users,
      color: 'text-accent',
    },
    {
      label: 'Expiring Soon',
      value: stats.inventory.alerts.expiring.toLocaleString(),
      icon: AlertCircle,
      color: 'text-primary',
    },
    {
      label: 'Pending Requests',
      value: stats.requests.pending.toLocaleString(),
      icon: TrendingUp,
      color: 'text-accent',
    },
  ]

  const bloodTypeData = Object.entries(stats.inventory.byBloodType || {}).map(([type, count]) => ({
    type,
    units: count,
  }))

  const maxUnits = Math.max(...bloodTypeData.map((item) => item.units), 1)

  const formatTime = (date) => {
    const now = new Date()
    const diffMs = now - new Date(date)
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins} minutes ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    return `${diffDays} days ago`
  }

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <Card key={idx} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground/60">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg bg-secondary/10 ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blood Type Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Blood Type Distribution</h3>
          <div className="space-y-4">
            {bloodTypeData.length > 0 ? (
              bloodTypeData.map((item) => {
                const percentage = maxUnits > 0 ? (item.units / maxUnits) * 100 : 0
                return (
                  <div key={item.type}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">{item.type}</span>
                      <span className="text-sm text-foreground/60">{item.units} units</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary/20 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-foreground/60">No blood units in stock</p>
            )}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {stats.activities.recentRequests && stats.activities.recentRequests.length > 0 ? (
              stats.activities.recentRequests.map((activity, idx) => (
                <div key={idx} className="flex gap-4 pb-4 last:pb-0 border-b last:border-0 border-border">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{activity.requestId}</p>
                    <p className="text-xs text-foreground/60">{activity.patientName} ({activity.urgency})</p>
                    <p className="text-xs text-foreground/40 mt-1">{formatTime(activity.lastActivityDate)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-foreground/60">No recent activities</p>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Register Donor', href: '/dashboard/donors/new' },
            { label: 'Record Collection', href: '/dashboard/inventory/add' },
            { label: 'Process Request', href: '/dashboard/requests' },
            { label: 'View Reports', href: '/dashboard/reports' },
          ].map((action, idx) => (
            <Link
              key={idx}
              href={action.href}
              className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition text-center"
            >
              <p className="text-sm font-medium text-foreground">{action.label}</p>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  )
}
