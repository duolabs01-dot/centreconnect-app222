'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/ecd/BrandMark'
import { SignOutButton } from '@/components/ecd/SignOutButton'
import { ECD_DASHBOARD_NAV, type EcdNavItem } from './ecd-navigation'
import { Menu, Pin, PinOff } from 'lucide-react'

type EcdPortalSidebarProps = {
  userEmail: string | null
  roleLabel?: string
}

export function EcdPortalSidebar({ userEmail, roleLabel = 'ECD Portal' }: EcdPortalSidebarProps) {
  const pathname = usePathname()
  const primaryNav = ECD_DASHBOARD_NAV.filter((item) => (item.group ?? 'daily') === 'daily')
  const secondaryNav = ECD_DASHBOARD_NAV.filter((item) => (item.group ?? 'daily') !== 'daily')
  const [isPinned, setIsPinned] = useState(true)

  const renderNavItem = (item: EcdNavItem) => {
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
      {!isPinned && (
        <button
          type="button"
          onClick={() => setIsPinned(true)}
          className="fixed left-4 top-4 z-50 flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground shadow-lg shadow-slate-900/30 backdrop-blur-xl transition hover:bg-white/20 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60"
        >
          <Menu className="h-4 w-4" />
          <span>Navigation</span>
        </button>
      )}
      <aside
        className={cn(
          'hidden h-screen overflow-hidden shrink-0 border-r border-border bg-background px-4 py-6 lg:flex lg:flex-col transition-[width,opacity] duration-300',
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
              className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-cyan-300 transition hover:text-cyan-200"
              aria-label={isPinned ? 'Enable auto-hide sidebar' : 'Pin sidebar'}
            >
              {isPinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
              {isPinned ? 'Auto-hide' : 'Pin'}
            </button>
          </div>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-600">{roleLabel}</p>
        </div>
        <nav className="mt-6 space-y-1.5" aria-label="ECD portal navigation">
          {primaryNav.map(renderNavItem)}
          <div className="my-3 h-px bg-white/10" />
          {secondaryNav.map(renderNavItem)}
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
