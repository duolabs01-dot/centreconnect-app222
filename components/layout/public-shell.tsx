'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/layout/container'
import { AppBreadcrumbs } from '@/components/layout/app-breadcrumbs'
import { BrandMark } from '@/components/ecd/BrandMark'
import { useRouter } from 'next/navigation'

type PublicShellProps = {
  children: React.ReactNode
}

export function PublicShell({ children }: PublicShellProps) {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-slate-50 text-foreground overflow-x-hidden">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xl shadow-[0_2px_14px_rgba(15,23,42,0.2)]">
        <Container className="flex items-center justify-between gap-3 py-3.5 sm:py-4">
          <div className="flex items-center gap-3">
            <BrandMark href="/" compact hideLabelOnMobile hideLabel className="shrink-0" />
            <span className="flex items-center text-sm font-semibold text-slate-900">
              <span>CentreConnect</span>
              <span className="ml-2 h-2 w-2 rounded-full bg-cyan-500" aria-hidden />
            </span>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            <Link href="/directory" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
              Find a Centre
            </Link>
            <Link href="/for-centres" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
              For ECDs
            </Link>
          </nav>

          <div className="flex shrink-0 items-center">
            <Button size="sm" className="px-3 sm:px-4" onClick={() => router.push('/login')}>
              Sign In
            </Button>
          </div>
        </Container>
        <div className="mx-auto mt-3 flex max-w-6xl items-center justify-between gap-4 border-t border-white/20 pt-3 text-[11px] uppercase tracking-[0.4em] text-slate-500 sm:pt-4">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-24 rounded-full bg-white/60 blur-sm" />
            <span className="text-xs text-slate-400">Live install signal</span>
          </div>
          <div className="flex-1">
            <div className="relative h-1 rounded-full bg-white/10">
              <div className="absolute inset-y-0 left-0 h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_10px_rgba(8,145,178,0.8)]" />
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-900">Step 3 • Secure</span>
        </div>
      </header>
      <div className="h-[72px] sm:h-[80px]" aria-hidden />

      <div className="animate-in fade-in duration-500">
        <Container className="pt-4">
          <AppBreadcrumbs rootHref="/" rootLabel="Home" />
        </Container>
        {children}
      </div>
    </div>
  )
}
