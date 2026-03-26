'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Droplet, LayoutDashboard, Users, Package, AlertCircle, Hospital, BarChart3, Settings, LogOut } from 'lucide-react'
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

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-border px-6 py-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
          <Droplet className="w-6 h-6 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold text-foreground">iBlood</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4 py-6">
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
      </nav>

      {/* Bottom Actions */}
      <div className="border-t border-border space-y-2 px-4 py-4">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors text-foreground/70 hover:bg-secondary/20 hover:text-foreground"
        >
          <Settings className="w-5 h-5" />
          Settings
        </Link>
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
