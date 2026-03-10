'use client'

import React from 'react'
import { cn } from '@/lib/utils'

type AdminPageLayoutProps = {
  title: string
  description?: string
  roleLabel?: string
  wide?: boolean
  children: React.ReactNode
  actions?: React.ReactNode
}

export function AdminPageLayout({
  title,
  description,
  roleLabel,
  wide = false,
  children,
  actions
}: AdminPageLayoutProps) {
  return (
    <div className={cn("space-y-10", !wide && "max-w-5xl")}>
      {/* Page Header */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,1)]" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">
               {roleLabel || 'Platform Admin'}
             </p>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter sm:text-5xl leading-none">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-slate-500 font-medium max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center gap-4">
            {actions}
          </div>
        )}
      </header>

      {/* Page Content */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {children}
      </div>
    </div>
  )
}
