'use client'

import { Menu, Bell, User, Users, Search, Settings, LogOut, Building2, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export function TopNav() {
  const { user, logout, isLoading: authLoading } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
  }

  // Show loading skeleton while auth is initializing
  if (authLoading) {
    return (
      <header className="border-b border-border bg-background sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          {/* Left: Mobile Menu & Search */}
          <div className="flex items-center gap-4 flex-1">
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="hidden sm:flex relative w-full max-w-sm">
              <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>

          {/* Right: Loading skeleton */}
          <div className="flex items-center gap-4">
            <div className="w-32 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
        </div>
      </header>
    )
  }

  const getRoleBadge = (role) => {
    const variants = {
      super_admin: 'bg-purple-100 text-purple-800',
      org_admin: 'bg-blue-100 text-blue-800',
      manager: 'bg-green-100 text-green-800',
      staff: 'bg-gray-100 text-gray-800',
      viewer: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-orange-100 text-orange-800',
    }
    return variants[role] || variants.staff
  }

  return (
    <header className="border-b border-border bg-background sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Left: Mobile Menu & Search */}
        <div className="flex items-center gap-4 flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Search Bar */}
          <div className="hidden sm:flex relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <Input
              type="search"
              placeholder="Search donors, inventory..."
              className="pl-10 bg-secondary/20 border-0"
            />
          </div>
        </div>

        {/* Right: Organization Info & Actions */}
        <div className="flex items-center gap-4">
          {/* Organization Badge - For org members */}
          {user?.organizationId && user?.role !== 'super_admin' && (
            <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <Building2 className="w-4 h-4 text-blue-600" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-blue-900">{user.organizationName}</span>
                <Badge className={`text-xs px-1 py-0 ${getRoleBadge(user.role)}`}>
                  {user.role?.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          )}

          {/* Platform Badge - For super admin */}
          {user?.role === 'super_admin' && (
            <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg">
              <Shield className="w-4 h-4 text-purple-600" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-purple-900">Platform Admin</span>
                <Badge className="text-xs px-1 py-0 bg-purple-100 text-purple-800">
                  Super Admin
                </Badge>
              </div>
            </div>
          )}

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-semibold text-primary-foreground">
                  {user?.initials || 'U'}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.fullName || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  {user?.organizationName && user.role !== 'super_admin' && (
                    <div className="flex items-center gap-1 mt-1">
                      <Building2 className="w-3 h-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground truncate">{user.organizationName}</p>
                    </div>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              {user?.role === 'org_admin' && (
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings/team" className="cursor-pointer">
                    <Users className="mr-2 h-4 w-4" />
                    Team Management
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
