'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Building2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DashboardAudience = 'parent' | 'ecd'

type AdminDashboardAudienceToggleProps = {
  audience: DashboardAudience
}

export function AdminDashboardAudienceToggle({ audience }: AdminDashboardAudienceToggleProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setAudience = (next: DashboardAudience) => {
    if (next === audience) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('audience', next)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-1 shadow-[0_12px_24px_rgba(0,0,0,0.28)]">
      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => setAudience('parent')}
          className={cn(
            'inline-flex h-10 min-w-[164px] items-center justify-center gap-2 rounded-xl px-4 text-xs font-black uppercase tracking-[0.18em] transition-colors',
            audience === 'parent'
              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
          )}
          aria-pressed={audience === 'parent'}
        >
          <Users className="h-3.5 w-3.5" />
          Parent Users
        </button>
        <button
          type="button"
          onClick={() => setAudience('ecd')}
          className={cn(
            'inline-flex h-10 min-w-[164px] items-center justify-center gap-2 rounded-xl px-4 text-xs font-black uppercase tracking-[0.18em] transition-colors',
            audience === 'ecd'
              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
          )}
          aria-pressed={audience === 'ecd'}
        >
          <Building2 className="h-3.5 w-3.5" />
          ECD Users
        </button>
      </div>
    </div>
  )
}

