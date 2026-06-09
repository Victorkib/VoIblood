'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Droplet,
  Settings,
  LogOut,
  Building2,
  Shield,
  Crown,
  MessageSquare,
  ClipboardList,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/auth/auth-provider'
import { getOrgExperience, ORG_TYPE_LABELS } from '@/lib/dashboard/org-experience'

const teamNavItem = {
  label: 'Team',
  href: '/dashboard/settings/team',
  icon: Users,
}

const joinRequestsNavItem = {
  label: 'Join Requests',
  href: '/dashboard/settings/team/requests',
  icon: ClipboardList,
}

const smsMetricsNavItem = {
  label: 'SMS Metrics',
  href: '/dashboard/sms-metrics',
  icon: MessageSquare,
}

const superAdminNavItems = [
  {
    label: 'Platform Admin',
    href: '/dashboard/super-admin',
    icon: Shield,
    description: 'Manage all organizations & users',
  },
  {
    label: 'Org Requests',
    href: '/dashboard/super-admin/org-requests',
    icon: ClipboardList,
    description: 'Review org creation requests',
  },
]

const organizationsNavItem = {
  label: 'Organizations',
  href: '/dashboard/super-admin/organizations',
  icon: Building2,
}

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout, isLoading: authLoading } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  if (authLoading) {
    return (
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-6 py-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
            <Droplet className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">iBlood</span>
        </div>
        <div className="flex-1 px-4 py-6 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </aside>
    )
  }

  const isSuperAdmin = user?.role === 'super_admin'
  const isOrgAdmin = user?.role === 'org_admin'
  const isPending = user?.accountStatus === 'pending_approval' || user?.role === 'pending'
  const userOrg = user?.organizationName
  const orgType = user?.organizationType || 'blood_bank'

  const experience = getOrgExperience(orgType, {
    rewardsPartnerActive: user?.rewardsPartnerActive,
    isOrgAdmin,
    isSuperAdmin,
  })

  const accentBorder = {
    rose: 'from-rose-50 to-orange-50 border-rose-100',
    blue: 'from-blue-50 to-indigo-50 border-blue-100',
    violet: 'from-violet-50 to-purple-50 border-violet-100',
    emerald: 'from-emerald-50 to-teal-50 border-emerald-100',
  }

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-6 py-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
          <Droplet className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <span className="text-lg font-bold text-foreground">iBlood</span>
          <p className="text-[10px] text-muted-foreground leading-tight">Kenya</p>
        </div>
      </div>

      {!isSuperAdmin && userOrg && (
        <div
          className={`border-b px-4 py-3 bg-gradient-to-r ${accentBorder[experience.accent] || accentBorder.rose}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-foreground/70" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/60">
              {ORG_TYPE_LABELS[orgType] || 'Organization'}
            </span>
          </div>
          <p className="text-sm font-semibold text-foreground truncate" title={userOrg}>
            {userOrg}
          </p>
          <p className="text-xs text-foreground/60 mt-0.5 capitalize">
            {user?.role?.replace('_', ' ')}
          </p>
        </div>
      )}

      {isSuperAdmin && (
        <div className="border-b border-border px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
              Platform
            </span>
          </div>
          {superAdminNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname?.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors mb-1 ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-purple-900 hover:bg-purple-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <div className="truncate">{item.label}</div>
                  <div className="text-[10px] opacity-75 truncate">{item.description}</div>
                </div>
              </Link>
            )
          })}
          <Link
            href={organizationsNavItem.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              pathname?.startsWith(organizationsNavItem.href)
                ? 'bg-purple-600 text-white'
                : 'text-purple-900 hover:bg-purple-100'
            }`}
          >
            <organizationsNavItem.icon className="w-4 h-4" />
            {organizationsNavItem.label}
          </Link>
        </div>
      )}

      <nav className="flex-1 space-y-1 px-3 py-5 overflow-y-auto">
        <div className="text-[10px] font-semibold text-foreground/45 uppercase tracking-wider mb-2 px-3">
          {isSuperAdmin && user?.organizationId ? 'Org workspace' : 'Main menu'}
        </div>

        {isPending ? (
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
              pathname === '/dashboard'
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground/70 hover:bg-secondary/30'
            }`}
          >
            Main dashboard
          </Link>
        ) : (
          <>
            {experience.navItems.map((item) => {
              const Icon = item.icon
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname?.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground/70 hover:bg-secondary/30 hover:text-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}

            {isOrgAdmin && (
              <>
                <div className="my-3 border-t border-border" />
                <div className="text-[10px] font-semibold text-foreground/45 uppercase tracking-wider mb-2 px-3">
                  Administration
                </div>
                <Link
                  href={teamNavItem.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    pathname === teamNavItem.href
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground/70 hover:bg-secondary/30'
                  }`}
                >
                  <teamNavItem.icon className="w-5 h-5" />
                  {teamNavItem.label}
                </Link>
                <Link
                  href={joinRequestsNavItem.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    pathname === joinRequestsNavItem.href
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground/70 hover:bg-secondary/30'
                  }`}
                >
                  <joinRequestsNavItem.icon className="w-5 h-5" />
                  {joinRequestsNavItem.label}
                </Link>
                <Link
                  href={smsMetricsNavItem.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    pathname === smsMetricsNavItem.href
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground/70 hover:bg-secondary/30'
                  }`}
                >
                  <smsMetricsNavItem.icon className="w-5 h-5" />
                  {smsMetricsNavItem.label}
                </Link>
              </>
            )}

            {isSuperAdmin && !isOrgAdmin && (
              <Link
                href={smsMetricsNavItem.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  pathname === smsMetricsNavItem.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground/70 hover:bg-secondary/30'
                }`}
              >
                <smsMetricsNavItem.icon className="w-5 h-5" />
                {smsMetricsNavItem.label}
              </Link>
            )}
          </>
        )}
      </nav>

      <div className="border-t border-border space-y-1 px-3 py-4">
        {!isPending && (
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/70 hover:bg-secondary/30"
          >
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/70 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
