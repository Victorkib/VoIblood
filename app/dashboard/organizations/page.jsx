'use client'

import { OrgRouteGuard } from '@/components/dashboard/org-route-guard'
import { Loader2 } from 'lucide-react'

/** Legacy route — super admins are redirected to the platform organizations console. */
export default function OrganizationsPage() {
  return (
    <OrgRouteGuard feature="legacy_orgs">
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mr-3" />
        Opening organizations…
      </div>
    </OrgRouteGuard>
  )
}
