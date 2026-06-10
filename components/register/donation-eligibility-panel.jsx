'use client'

import {
  DONATION_ELIGIBILITY_CRITERIA,
  DONATION_COMPONENTS,
  getComponentEligibilityGrid,
  isEligibleForAnyComponent,
} from '@/lib/donation-eligibility'
import { Calendar, CheckCircle2, Clock, Droplet, Heart, Info, Sparkles } from 'lucide-react'

const componentAccent = {
  whole_blood: {
    ring: 'ring-red-200',
    bg: 'bg-gradient-to-br from-red-50 to-rose-50',
    border: 'border-red-200',
    badge: 'bg-red-600 text-white',
    icon: 'text-red-600',
    dot: 'bg-red-500',
  },
  platelets: {
    ring: 'ring-amber-200',
    bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
    border: 'border-amber-200',
    badge: 'bg-amber-600 text-white',
    icon: 'text-amber-600',
    dot: 'bg-amber-500',
  },
  plasma: {
    ring: 'ring-blue-200',
    bg: 'bg-gradient-to-br from-blue-50 to-sky-50',
    border: 'border-blue-200',
    badge: 'bg-blue-600 text-white',
    icon: 'text-blue-600',
    dot: 'bg-blue-500',
  },
}

function ComponentCard({ row, driveDateLabel }) {
  const accent = componentAccent[row.key] || componentAccent.whole_blood
  const eligible = row.eligible

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${accent.border} ${accent.bg} ${
        eligible ? 'ring-2 ring-offset-2 ' + accent.ring : 'opacity-95'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {row.intervalLabel} interval
          </p>
          <h4 className="text-lg font-bold text-slate-900 mt-0.5">{row.label}</h4>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${accent.badge}`}
        >
          {eligible ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Eligible
            </>
          ) : (
            <>
              <Clock className="w-3.5 h-3.5" />
              Wait
            </>
          )}
        </span>
      </div>

      <p className="mt-3 text-sm text-slate-700 leading-relaxed">
        {eligible ? (
          <>
            You appear eligible for <strong>{row.label.toLowerCase()}</strong> at this drive
            {driveDateLabel ? ` on ${driveDateLabel}` : ''}. Final screening on site still applies.
          </>
        ) : row.nextEligibleDisplay ? (
          <>
            Next eligible: <strong>{row.nextEligibleDisplay}</strong>
            {row.daysRemaining > 0 && (
              <span className="text-slate-500"> ({row.daysRemaining} day(s) after drive date)</span>
            )}
          </>
        ) : (
          'Enter your last donation date to check this component.'
        )}
      </p>
    </div>
  )
}

/**
 * Polished eligibility checker for public registration landing + form.
 */
export function DonationEligibilityPanel({
  driveDate,
  hasDonatedBefore = false,
  lastDonationDate = '',
  intendedComponent = 'whole_blood',
  onIntendedComponentChange,
  showComponentPicker = true,
  compact = false,
  className = '',
}) {
  const driveDateLabel = driveDate
    ? new Date(driveDate).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const needsDate = hasDonatedBefore && !lastDonationDate

  const grid = getComponentEligibilityGrid({
    lastDonationDate: hasDonatedBefore ? lastDonationDate : null,
    driveDate: driveDate || new Date(),
  })

  const anyEligible = hasDonatedBefore && lastDonationDate
    ? isEligibleForAnyComponent({
        lastDonationDate,
        driveDate: driveDate || new Date(),
      })
    : !hasDonatedBefore

  const focused =
    hasDonatedBefore && lastDonationDate
      ? grid.find((r) => r.key === intendedComponent) || grid[0]
      : null

  return (
    <div className={`space-y-5 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-200">
          <Droplet className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Check your eligibility</h3>
          <p className="text-sm text-slate-600 mt-0.5">
            See which donation types you can give at this drive before you register.
          </p>
        </div>
      </div>

      {needsDate && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p>Enter your last donation date below to see personalized results for each component type.</p>
        </div>
      )}

      {!hasDonatedBefore && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            First-time donors are generally welcome for whole blood at this drive. On-site screening
            confirms final eligibility.
          </p>
        </div>
      )}

      {hasDonatedBefore && lastDonationDate && (
        <div
          className={`rounded-2xl border px-4 py-3 flex items-center gap-3 ${
            anyEligible
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {anyEligible ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <Heart className="w-5 h-5 shrink-0" />
          )}
          <p className="text-sm font-medium">
            {anyEligible
              ? 'You may be eligible for at least one donation type at this drive.'
              : 'You are not yet eligible to donate any component at this drive date - but you can still register as a supporter and share the drive.'}
          </p>
        </div>
      )}

      {!compact && (
        <div className="grid gap-3 sm:grid-cols-3">
          {grid.map((row) => (
            <ComponentCard key={row.key} row={row} driveDateLabel={driveDateLabel} />
          ))}
        </div>
      )}

      {compact && focused && (
        <ComponentCard row={focused} driveDateLabel={driveDateLabel} />
      )}

      {showComponentPicker && hasDonatedBefore && lastDonationDate && anyEligible && onIntendedComponentChange && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label htmlFor="intended-component" className="text-sm font-semibold text-slate-900">
            What do you plan to donate at this drive?
          </label>
          <p className="text-xs text-slate-500 mt-1 mb-3">
            We use this to apply the correct waiting-period rule for your registration.
          </p>
          <select
            id="intended-component"
            value={intendedComponent}
            onChange={(e) => onIntendedComponentChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {DONATION_COMPONENTS &&
              Object.values(DONATION_COMPONENTS).map((c) => {
                const row = grid.find((r) => r.key === c.key)
                const label = row?.eligible
                  ? `${c.label} - eligible`
                  : `${c.label} - not yet eligible`
                return (
                  <option key={c.key} value={c.key} disabled={row && !row.eligible}>
                    {label}
                  </option>
                )
              })}
          </select>
        </div>
      )}

      <details className="group rounded-xl border border-slate-200 bg-slate-50/80">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          Donation spacing rules
          <span className="ml-auto text-xs text-slate-400 group-open:hidden">Show</span>
        </summary>
        <ul className="px-4 pb-4 space-y-2 text-sm text-slate-600 list-disc pl-8">
          {DONATION_ELIGIBILITY_CRITERIA.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>
    </div>
  )
}
