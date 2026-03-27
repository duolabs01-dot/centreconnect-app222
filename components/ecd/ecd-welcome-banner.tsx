'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, Rocket, CheckCircle2 } from 'lucide-react'

type EcdWelcomeBannerProps = {
  centreName: string
  checklistTotal: number
  checklistDone: number
}

const DISMISS_KEY = 'cc-ecd-welcome-banner-dismissed-v1'

export function EcdWelcomeBanner({ centreName, checklistTotal, checklistDone }: EcdWelcomeBannerProps) {
  const [dismissed, setDismissed] = useState(true) // start hidden to avoid flash

  useEffect(() => {
    const stored = localStorage.getItem(DISMISS_KEY)
    setDismissed(stored === '1')
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  if (dismissed) return null

  const allDone = checklistDone >= checklistTotal
  const percent = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-teal-400/30 bg-gradient-to-br from-teal-900/80 via-slate-800 to-slate-900 px-6 py-5 shadow-lg">
      {/* dismiss button */}
      <button
        onClick={dismiss}
        aria-label="Dismiss welcome banner"
        className="absolute right-4 top-4 rounded-full p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-300">
          <Rocket className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-400">
            Welcome to CentreConnect
          </p>
          <h2 className="mt-1 text-lg font-black text-white">
            {allDone
              ? `${centreName} is all set!`
              : `Let\u2019s get ${centreName} ready`}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            {allDone
              ? 'Your cr\u00e8che is live and ready for families. Share your public page to start getting applications.'
              : `You\u2019ve completed ${checklistDone} of ${checklistTotal} first steps. Finishing these makes your cr\u00e8che visible and trusted by parents.`}
          </p>

          {/* progress bar */}
          {!allDone && (
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-teal-400 transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] font-semibold text-slate-400">
                {percent}% complete
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {allDone ? (
              <Link
                href="/ecd/website"
                className="inline-flex items-center gap-1.5 rounded-2xl bg-teal-500 px-4 py-2 text-xs font-black text-white shadow-sm transition-colors hover:bg-teal-400"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                View your public page
              </Link>
            ) : (
              <>
                <Link
                  href="/ecd/children/new"
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-teal-500 px-4 py-2 text-xs font-black text-white shadow-sm transition-colors hover:bg-teal-400"
                >
                  Add children
                </Link>
                <Link
                  href="/ecd/attendance"
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Take attendance
                </Link>
                <Link
                  href="/ecd/website"
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Upload logo
                </Link>
              </>
            )}
            <button
              onClick={dismiss}
              className="inline-flex items-center rounded-2xl px-4 py-2 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-400"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
