'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/layout/container'
import { AppBreadcrumbs } from '@/components/layout/app-breadcrumbs'

type PublicShellProps = {
  children: React.ReactNode
}

export function PublicShell({ children }: PublicShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl shadow-[var(--shadow-elevation-1)]">
        <Container className="flex items-center justify-between py-3.5 sm:py-4">
          <Link href="/" className="inline-flex items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60">
            <img src="/centreconnect-logo.svg" alt="CentreConnect" className="h-10 w-auto sm:h-11" />
            <span className="sr-only">CentreConnect Home</span>
          </Link>
          
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="/directory" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">Find a Centre</Link>
            <Link href="/for-centres" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">For ECDs</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </Container>
      </header>

      <div className="animate-in fade-in duration-500">
        <Container className="pt-4">
          <AppBreadcrumbs rootHref="/" rootLabel="Home" />
        </Container>
        {children}
      </div>
    </div>
  )
}
