'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/ui/page-header'

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
    <div className={cn('space-y-8', !wide && 'max-w-5xl')}>
      <PageHeader
        tone="admin"
        eyebrow={roleLabel || 'Platform Admin'}
        title={title}
        description={description}
        actions={actions}
      />

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {children}
      </div>
    </div>
  )
}
