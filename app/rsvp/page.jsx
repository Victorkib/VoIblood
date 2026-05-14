'use client'

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Calendar,
  MapPin,
  Clock,
  Heart,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  Droplets,
  Shield,
  ExternalLink,
  MessageCircle,
} from 'lucide-react'

function formatDriveDate(dateStr) {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return String(dateStr)
  }
}

function RsvpContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('t')
  const code = searchParams.get('c')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [payload, setPayload] = useState(null)
  /** From GET /api/rsvp — tells POST whether to send `code` or `token`. */
  const [auth, setAuth] = useState(null)
  const [submitting, setSubmitting] = useState(null)
  const [done, setDone] = useState(null)

  const load = useCallback(async () => {
    if (!token && !code) {
      setError(
        'This link is missing the RSVP key. Open the full link from your email or text (or tap the short link again).'
      )
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const qs = token
        ? `t=${encodeURIComponent(token)}`
        : `c=${encodeURIComponent(String(code).trim())}`
      const res = await fetch(`/api/rsvp?${qs}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Unable to load this invitation')
        setPayload(null)
        setAuth(null)
        return
      }
      setPayload(data.data)
      setAuth(data.data?.auth || null)
    } catch {
      setError('Network error. Please try again.')
      setPayload(null)
      setAuth(null)
    } finally {
      setLoading(false)
    }
  }, [token, code])

  useEffect(() => {
    load()
  }, [load])

  const driveLine = useMemo(() => {
    if (!payload?.drive) return ''
    const d = payload.drive
    const parts = [formatDriveDate(d.date)]
    if (d.startTime || d.endTime) {
      parts.push([d.startTime, d.endTime].filter(Boolean).join(' – '))
    }
    return parts.filter(Boolean).join(' · ')
  }, [payload])

  const submit = async (action) => {
    const body =
      auth?.type === 'code' && auth?.value
        ? { code: auth.value, action }
        : token
          ? { token, action }
          : code
            ? { code: String(code).trim().toLowerCase(), action }
            : null
    if (!body?.action || (!body.token && !body.code)) return
    setSubmitting(action)
    setError(null)
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'not_eligible') {
          setError(data.message || 'Not eligible to confirm for this drive.')
          return
        }
        setError(data.message || data.error || 'Something went wrong')
        return
      }
      setDone({ action, message: data.message, extra: data.data })
      await load()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f0712] text-white px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-600/25 via-transparent to-transparent pointer-events-none" />
        <Loader2 className="w-12 h-12 animate-spin text-rose-400 mb-4" aria-hidden />
        <p className="text-sm text-rose-100/80 tracking-wide">Preparing your invitation…</p>
      </div>
    )
  }

  if (error && !payload) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0712] text-white px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-600/20 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl shadow-rose-900/40">
          <div className="flex items-center gap-3 text-rose-300 mb-4">
            <XCircle className="w-8 h-8 shrink-0" />
            <h1 className="text-xl font-semibold">Link unavailable</h1>
          </div>
          <p className="text-white/80 text-sm leading-relaxed">{error}</p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center justify-center w-full rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 py-3 text-sm font-medium transition"
          >
            Go to iBlood home
          </Link>
        </div>
      </div>
    )
  }

  const { drive, donor, eligibility, isRegistrationOpen, existingParticipation } = payload

  return (
    <div className="min-h-screen bg-[#0f0712] text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(225,29,72,0.35),transparent)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_50%,rgba(127,29,29,0.2),transparent)] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />

      <div className="relative z-10 max-w-lg mx-auto px-4 py-12 sm:py-16">
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/10 px-4 py-1.5 text-xs font-semibold tracking-widest uppercase text-rose-200/90 mb-6">
            <Droplets className="w-3.5 h-3.5" />
            iBlood · Donor RSVP
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-br from-white via-rose-50 to-rose-200/60 bg-clip-text text-transparent">
            Welcome back{donor?.firstName ? `, ${donor.firstName}` : ''}
          </h1>
          <p className="mt-3 text-sm sm:text-base text-white/60 max-w-sm mx-auto leading-relaxed">
            You are already part of our donor community. Confirm if you can join this drive — no new account needed.
          </p>
        </header>

        <div className="rounded-3xl border border-white/10 bg-white/[0.07] backdrop-blur-2xl shadow-[0_24px_80px_-12px_rgba(225,29,72,0.35)] overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-rose-600 via-red-500 to-amber-500" />
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-300" />
                {drive.name}
              </h2>
              {drive.organizationName && (
                <p className="text-sm text-white/50 mt-1">{drive.organizationName}</p>
              )}
            </div>

            <div className="grid gap-3 text-sm">
              <div className="flex items-start gap-3 rounded-2xl bg-black/20 border border-white/5 px-4 py-3">
                <Calendar className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
                <div>
                  <p className="text-white/40 text-xs font-medium uppercase tracking-wider">When</p>
                  <p className="text-white/90">{driveLine}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-black/20 border border-white/5 px-4 py-3">
                <MapPin className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
                <div>
                  <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Where</p>
                  <p className="text-white/90">
                    {drive.location}
                    {drive.city ? `, ${drive.city}` : ''}
                  </p>
                </div>
              </div>
              {(drive.startTime || drive.endTime) && (
                <div className="flex items-start gap-3 rounded-2xl bg-black/20 border border-white/5 px-4 py-3">
                  <Clock className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Hours</p>
                    <p className="text-white/90">
                      {[drive.startTime, drive.endTime].filter(Boolean).join(' – ')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {!isRegistrationOpen && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90 flex gap-2">
                <Shield className="w-5 h-5 shrink-0 text-amber-400" />
                Registration for this drive is closed. Contact your blood center if you need help.
              </div>
            )}

            {existingParticipation?.status === 'confirmed' && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 flex gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                You are already confirmed for this drive. We will see you there — thank you for saving lives.
              </div>
            )}

            {existingParticipation?.status === 'declined' && (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 flex gap-2">
                <Heart className="w-5 h-5 shrink-0 text-rose-300" />
                You let us know you cannot make this one. You can still share the public link below with someone who can donate.
              </div>
            )}

            {done && (
              <div
                className={`rounded-2xl px-4 py-3 text-sm flex gap-2 border ${
                  done.action === 'confirm'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                    : 'border-white/10 bg-white/5 text-white/85'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-medium">{done.message}</p>
                  {done.extra?.donorProfileUrl && (
                    <Link
                      href={done.extra.donorProfileUrl}
                      className="inline-flex items-center gap-1 mt-2 text-rose-300 hover:text-rose-200 text-xs font-medium"
                    >
                      Open your donor profile <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            )}

            {error && payload && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100 flex gap-2">
                <XCircle className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}

            {!eligibility?.eligible && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-950/30 px-4 py-3 text-xs sm:text-sm text-amber-50/90 leading-relaxed">
                <p className="font-semibold text-amber-200 mb-1">Eligibility heads-up</p>
                {eligibility?.subhead || 'Our records suggest you may not be eligible for a whole-blood donation at this time.'}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                disabled={
                  !isRegistrationOpen ||
                  submitting ||
                  existingParticipation?.status === 'confirmed' ||
                  !eligibility?.eligible
                }
                onClick={() => submit('confirm')}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 disabled:opacity-40 disabled:pointer-events-none py-3.5 px-4 text-sm font-semibold shadow-lg shadow-rose-900/50 transition"
              >
                {submitting === 'confirm' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Heart className="w-5 h-5" />
                )}
                I will be there
              </button>
              <button
                type="button"
                disabled={!isRegistrationOpen || submitting || existingParticipation?.status === 'declined'}
                onClick={() => submit('decline')}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none py-3.5 px-4 text-sm font-medium transition"
              >
                {submitting === 'decline' ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                Can&apos;t make it
              </button>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-3">
              <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">Share with others</p>
              {drive.registrationUrl && (
                <a
                  href={drive.registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl bg-black/25 border border-white/10 px-4 py-3 text-sm text-rose-200 hover:bg-black/35 transition"
                >
                  <span className="truncate">Public registration link</span>
                  <ExternalLink className="w-4 h-4 shrink-0" />
                </a>
              )}
              {drive.whatsappGroupLink && (
                <a
                  href={drive.whatsappGroupLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl bg-emerald-950/40 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-200 hover:bg-emerald-950/60 transition"
                >
                  <span className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp updates
                  </span>
                  <ExternalLink className="w-4 h-4 shrink-0" />
                </a>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-white/30 mt-10 max-w-xs mx-auto leading-relaxed">
          Sent because your blood program invited you to this drive. If you received this by mistake, contact your donation center.
        </p>
      </div>
    </div>
  )
}

export default function RsvpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0f0712] text-white">
          <Loader2 className="w-10 h-10 animate-spin text-rose-400" />
        </div>
      }
    >
      <RsvpContent />
    </Suspense>
  )
}
