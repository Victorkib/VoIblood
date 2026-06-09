'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle,
  Heart,
  Lightbulb,
  ArrowRight,
  Building2,
  Calendar,
} from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { OrgDashboardHeader } from '@/components/dashboard/org-dashboard-header'
import { getOrgExperience, buildStatCards } from '@/lib/dashboard/org-experience'

const colorStyles = {
  orange: { border: 'border-l-orange-500', bg: 'bg-orange-50', text: 'text-orange-600' },
  green: { border: 'border-l-green-500', bg: 'bg-green-50', text: 'text-green-600' },
  red: { border: 'border-l-red-500', bg: 'bg-red-50', text: 'text-red-600' },
  blue: { border: 'border-l-blue-500', bg: 'bg-blue-50', text: 'text-blue-600' },
  violet: { border: 'border-l-violet-500', bg: 'bg-violet-50', text: 'text-violet-600' },
  emerald: { border: 'border-l-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  teal: { border: 'border-l-teal-500', bg: 'bg-teal-50', text: 'text-teal-600' },
  rose: { border: 'border-l-rose-500', bg: 'bg-rose-50', text: 'text-rose-600' },
  purple: { border: 'border-l-purple-500', bg: 'bg-purple-50', text: 'text-purple-600' },
}

const bloodTypeColors = {
  'O+': 'bg-red-500',
  'O-': 'bg-red-700',
  'A+': 'bg-blue-500',
  'A-': 'bg-blue-700',
  'B+': 'bg-green-500',
  'B-': 'bg-green-700',
  'AB+': 'bg-purple-500',
  'AB-': 'bg-purple-700',
}

export function DashboardOverview() {
  const router = useRouter()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user, isLoading: authLoading } = useAuth()

  useEffect(() => {
    if (authLoading) return

    const fetchDashboardStats = async () => {
      try {
        let organizationId = user?.organizationId

        if (user?.role === 'super_admin') {
          try {
            const sessionResponse = await fetch('/api/auth/session')
            if (sessionResponse.ok) {
              const sessionData = await sessionResponse.json()
              if (sessionData.user?.viewingOrganizationId) {
                organizationId = sessionData.user.viewingOrganizationId
              }
            }
          } catch {
            /* ignore */
          }
          if (!organizationId) {
            const orgsResponse = await fetch('/api/admin/organizations')
            if (orgsResponse.ok) {
              const orgsData = await orgsResponse.json()
              if (orgsData.data?.length > 0) {
                organizationId = orgsData.data[0].id
              }
            }
          }
        }

        if (!user) {
          setError('User not authenticated')
          setLoading(false)
          return
        }

        if (!organizationId) {
          setError(
            user?.role === 'super_admin'
              ? 'Select an organization via Platform Admin → Enter organization to view its dashboard.'
              : 'No organization assigned'
          )
          setLoading(false)
          return
        }

        const response = await fetch(`/api/dashboard/stats?organizationId=${organizationId}`)
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch dashboard stats')
        }

        const data = await response.json()
        setStats(data.data)
        setError(null)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (user?.email && (user?.organizationId || user?.role === 'super_admin')) {
      fetchDashboardStats()
    }
  }, [user?.email, user?.organizationId, user?.role, authLoading])

  const orgType = stats?.organization?.type || user?.organizationType || 'blood_bank'
  const experience = getOrgExperience(orgType, {
    rewardsPartnerActive: user?.rewardsPartnerActive,
    isOrgAdmin: user?.role === 'org_admin',
    isSuperAdmin: user?.role === 'super_admin',
  })

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="h-36 rounded-2xl bg-muted animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-28 animate-pulse bg-muted/50" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <OrgDashboardHeader />
        <Card className="p-6 border-red-200 bg-red-50/50">
          <div className="flex gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
            <div>
              <p className="font-semibold text-red-900">Could not load dashboard</p>
              <p className="text-sm text-red-800 mt-1">{error}</p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (!stats) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">No data available</p>
      </Card>
    )
  }

  const statCards = buildStatCards(stats, experience)
  const bloodTypeData = Object.entries(stats.inventory?.byBloodType || {})
    .map(([type, count]) => ({ type, units: count }))
    .sort((a, b) => b.units - a.units)
  const maxUnits = Math.max(...bloodTypeData.map((i) => i.units), 1)

  const formatTime = (date) => {
    if (!date) return ''
    const diffMs = Date.now() - new Date(date)
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <div className="space-y-8">
      <OrgDashboardHeader statsOrganization={stats.organization} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon
          const style = colorStyles[stat.color] || colorStyles.blue
          return (
            <Card
              key={idx}
              className={`p-5 border-l-4 ${style.border} hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold mt-1 tabular-nums">{stat.value}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${style.bg}`}>
                  <Icon className={`w-5 h-5 ${style.text}`} />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {experience.showBloodTypeChart && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-600" />
                Stock by blood type
              </h3>
              <span className="text-xs text-muted-foreground">
                {stats.inventory?.totalUnits ?? 0} units
              </span>
            </div>
            {bloodTypeData.length > 0 ? (
              <div className="space-y-3">
                {bloodTypeData.map((item) => {
                  const pct = (item.units / maxUnits) * 100
                  return (
                    <div key={item.type}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold">{item.type}</span>
                        <span className="text-muted-foreground">{item.units} units</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${bloodTypeColors[item.type] || 'bg-gray-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No units in stock yet — add inventory when collection is recorded.
              </p>
            )}
          </Card>
        )}

        <Card className="p-6">
          <h3 className="font-semibold mb-5">{experience.activityTitle}</h3>
          {experience.showRecentRequests ? (
            <div className="space-y-3">
              {stats.activities?.recentRequests?.length > 0 ? (
                stats.activities.recentRequests.map((activity, idx) => (
                  <div
                    key={idx}
                    className="flex gap-3 pb-3 border-b last:border-0 last:pb-0"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{activity.requestId}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.patientName} · {activity.urgency}
                      </p>
                      <Badge variant="outline" className="mt-1 text-[10px] capitalize">
                        {activity.status}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatTime(activity.lastActivityDate)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recent request activity</p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => router.push('/dashboard/requests')}
              >
                View all requests
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.drives?.upcoming?.length > 0 ? (
                stats.drives.upcoming.map((drive, idx) => (
                  <div
                    key={idx}
                    className="flex gap-3 p-3 rounded-lg border bg-muted/30"
                  >
                    <Building2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">{drive.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(drive.date).toLocaleDateString()}
                        {drive.location ? ` · ${drive.location}` : ''}
                      </p>
                      <Badge variant="secondary" className="mt-1 text-[10px] capitalize">
                        {drive.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming drives scheduled</p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => router.push('/dashboard/drives')}
              >
                Manage drives
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Quick actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {experience.quickActions.map((action, idx) => {
            const Icon = action.icon
            const style = colorStyles[action.color] || colorStyles.blue
            return (
              <Button
                key={idx}
                variant="outline"
                className="h-auto flex flex-col items-center justify-center p-5 gap-2 hover:border-primary/40"
                onClick={() => router.push(action.href)}
              >
                <div className={`p-2 rounded-lg ${style.bg}`}>
                  <Icon className={`w-5 h-5 ${style.text}`} />
                </div>
                <span className="text-sm font-medium text-center">{action.label}</span>
              </Button>
            )
          })}
        </div>
      </Card>

      {experience.tips?.length > 0 && (
        <Card className="p-5 border-dashed bg-muted/20">
          <div className="flex gap-3">
            <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-2">Tips for {experience.typeLabel} teams</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                {experience.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
