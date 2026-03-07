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
