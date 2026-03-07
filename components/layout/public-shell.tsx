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
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/30 bg-white/20 backdrop-blur-3xl shadow-[0_8px_30px_rgba(15,23,42,0.35)]">
        <Container className="flex items-center justify-between gap-3 py-2 sm:py-3">
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
        <div className="mx-auto mt-1 flex max-w-6xl justify-center">
          <div className="h-1 w-36 rounded-full bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-500 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
        </div>
      </header>
      <div className="h-[56px] sm:h-[64px]" aria-hidden />

      <div className="animate-in fade-in duration-500">
        <Container className="pt-4">
          <AppBreadcrumbs rootHref="/" rootLabel="Home" />
        </Container>
        {children}
      </div>
    </div>
  )
}
