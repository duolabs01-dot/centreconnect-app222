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
      <header className="fixed inset-x-0 top-0 z-50 bg-white/5 backdrop-blur-md transition-colors duration-300 group-hover:bg-white/10">
        <Container className="flex items-center justify-between gap-3 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <BrandMark href="/" compact hideLabelOnMobile hideLabel className="shrink-0" />
            <span className="flex items-center text-sm font-bold text-white">
              <span>CentreConnect</span>
              <span className="ml-2 h-2 w-2 rounded-full bg-cyan-400 animate-pulse" aria-hidden />
            </span>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            <Link href="/directory" className="text-sm font-semibold text-slate-200 transition hover:text-white">
              Find a Centre
            </Link>
            <Link href="/for-centres" className="text-sm font-semibold text-slate-200 transition hover:text-white">
              For ECDs
            </Link>
          </nav>

          <div className="flex shrink-0 items-center">
            <Button size="sm" className="px-3 sm:px-4 bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-xl" onClick={() => router.push('/login')}>
              Sign In
            </Button>
          </div>
        </Container>
      </header>

      <div className="animate-in fade-in duration-700">
        {children}
      </div>
    </div>
  )
}
