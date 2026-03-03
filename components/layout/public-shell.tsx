'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/layout/container'

type PublicShellProps = {
  children: React.ReactNode
}

export function PublicShell({ children }: PublicShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl shadow-[var(--shadow-elevation-1)]">
        <Container className="flex items-center justify-between py-3.5 sm:py-4">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="font-display text-xl font-bold tracking-tight text-slate-900">CentreConnect</span>
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 mt-1" />
          </Link>
          
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="/directory" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">Find a Centre</Link>
            <Link href="/for-centres" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">For ECDs</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button size="sm" variant="default" className="h-10 rounded-2xl bg-teal-600 px-5 text-sm font-bold text-white hover:bg-teal-700" asChild>
              <Link href="/login">
                Sign In
              </Link>
            </Button>
          </div>
        </Container>
      </header>

      <div className="animate-in fade-in duration-500">
        {children}
      </div>
    </div>
  )
}
