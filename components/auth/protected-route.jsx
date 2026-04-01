'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { hasPermission } from '@/lib/auth'
import { Loader2 } from 'lucide-react'

export function ProtectedRoute({
  children,
  requiredPermission,
  requiredRole,
  fallback,
}) {
  const router = useRouter()
  const { user, isLoading, isAuthenticated } = useAuth()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname))
      return
    }

    // Check role-based access
    if (requiredRole && user?.role !== requiredRole) {
      router.push('/dashboard?error=access_denied')
      return
    }

    // Check permission-based access
    if (requiredPermission && !hasPermission(user, requiredPermission)) {
      router.push('/dashboard?error=access_denied')
      return
    }

    setIsChecking(false)
  }, [isLoading, isAuthenticated, user, requiredRole, requiredPermission, router])

  if (isLoading || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-foreground/60">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 text-center">
          <p className="text-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // Check permission
  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 text-center">
          <p className="text-destructive font-semibold">Access Denied</p>
          <p className="text-foreground/60">You don't have permission to access this page</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
