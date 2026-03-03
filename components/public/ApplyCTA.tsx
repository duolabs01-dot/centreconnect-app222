'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface ApplyCTAProps {
  centreSlug: string
  variant: 'hero' | 'inline'
  userRole?: string | null
  existingApplicationId?: string | null
  existingApplicationStatus?: string | null
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
}: ApplyCTAProps) {
  if (userRole?.startsWith('ecd_')) return null

  const href = `/apply/${centreSlug}`
  const existingHref = existingApplicationId ? `/parent/applications/${existingApplicationId}` : null
  const hasExistingApplication = Boolean(existingHref)
  const statusLabel = formatStatusLabel(existingApplicationStatus)

  if (hasExistingApplication && existingHref) {
    if (variant === 'hero') {
      return (
        <div className="space-y-2.5">
          <Link
            href={existingHref}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-slate-100 px-5 py-3 text-center text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200"
          >
            Application already submitted - View status
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={existingHref}
            className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-800"
          >
            Status: {statusLabel}
          </Link>
        </div>
      )
    }

    return (
      <div className="inline-flex items-center gap-2">
        <Link
          href={existingHref}
          className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-800 font-semibold text-sm transition-colors"
        >
          View status <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <Link
          href={existingHref}
          className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600"
        >
          {statusLabel}
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


