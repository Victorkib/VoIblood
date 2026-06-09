'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/auth/auth-provider'
import {
  canAccessFeature,
  getFeaturePageConfig,
} from '@/lib/dashboard/org-access'
import { getOrgExperience } from '@/lib/dashboard/org-experience'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ShieldAlert, Gift, LayoutDashboard, Loader2 } from 'lucide-react'
import { OrgPageHeader } from '@/components/dashboard/org-page-header'

const DENIED_COPY = {
  org_type_denied: {
    title: 'Not available for your organization',
    hospital_donors:
      'Hospitals manage donor thank-yous through Gratitude Points, not the donor registry. Blood banks and NGOs register donors directly.',
    default:
      'This area is designed for other organization types on iBlood. Use the menu to see what your team can access.',
  },
  capability_denied: {
    title: 'Feature not enabled',
    body: 'Your organization type does not include this capability. Contact your platform administrator if you believe this is an error.',
  },
  admin_only: {
    title: 'Admin access required',
    body: 'Only organization administrators can open this section. Ask your org admin for access.',
  },
  gratitude_not_enrolled: {
    title: 'Gratitude Points not active',
    body: 'Your hospital is not enrolled as a Gratitude Points partner yet. A platform administrator can enable this on your organization profile.',
  },
  pending_approval: {
    title: 'Account pending approval',
    body: 'Your organization is awaiting approval. You can view the dashboard overview until an administrator activates your account.',
  },
  not_in_nav: {
    title: 'Page unavailable',
    body: 'This page is not part of your organization workspace.',
  },
}

function DeniedState({ feature, reason, orgType }) {
  const experience = getOrgExperience(orgType || 'blood_bank')
  let copy = DENIED_COPY[reason] || DENIED_COPY.not_in_nav

  if (reason === 'org_type_denied' && feature === 'donors' && orgType === 'hospital') {
    copy = {
      title: DENIED_COPY.org_type_denied.title,
      body: DENIED_COPY.org_type_denied.hospital_donors,
    }
  } else if (typeof copy === 'object' && copy.default) {
    copy = { title: copy.title, body: copy.default }
  }

  return (
    <Card className="max-w-lg mx-auto mt-12 p-8 text-center space-y-4 border-dashed">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <ShieldAlert className="h-7 w-7 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold">{copy.title}</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">{copy.body}</p>
      <div className="flex flex-wrap justify-center gap-2 pt-2">
        <Button asChild variant="default">
          <Link href="/dashboard">
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Back to dashboard
          </Link>
        </Button>
        {feature === 'donors' && orgType === 'hospital' && (
          <Button asChild variant="outline">
            <Link href="/dashboard/gratitude">
              <Gift className="w-4 h-4 mr-2" />
              Gratitude Points
            </Link>
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground pt-2">
        {experience.typeLabel} workspace
      </p>
    </Card>
  )
}

export function OrgRouteGuard({ feature, children }) {
  const { user, isLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const orgType = user?.organizationType || 'blood_bank'

  const access = canAccessFeature(feature, {
    user,
    orgType,
    rewardsPartnerActive: user?.rewardsPartnerActive,
    organizationCapabilities: user?.organizationCapabilities || [],
  })

  useEffect(() => {
    if (isLoading || !user) return
    if (feature === 'legacy_orgs' && access.reason === 'redirect_dashboard') {
      router.replace('/dashboard/super-admin/organizations')
    }
  }, [isLoading, user, feature, access, router])

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!access.allowed) {
    if (feature === 'legacy_orgs') {
      return (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
    }
    return <DeniedState feature={feature} reason={access.reason} orgType={orgType} />
  }

  return children
}

export function OrgFeatureLayout({ feature, actions, children }) {
  const { user } = useAuth()
  const orgType = user?.organizationType || 'blood_bank'
  const page = getFeaturePageConfig(feature, orgType)

  return (
    <OrgRouteGuard feature={feature}>
      <div className="space-y-6 max-w-7xl mx-auto w-full">
        {page && (
          <OrgPageHeader
            title={page.title}
            description={page.description}
            actions={actions}
          />
        )}
        {children}
      </div>
    </OrgRouteGuard>
  )
}
