'use client'

import { Building2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminAudience } from '@/components/admin/admin-audience-context'

export function AdminAudienceToggle() {
  const { audience, setAudience } = useAdminAudience()

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-1 shadow-[0_12px_24px_rgba(0,0,0,0.28)]">
      <div className="grid grid-cols-2 gap-1" role="tablist" aria-label="Dashboard audience">
        <button
          type="button"
          onClick={() => setAudience('parent')}
          className={cn(
            'inline-flex h-10 min-w-[144px] items-center justify-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-[0.18em] transition-all',
            audience === 'parent'
              ? 'border-cyan-300/70 bg-cyan-300 text-slate-950 shadow-[0_10px_24px_rgba(103,232,249,0.24)]'
              : 'border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-slate-100'
          )}
          role="tab"
          aria-selected={audience === 'parent'}
        >
          <Users className="h-3.5 w-3.5" />
          Parents
        </button>
        <button
          type="button"
          onClick={() => setAudience('ecd')}
          className={cn(
            'inline-flex h-10 min-w-[144px] items-center justify-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-[0.18em] transition-all',
            audience === 'ecd'
              ? 'border-cyan-300/70 bg-cyan-300 text-slate-950 shadow-[0_10px_24px_rgba(103,232,249,0.24)]'
              : 'border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-slate-100'
          )}
          role="tab"
          aria-selected={audience === 'ecd'}
        >
          <Building2 className="h-3.5 w-3.5" />
          ECD
        </button>
      </div>
    </div>
  )
}

