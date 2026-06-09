'use client'

import { Badge } from '@/components/ui/badge'
import { getOrgExperience } from '@/lib/dashboard/org-experience'
import { useAuth } from '@/components/auth/auth-provider'

const accentBadge = {
  rose: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800',
  blue: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800',
  violet: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-800',
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800',
}

export function OrgPageHeader({ title, description, actions, badge }) {
  const { user } = useAuth()
  const orgType = user?.organizationType || 'blood_bank'
  const experience = getOrgExperience(orgType, {
    rewardsPartnerActive: user?.rewardsPartnerActive,
    isOrgAdmin: user?.role === 'org_admin',
    isSuperAdmin: user?.role === 'super_admin',
  })
  const Icon = experience.icon
  const badgeClass = accentBadge[experience.accent] || accentBadge.rose

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${experience.gradient} px-6 py-5 sm:px-8 sm:py-6`}
    >
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={badgeClass}>
              {badge || experience.typeLabel}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-sm sm:text-base text-foreground/70 leading-relaxed">
              {description}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:items-end gap-3">
          {actions ? (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          ) : null}
          <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-background/80 border shadow-sm">
            <Icon className="w-7 h-7 text-primary" />
          </div>
        </div>
      </div>
    </div>
  )
}
