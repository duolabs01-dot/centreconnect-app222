'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/layout/container'
import { AppBreadcrumbs } from '@/components/layout/app-breadcrumbs'
import { BrandMark } from '@/components/ecd/BrandMark'
import { usePathname, useRouter } from 'next/navigation'

type PublicShellProps = {
  children: React.ReactNode
}

export function PublicShell({ children }: PublicShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const isHome = pathname === '/'

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAF8F4] text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#EADFD2] bg-[#FFFDF9]/92 shadow-[0_6px_20px_rgba(34,49,46,0.06)] backdrop-blur-2xl">
        <Container className="flex min-h-[68px] items-center justify-between gap-3 py-2 sm:min-h-[72px] sm:py-3">
          <div className="flex items-center gap-3">
            <BrandMark href="/" compact className="shrink-0" />
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            <Link href="/directory" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
              Find a creche
            </Link>
            <Link href="/for-centres" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
              For creche owners
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-slate-200 px-3 text-[11px] font-semibold text-slate-600 sm:hidden"
              onClick={() => router.push('/for-centres')}
            >
              For owners
            </Button>
            <Button size="sm" className="rounded-full px-3 sm:px-4" onClick={() => router.push('/login')}>
              Sign In
            </Button>
          </div>
        </Container>
        <div className="mx-auto mt-1 hidden max-w-6xl justify-center sm:flex">
          <div className="h-1 w-36 rounded-full bg-gradient-to-r from-[#D4935A] via-teal-400 to-teal-600 shadow-[0_0_12px_rgba(13,148,136,0.18)]" />
        </div>
      </header>
      <div className="h-[84px] sm:h-[88px]" aria-hidden />

      <div className="animate-in fade-in duration-500">
        {!isHome ? (
          <Container className="pt-4">
            <AppBreadcrumbs rootHref="/" rootLabel="Home" />
          </Container>
        ) : null}
        {children}
      </div>
    </div>
  )
}