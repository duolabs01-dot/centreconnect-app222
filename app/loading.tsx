'use client'

import { BrandMark } from '@/components/ecd/BrandMark'

export default function Loading() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-slate-950 text-white">
      <div className="rounded-2xl bg-white/10 px-6 py-5 shadow-2xl shadow-cyan-900/30 backdrop-blur-3xl">
        <BrandMark href="/" compact hideLabelOnMobile={false} />
      </div>
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200">
        Opening CentreConnect…
      </p>
      <div className="h-1 w-28 rounded-full bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 shadow-[0_0_15px_rgba(6,182,212,0.9)] animate-pulse" />
    </div>
  )
}
