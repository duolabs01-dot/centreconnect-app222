'use client'

import Link from 'next/link'

export default function Error() {
  return (
    <div className="rounded-[2rem] border border-rose-500/20 bg-rose-500/10 p-6 text-rose-100 shadow-none">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-300">
        Company HQ
      </p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
        The founder control room could not load
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-rose-100/80">
        The route stays read-only. Use the linked admin surfaces while HQ is recovering.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/admin/ai-os"
          className="inline-flex h-11 items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-xs font-black uppercase tracking-[0.18em] text-slate-200 transition-colors hover:bg-white/5"
        >
          Open AI OS
        </Link>
        <Link
          href="/admin/openclaw"
          className="inline-flex h-11 items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-xs font-black uppercase tracking-[0.18em] text-slate-200 transition-colors hover:bg-white/5"
        >
          Open OpenClaw
        </Link>
        <Link
          href="/admin/dashboard"
          className="inline-flex h-11 items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-xs font-black uppercase tracking-[0.18em] text-slate-200 transition-colors hover:bg-white/5"
        >
          Open dashboard
        </Link>
      </div>
    </div>
  )
}
