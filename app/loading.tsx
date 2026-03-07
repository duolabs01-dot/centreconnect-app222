'use client'

import { BrandMark } from '@/components/ecd/BrandMark'

export default function Loading() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-slate-50 text-slate-900">
      <div className="rounded-2xl bg-white px-6 py-5 shadow-xl border border-slate-100 backdrop-blur-3xl">
        <BrandMark href="/" compact hideLabelOnMobile={false} />
      </div>
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
        Opening CentreConnect…
      </p>
      <div className="h-1 w-28 rounded-full bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-500 shadow-[0_0_15px_rgba(34,211,238,0.4)] animate-pulse" />
    </div>
  )
}
