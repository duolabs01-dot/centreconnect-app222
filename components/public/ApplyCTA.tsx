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
            className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-900 font-semibold text-sm transition-colors"
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
        <div className="space-y-2.5">
          <span
            className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-slate-100 px-5 py-3 text-center text-sm font-bold text-slate-500"
            aria-disabled
          >
            Apply
            <span className="text-xs font-semibold text-slate-500">(Already submitted)</span>
          </span>
          <Link
            href={existingHref}
            className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-800"
          >
            View status: {statusLabel} <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </div>
      )
    }

    return (
      <div className="inline-flex items-center gap-2">
        <span className="inline-flex cursor-not-allowed items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Apply (Already submitted)
        </span>
        <Link
          href={existingHref}
          className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-800 font-semibold text-sm transition-colors"
        >
          View status <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    )
  }

  if (variant === 'hero') {
    return (
      <Link
        href={href}
        className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl
                   bg-cyan-600 hover:bg-cyan-700 active:scale-[0.98]
                   text-white font-bold text-lg transition-all
                   shadow-[var(--shadow-elevation-3)] shadow-cyan-900/30"
      >
        Apply Now <ArrowRight className="w-5 h-5" />
      </Link>
    )
  }

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-cyan-600 hover:text-cyan-700
                 font-medium text-sm transition-colors"
    >
      Apply <ArrowRight className="w-3.5 h-3.5" />
    </Link>
  )
}


