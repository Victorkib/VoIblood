'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/auth-provider'

/**
 * Resolves organization ID for API calls (handles super-admin org context).
 */
export function useOrganizationId() {
  const { user } = useAuth()
  const [organizationId, setOrganizationId] = useState(null)

  useEffect(() => {
    if (!user) {
      setOrganizationId(null)
      return
    }

    if (user.role !== 'super_admin') {
      setOrganizationId(user.organizationId || null)
      return
    }

    let cancelled = false
    async function loadContext() {
      try {
        const res = await fetch('/api/auth/session')
        let ctxId = user.organizationId || null

        if (res.ok) {
          const data = await res.json()
          ctxId =
            data.organizationContext?.id ||
            data.user?.viewingOrganizationId ||
            data.user?.organizationId ||
            user.organizationId ||
            null
        }

        // Super admin fallback: auto-pick first active organization
        if (!ctxId) {
          const orgsRes = await fetch('/api/admin/organizations?limit=100')
          if (orgsRes.ok) {
            const orgsData = await orgsRes.json()
            const organizations = Array.isArray(orgsData?.data) ? orgsData.data : []
            const activeOrg =
              organizations.find((org) => org?.isActive && org?.accountStatus === 'active') ||
              organizations.find((org) => org?.isActive) ||
              organizations[0]
            ctxId = activeOrg?.id || null
          }
        }

        if (!cancelled) setOrganizationId(ctxId)
      } catch {
        if (!cancelled) setOrganizationId(user.organizationId || null)
      }
    }
    loadContext()
    return () => {
      cancelled = true
    }
  }, [user])

  return organizationId
}
