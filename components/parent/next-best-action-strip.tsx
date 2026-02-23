'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

type Action = {
  label: string
  href: string
}

type NextBestActionStripProps = {
  title: string
  hint: string
  actions: Action[]
}

export function NextBestActionStrip({ title, hint, actions }: NextBestActionStripProps) {
  return (
    <section className="rounded-2xl border border-cyan-100/80 bg-white/90 p-4 shadow-[var(--shadow-elevation-3)]">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-cyan-800">Next best action</p>
      <h2 className="mt-1 text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{hint}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button key={`${action.href}-${action.label}`} variant="outline" size="sm" asChild>
            <Link href={action.href} prefetch>
              {action.label}
            </Link>
          </Button>
        ))}
      </div>
    </section>
  )
}


