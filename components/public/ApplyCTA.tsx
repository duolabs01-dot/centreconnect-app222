'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface ApplyCTAProps {
  centreSlug: string
  variant: 'hero' | 'inline'
  userRole?: string | null
  existingApplicationId?: string | null
  existingApplicationStatus?: string | null
  isAvailable?: boolean
  unavailableLabel?: string
  helperText?: string | null
  fallbackHref?: string | null
  fallbackLabel?: string | null
  existingHelperText?: string | null
  existingFollowUpHref?: string | null
  existingFollowUpLabel?: string | null
}

function formatStatusLabel(status?: string | null) {
  if (!status) return 'Submitted'
  return status
    .split('_')
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}

export function ApplyCTA({
  centreSlug,
  variant,
  userRole,
  existingApplicationId,
  existingApplicationStatus,
  isAvailable = true,
  unavailableLabel = 'Online applications not available yet',
  helperText = null,
  fallbackHref = null,
  fallbackLabel = null,
  existingHelperText = null,
  existingFollowUpHref = null,
  existingFollowUpLabel = null,
}: ApplyCTAProps) {
  if (userRole?.startsWith('ecd_')) return null

  const href = `/apply/${centreSlug}`
  const existingHref = existingApplicationId ? `/parent/applications/${existingApplicationId}` : null
  const hasExistingApplication = Boolean(existingHref)
  const statusLabel = formatStatusLabel(existingApplicationStatus)

  if (!isAvailable) {
    if (variant === 'hero') {
      return (
        <div className="space-y-2.5">
          <span
            className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-2xl border border-slate-300 bg-slate-100 px-5 py-3 text-center text-sm font-bold text-slate-500"
            aria-disabled
          >
            {unavailableLabel}
          </span>
          {helperText ? <p className="text-sm text-slate-600">{helperText}</p> : null}
          {fallbackHref && fallbackLabel ? (
            <Link
              href={fallbackHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-teal-300 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-teal-700 transition-colors hover:border-teal-400 hover:text-teal-900"
            >
              {fallbackLabel} <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>
      )
    }

    return (
      <div className="space-y-1">
        <span className="inline-flex cursor-not-allowed items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {unavailableLabel}
        </span>
        {fallbackHref && fallbackLabel ? (
          <Link
            href={fallbackHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-sm text-teal-700 transition-colors hover:text-teal-900"
          >
            {fallbackLabel} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        ) : null}
      </div>
    )
  }

  if (hasExistingApplication && existingHref) {
    if (variant === 'hero') {
      return (
        <div className="space-y-3 rounded-[1.5rem] border border-cyan-200 bg-cyan-50/70 p-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-800">Application sent</p>
            <p className="mt-1 text-base font-semibold text-slate-900">You have already applied here.</p>
            <p className="mt-1 text-sm text-slate-600">Status: {statusLabel}</p>
            {existingHelperText ? <p className="mt-2 text-sm text-slate-600">{existingHelperText}</p> : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={existingHref}
              className="inline-flex flex-1 items-center justify-center rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-cyan-700"
            >
              View application <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            {existingFollowUpHref && existingFollowUpLabel ? (
              <Link
                href={existingFollowUpHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                {existingFollowUpLabel}
              </Link>
            ) : null}
          </div>
        </div>
      )
    }

    return (
      <div className="inline-flex items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-800">
          Application sent
        </span>
        <Link href={existingHref} className="inline-flex items-center gap-1 font-semibold text-sm text-slate-700 transition-colors hover:text-slate-900">
          View application <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    )
  }

  if (variant === 'hero') {
    return (
      <Link
        href={href}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 py-4 text-lg font-black text-white shadow-[var(--shadow-elevation-3)] shadow-cyan-900/30 transition-all hover:bg-cyan-700 active:scale-[0.98]"
      >
        Apply now <ArrowRight className="w-5 h-5" />
      </Link>
    )
  }

  return (
    <Link href={href} className="inline-flex items-center gap-1 font-black text-sm text-cyan-600 transition-colors hover:text-cyan-700">
      Apply now <ArrowRight className="w-3.5 h-3.5" />
    </Link>
  )
}
