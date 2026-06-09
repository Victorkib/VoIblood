'use client'

import { Badge } from '@/components/ui/badge'
import { getOrgExperience, ORG_TYPE_LABELS } from '@/lib/dashboard/org-experience'
import { useAuth } from '@/components/auth/auth-provider'
import { Building2, Sparkles } from 'lucide-react'

const accentBadge = {
  rose: 'bg-rose-100 text-rose-800 border-rose-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  violet: 'bg-violet-100 text-violet-800 border-violet-200',
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
}

export function OrgDashboardHeader({ statsOrganization }) {
  const { user } = useAuth()
  const orgType = statsOrganization?.type || user?.organizationType || 'blood_bank'
  const experience = getOrgExperience(orgType, {
    rewardsPartnerActive: user?.rewardsPartnerActive,
    isOrgAdmin: user?.role === 'org_admin',
    isSuperAdmin: user?.role === 'super_admin',
  })
  const Icon = experience.icon
  const badgeClass = accentBadge[experience.accent] || accentBadge.rose
  const orgName = statsOrganization?.name || user?.organizationName

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${experience.gradient} p-6 sm:p-8`}
    >
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={badgeClass}>
              <Sparkles className="w-3 h-3 mr-1" />
              {experience.typeLabel}
            </Badge>
            {orgName && (
              <Badge variant="secondary" className="font-normal">
                <Building2 className="w-3 h-3 mr-1" />
                {orgName}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {orgName ? `${orgName} dashboard` : 'Dashboard'}
          </h1>
          <p className="text-sm sm:text-base text-foreground/70 leading-relaxed">
            {experience.description}
          </p>
          <p className="text-xs text-foreground/50">{experience.tagline}</p>
        </div>
        <div className="hidden sm:flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-background/80 border shadow-sm">
          <Icon className="w-8 h-8 text-primary" />
        </div>
      </div>
    </div>
  )
}

export function OrgTypePill({ type }) {
  const label = ORG_TYPE_LABELS[type] || type
  return (
    <span className="text-xs font-medium text-muted-foreground capitalize">
      {label}
    </span>
  )
}
