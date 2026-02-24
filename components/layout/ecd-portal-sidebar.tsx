'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/ecd/BrandMark'
import { SignOutButton } from '@/components/ecd/SignOutButton'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { ECD_DASHBOARD_NAV, type EcdNavItem } from './ecd-navigation'
import { ArrowLeft, Menu, Pin, PinOff } from 'lucide-react'

type EcdPortalSidebarProps = {
  userEmail: string | null
  roleLabel?: string
  userRole?: 'ecd_admin' | 'ecd_staff' | null
}

export function EcdPortalSidebar({ userEmail, roleLabel = 'ECD Portal', userRole = null }: EcdPortalSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const visibleNav = ECD_DASHBOARD_NAV.filter(item =>
    !item.adminOnly || userRole === 'ecd_admin'
  )
  const primaryNav = visibleNav.filter((item) => (item.group ?? 'daily') === 'daily')
  const secondaryNav = visibleNav.filter((item) => (item.group ?? 'daily') !== 'daily')
  const topLevelPaths = new Set(visibleNav.map((item) => item.href))
  const [isPinned, setIsPinned] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const showMobileBack = Array.from(topLevelPaths).some((href) => pathname.startsWith(`${href}/`))

  const handleMobileBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push('/ecd/dashboard')
  }

  const renderNavItem = (item: EcdNavItem, onSelect?: () => void) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150',
          active
            ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
        onClick={() => {
          if (!isPinned) {
            setIsPinned(true)
          }
          onSelect?.()
        }}
      >
        <item.icon
          className={cn(
            'w-4 h-4 shrink-0',
            active ? 'text-primary' : 'text-muted-foreground'
          )}
        />
        <span>{item.label}</span>
      </Link>
    )
  }

  const togglePin = () => setIsPinned((prev) => !prev)

  return (
    <>
      {showMobileBack ? (
        <button
          type="button"
          onClick={handleMobileBack}
          className="fixed z-50 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-[var(--shadow-elevation-3)] shadow-slate-900/10 backdrop-blur-xl transition hover:bg-card lg:hidden [right:max(1rem,calc(env(safe-area-inset-right)+0.75rem))] [top:max(0.75rem,calc(env(safe-area-inset-top)+0.5rem))]"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed z-50 flex items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground shadow-[var(--shadow-elevation-3)] shadow-slate-900/10 backdrop-blur-xl transition hover:bg-card lg:hidden [left:max(1rem,calc(env(safe-area-inset-left)+0.75rem))] [top:max(0.75rem,calc(env(safe-area-inset-top)+0.5rem))]"
        aria-label="Open ECD navigation"
      >
        <Menu className="h-4 w-4" />
        <span>Menu</span>
      </button>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[86vw] max-w-[320px] border-r border-border bg-background p-0 lg:hidden">
          <div className="flex h-full flex-col px-4 py-6">
            <div className="px-2 pr-10">
              <BrandMark compact />
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-600">{roleLabel}</p>
            </div>
            <nav className="mt-6 space-y-1.5 flex-1 overflow-y-auto [scrollbar-width:none] hover:[scrollbar-width:thin] [&::-webkit-scrollbar]:w-0 hover:[&::-webkit-scrollbar]:w-2 hover:[&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300/80" aria-label="ECD portal navigation">
              {primaryNav.map((item) => renderNavItem(item, () => setMobileOpen(false)))}
              <div className="my-3 h-px bg-border" />
              {secondaryNav.map((item) => renderNavItem(item, () => setMobileOpen(false)))}
            </nav>
            <div className="mt-auto shrink-0 space-y-3 rounded-2xl border border-border bg-card/80 p-3">
              <p className="truncate text-xs text-muted-foreground">
                Signed in as <span className="font-semibold text-foreground">{userEmail ?? 'Unknown'}</span>
              </p>
              <SignOutButton redirectTo="/" className="w-full" />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {!isPinned && (
        <button
          type="button"
          onClick={() => setIsPinned(true)}
          className="fixed left-4 top-4 z-50 hidden items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground shadow-[var(--shadow-elevation-3)] shadow-slate-900/30 backdrop-blur-xl transition hover:bg-white/20 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 lg:flex"
        >
          <Menu className="h-4 w-4" />
          <span>Navigation</span>
        </button>
      )}
      <aside
        className={cn(
          'hidden h-screen overflow-y-auto [scrollbar-width:none] hover:[scrollbar-width:thin] [&::-webkit-scrollbar]:w-0 hover:[&::-webkit-scrollbar]:w-2 hover:[&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300/80 shrink-0 border-r border-border bg-background px-4 py-6 lg:flex lg:flex-col transition-[width,opacity] duration-300',
          isPinned ? 'lg:w-64 lg:opacity-100 lg:pointer-events-auto' : 'lg:w-0 lg:opacity-0 lg:pointer-events-none'
        )}
        aria-hidden={!isPinned}
      >
        <div className="px-2">
          <div className="flex items-center justify-between gap-3">
            <BrandMark compact />
            <button
              type="button"
              onClick={togglePin}
              className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-cyan-700 transition hover:text-cyan-800"
              aria-label={isPinned ? 'Enable auto-hide sidebar' : 'Pin sidebar'}
            >
              {isPinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
              {isPinned ? 'Auto-hide' : 'Pin'}
            </button>
          </div>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-600">{roleLabel}</p>
        </div>
        <nav className="mt-6 space-y-1.5" aria-label="ECD portal navigation">
          {primaryNav.map((item) => renderNavItem(item))}
          <div className="my-3 h-px bg-border" />
          {secondaryNav.map((item) => renderNavItem(item))}
        </nav>
        <div className="mt-auto shrink-0 space-y-3 rounded-2xl border border-border bg-card/80 p-3">
          <p className="truncate text-xs text-muted-foreground">
            Signed in as <span className="font-semibold text-foreground">{userEmail ?? 'Unknown'}</span>
          </p>
          <SignOutButton redirectTo="/" className="w-full" />
        </div>
      </aside>
    </>
  )
}


