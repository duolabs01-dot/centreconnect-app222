'use client'

import Link from 'next/link'

export default function Error() {
  return (
    <div className="rounded-[2rem] border border-rose-500/20 bg-rose-500/10 p-6 text-rose-100 shadow-none">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-300">
        OpenClaw operations
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
        The OpenClaw view could not load
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-rose-100/80">
        The route stays read-only. Use the rest of CentreConnect admin while the OpenClaw
        integration is recovering.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/admin/dashboard"
          className="inline-flex h-11 items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition-colors hover:bg-white/5"
        >
          Open founder KPIs
        </Link>
        <Link
          href="/admin/command"
          className="inline-flex h-11 items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition-colors hover:bg-white/5"
        >
          Open operations
        </Link>
      </div>
    </div>
  )
}
