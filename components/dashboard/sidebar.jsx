'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Droplet, LayoutDashboard, Users, Package, AlertCircle, Hospital, BarChart3, Settings, LogOut, Building2, Shield, Crown, MessageSquare, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/auth-provider'

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Donors',
    href: '/dashboard/donors',
    icon: Users,
  },
  {
    label: 'Inventory',
    href: '/dashboard/inventory',
    icon: Package,
  },
  {
    label: 'Expiry Alerts',
    href: '/dashboard/expiry',
    icon: AlertCircle,
  },
  {
    label: 'Hospital Requests',
    href: '/dashboard/requests',
    icon: Hospital,
  },
  {
    label: 'Reports',
    href: '/dashboard/reports',
    icon: BarChart3,
  },
]

// Donation Drives - for org_admin and super_admin
const drivesNavItem = {
  label: 'Donation Drives',
  href: '/dashboard/drives',
  icon: Building2,
}

// Analytics - for org_admin and super_admin
const analyticsNavItem = {
  label: 'Analytics',
  href: '/dashboard/analytics',
  icon: BarChart3,
}

// Team management - for org_admin only
const teamNavItem = {
  label: 'Team',
  href: '/dashboard/settings/team',
  icon: Users,
}

// Join requests - for org_admin only
const joinRequestsNavItem = {
  label: 'Join Requests',
  href: '/dashboard/settings/team/requests',
  icon: ClipboardList,
}

// SMS Metrics - for org_admin and super_admin
const smsMetricsNavItem = {
  label: 'SMS Metrics',
  href: '/dashboard/sms-metrics',
  icon: MessageSquare,
}

// Organizations list - for super_admin only
const organizationsNavItem = {
  label: 'Organizations',
  href: '/dashboard/organizations',
  icon: Building2,
}

// Super admin only navigation
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

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout, isLoading: authLoading } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  // Show loading skeleton while auth is initializing
  if (authLoading) {
    return (
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        {/* Logo */}
        <div className="flex items-center gap-2 border-b border-border px-6 py-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
            <Droplet className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">iBlood</span>
        </div>
        
        {/* Loading skeleton */}
        <div className="flex-1 px-4 py-6 space-y-4">
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </aside>
    )
  }

  const isSuperAdmin = user?.role === 'super_admin'
  const isOrgAdmin = user?.role === 'org_admin'
  const isPending = user?.accountStatus === 'pending_approval' || user?.role === 'pending'
  const userOrg = user?.organizationName

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-border px-6 py-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
          <Droplet className="w-6 h-6 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold text-foreground">iBlood</span>
      </div>

      {/* Organization Badge - For org members */}
      {!isSuperAdmin && userOrg && (
        <div className="border-b border-border px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">Organization</span>
          </div>
          <p className="text-sm font-medium text-blue-900 truncate" title={userOrg}>
            {userOrg}
          </p>
          <p className="text-xs text-blue-700 mt-1 capitalize">
            {user?.role?.replace('_', ' ')}
          </p>
        </div>
      )}

      {/* Super Admin Section - Only visible to super_admin */}
      {isSuperAdmin && (
        <div className="border-b border-border px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">Admin</span>
          </div>
          {superAdminNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname?.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-purple-900 hover:bg-purple-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <div>
                  <div>{item.label}</div>
                  <div className="text-xs opacity-75">{item.description}</div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
        <div className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-3 px-4">
          Main Menu
        </div>

        {/* For pending users, ONLY show Dashboard */}
        {isPending ? (
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              pathname === '/dashboard'
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground/70 hover:bg-secondary/20 hover:text-foreground'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
        ) : (
          <>
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground/70 hover:bg-secondary/20 hover:text-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              )
            })}

            {/* Divider */}
            <div className="my-4 border-t border-border"></div>

        {/* Donation Drives - org_admin and super_admin */}
        {(isOrgAdmin || isSuperAdmin) && (
          <Link
            href={drivesNavItem.href}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              pathname === drivesNavItem.href
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground/70 hover:bg-secondary/20 hover:text-foreground'
            }`}
          >
            <drivesNavItem.icon className="w-5 h-5" />
            {drivesNavItem.label}
          </Link>
        )}

        {/* Analytics - org_admin and super_admin */}
        {(isOrgAdmin || isSuperAdmin) && (
          <Link
            href={analyticsNavItem.href}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              pathname === analyticsNavItem.href
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground/70 hover:bg-secondary/20 hover:text-foreground'
            }`}
          >
            <analyticsNavItem.icon className="w-5 h-5" />
            {analyticsNavItem.label}
          </Link>
        )}

        {/* Team Management - org_admin only */}
        {isOrgAdmin && (
          <>
            <Link
              href={teamNavItem.href}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                pathname === teamNavItem.href
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground/70 hover:bg-secondary/20 hover:text-foreground'
              }`}
            >
              <teamNavItem.icon className="w-5 h-5" />
              {teamNavItem.label}
            </Link>
            <Link
              href={joinRequestsNavItem.href}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                pathname === joinRequestsNavItem.href
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground/70 hover:bg-secondary/20 hover:text-foreground'
              }`}
            >
              <joinRequestsNavItem.icon className="w-5 h-5" />
              {joinRequestsNavItem.label}
            </Link>
          </>
        )}

        {/* SMS Metrics - org_admin and super_admin */}
        {(isOrgAdmin || isSuperAdmin) && (
          <Link
            href={smsMetricsNavItem.href}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              pathname === smsMetricsNavItem.href
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground/70 hover:bg-secondary/20 hover:text-foreground'
            }`}
          >
            <smsMetricsNavItem.icon className="w-5 h-5" />
            {smsMetricsNavItem.label}
          </Link>
        )}

        {/* Organizations List - super_admin only */}
        {isSuperAdmin && (
          <Link
            href={organizationsNavItem.href}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              pathname === organizationsNavItem.href
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground/70 hover:bg-secondary/20 hover:text-foreground'
            }`}
          >
            <organizationsNavItem.icon className="w-5 h-5" />
            {organizationsNavItem.label}
          </Link>
        )}
          </>
        )}
      </nav>

      {/* Bottom Actions */}
      <div className="border-t border-border space-y-2 px-4 py-4">
        {/* Settings - Hidden for pending users */}
        {!isPending && (
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors text-foreground/70 hover:bg-secondary/20 hover:text-foreground"
          >
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-foreground/70 hover:bg-red-50/10 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
