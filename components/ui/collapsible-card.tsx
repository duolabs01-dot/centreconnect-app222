'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type CollapsibleCardProps = {
  title: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
  id?: string
}

export function CollapsibleCard({ title, defaultOpen = false, children, className, id }: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div id={id} className={cn('rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between bg-slate-50/50 px-5 py-4 text-left"
      >
        <span className="text-base font-bold text-slate-900">{title}</span>
        <ChevronDown className={cn('h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-4">
          {children}
        </div>
      )}
    </div>
  )
}
