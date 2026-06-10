'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ELIGIBILITY_COLORS,
  COMPONENT_LABELS,
} from '@/lib/donor-donation-history-shared'
import {
  Activity,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Droplet,
  FlaskConical,
  Heart,
  MapPin,
  Package,
  Sparkles,
} from 'lucide-react'

function StatPill({ label, value, accent = 'text-red-600' }) {
  return (
    <div className="rounded-xl border border-border/80 bg-gradient-to-br from-background to-muted/30 px-4 py-3 text-center">
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}

function DonationCard({ donation, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const isDrive = donation.collectionType === 'drive'

  return (
    <div className="relative pl-8 pb-8 last:pb-0">
      <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-red-300 via-red-200 to-transparent last:hidden" />
      <div className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-md ring-4 ring-red-100">
        {donation.donationNumber}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition hover:shadow-md">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-start gap-4 p-4 text-left sm:p-5"
        >
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
              isDrive ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {isDrive ? <Activity className="h-6 w-6" /> : <Building2 className="h-6 w-6" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold text-foreground">
                {donation.collectionLabel}
              </h4>
              <Badge variant="outline" className="text-xs">
                {donation.componentLabel}
              </Badge>
              {donation.bloodType && (
                <Badge className="bg-red-600 text-white text-xs">{donation.bloodType}</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {donation.dateDisplay}
                {donation.timeDisplay && ` at ${donation.timeDisplay}`}
              </span>
              <span className="inline-flex items-center gap-1">
                <Droplet className="h-3.5 w-3.5" />
                {donation.volume} ml
              </span>
            </p>
            {donation.unitId && (
              <p className="mt-1 font-mono text-xs text-muted-foreground truncate">
                Unit {donation.unitId}
              </p>
            )}
          </div>

          <div className="shrink-0 pt-1 text-muted-foreground">
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </button>

        {expanded && (
          <div className="border-t border-border/60 bg-muted/20 px-4 py-4 sm:px-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge className={ELIGIBILITY_COLORS[donation.eligibilityStatus] || ELIGIBILITY_COLORS.pending}>
                <FlaskConical className="h-3 w-3 mr-1" />
                {donation.eligibilityLabel}
              </Badge>
              {donation.inventoryStatus && (
                <Badge variant="outline" className="capitalize">
                  Inventory: {donation.inventoryStatus}
                </Badge>
              )}
              <Badge variant="outline">
                {isDrive ? 'Blood drive' : 'Facility collection'}
              </Badge>
            </div>

            {donation.bloodWorkSummary && (
              <div className="rounded-lg bg-background border px-3 py-2 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Screening summary
                </p>
                <p className="text-foreground/80">{donation.bloodWorkSummary}</p>
              </div>
            )}

            {donation.notes && (
              <div className="rounded-lg bg-background border px-3 py-2 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Notes
                </p>
                <p className="text-foreground/80 whitespace-pre-wrap">{donation.notes}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {donation.driveId && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/drives/${donation.driveId}`}>
                    <MapPin className="h-4 w-4 mr-1.5" />
                    View drive
                  </Link>
                </Button>
              )}
              {donation.inventoryId && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/inventory/${donation.inventoryId}`}>
                    <Package className="h-4 w-4 mr-1.5" />
                    View blood unit
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function DonorDonationJourney({ donationHistory = [], donationStats = null }) {
  const stats = donationStats || {
    totalDonations: donationHistory.length,
    livesImpactEstimate: donationHistory.length * 3,
    totalVolumeMl: donationHistory.reduce((s, d) => s + (d.volume || 0), 0),
    driveDonations: donationHistory.filter((d) => d.collectionType === 'drive').length,
    facilityDonations: donationHistory.filter((d) => d.collectionType !== 'drive').length,
    uniqueDrives: new Set(donationHistory.map((d) => d.driveId).filter(Boolean)).size,
    componentBreakdown: {},
  }

  const componentEntries = Object.entries(stats.componentBreakdown || {})

  if (!donationHistory.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-14 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <Heart className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No donations recorded yet</h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            When this donor completes a blood drive donation or a unit is logged in inventory,
            their journey will appear here with dates, unit IDs, and drive links.
          </p>
          {stats.totalDonations > 0 && (
            <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
              Total donations on file ({stats.totalDonations}) may include legacy records before
              detailed history tracking was enabled.
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 opacity-90" />
            <div>
              <h3 className="text-lg font-bold">Donation journey</h3>
              <p className="text-sm text-red-100">
                {stats.totalDonations} donation{stats.totalDonations !== 1 ? 's' : ''} on record
                {stats.uniqueDrives > 0 &&
                  ` across ${stats.uniqueDrives} drive${stats.uniqueDrives !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
        </div>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatPill label="Total donations" value={stats.totalDonations} />
            <StatPill
              label="Lives helped (est.)"
              value={stats.livesImpactEstimate}
              accent="text-rose-600"
            />
            <StatPill
              label="Volume donated"
              value={`${stats.totalVolumeMl} ml`}
              accent="text-blue-600"
            />
            <StatPill
              label="At drives"
              value={stats.driveDonations}
              accent="text-purple-600"
            />
          </div>

          {componentEntries.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {componentEntries.map(([key, count]) => (
                <Badge key={key} variant="secondary" className="text-xs">
                  {COMPONENT_LABELS[key] || key}: {count}
                </Badge>
              ))}
            </div>
          )}

          {stats.hasHistoryGap && (
            <p className="mt-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Some older donations are counted in totals but lack detailed history rows. New
              donations will include full traceability.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-red-600" />
            Timeline
          </CardTitle>
          <CardDescription>
            Newest first — expand any donation for screening results, notes, and links
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {donationHistory.map((donation, index) => (
              <DonationCard key={donation.id} donation={donation} defaultExpanded={index === 0} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
