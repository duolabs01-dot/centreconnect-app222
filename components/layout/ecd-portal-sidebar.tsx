'use client'

import Link from 'next/link'
import { Fragment, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/ecd/BrandMark'
import { SignOutButton } from '@/components/ecd/SignOutButton'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { ECD_DASHBOARD_NAV, type EcdNavItem } from './ecd-navigation'
import { ArrowLeft, Menu, Home, ClipboardList, UserCheck, User } from 'lucide-react'
import { useAppNavLock } from '@/lib/hooks/useAppNavLock'
import { BottomNav, type NavItem } from './bottom-nav'

type EcdPortalSidebarProps = {
  userEmail: string | null
  roleLabel?: string
  userRole?: 'ecd_admin' | 'ecd_staff' | 'ecd_supervisor' | null
  attentionBadges?: Partial<Record<string, number>>
}

// Map ECD portal items for the shared BottomNav
const ecdMobileNavItems: NavItem[] = [
  { href: '/ecd/dashboard', label: 'Home', icon: Home },
  { href: '/ecd/applications', label: 'Admissions', icon: ClipboardList },
  { href: '/ecd/attendance', label: 'Attendance', icon: UserCheck },
  { href: '/ecd/profile', label: 'Profile', icon: User },
]

export function EcdPortalSidebar({
  userEmail,
  roleLabel = 'ECD Portal',
  userRole = null,
  attentionBadges = {},
}: EcdPortalSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  useAppNavLock()

  const visibleNav = ECD_DASHBOARD_NAV.filter((item) => {
    if (userRole === 'ecd_admin') return true
    if (userRole === 'ecd_supervisor') return item.supervisorAllowed === true && !item.adminOnly
    return !item.adminOnly
  })
  const topLevelPaths = new Set(visibleNav.map((item) => item.href))
  const [mobileOpen, setMobileOpen] = useState(false)
  const showMobileBack = Array.from(topLevelPaths).some((href) => pathname.startsWith(`${href}/`))

  const GROUP_LABELS: Record<string, string> = {
    daily: 'Daily Operations',
    operations: 'Operations',
    growth: 'Growth & Visibility',
    admin: 'Admin',
  }

  const handleMobileBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push('/ecd/dashboard')
  }

  const renderNavItem = (item: EcdNavItem, onSelect?: () => void) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
    const badgeCount = attentionBadges[item.href] ?? 0
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold transition-all duration-150 rounded-xl',
          active
            ? 'text-teal-700 bg-teal-50 shadow-sm'
            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
        )}
        onClick={() => {
          onSelect?.()
        }}
        aria-current={active ? 'page' : undefined}
      >
        <item.icon className={cn('w-4 h-4 shrink-0', active ? 'text-teal-600' : 'text-slate-400')} />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {badgeCount > 0 ? (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white ring-1 ring-white/10">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        ) : null}
      </Link>
    )
  }

  const renderGroupedNav = (items: EcdNavItem[], onSelect?: () => void) => {
    let lastGroup = ''
    return items.map((item) => {
      const itemGroup = item.group ?? 'daily'
      const showHeader = itemGroup !== lastGroup
      lastGroup = itemGroup

      return (
        <Fragment key={item.href}>
          {showHeader ? (
            <p className="mt-4 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
              {GROUP_LABELS[itemGroup] ?? itemGroup}
            </p>
          ) : null}
          {renderNavItem(item, onSelect)}
        </Fragment>
      )
    })
  }

  return (
    <>
      {showMobileBack ? (
        <button
          type="button"
          onClick={handleMobileBack}
          className="fixed z-50 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-float backdrop-blur-xl transition hover:bg-slate-50 lg:hidden [right:max(1rem,calc(env(safe-area-inset-right)+0.75rem))] [top:max(0.75rem,calc(env(safe-area-inset-top)+0.5rem))]"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed z-50 flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold tracking-tight text-slate-900 shadow-float backdrop-blur-xl transition hover:bg-slate-50 lg:hidden [left:max(1rem,calc(env(safe-area-inset-left)+0.75rem))] [top:max(0.75rem,calc(env(safe-area-inset-top)+0.5rem))]"
        aria-label="Open ECD navigation"
      >
        <Menu className="h-4 w-4 text-teal-600" />
        <span>Menu</span>
      </button>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[86vw] max-w-[320px] border-r border-slate-100 bg-white p-0 lg:hidden text-slate-900">
          <div className="flex h-full flex-col px-4 py-6">
            <div className="px-2 pr-10">
              <BrandMark compact className="brightness-100" />
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">{roleLabel}</p>
            </div>
            <nav className="mt-6 space-y-1 flex-1 overflow-y-auto [scrollbar-width:none] hover:[scrollbar-width:thin] [&::-webkit-scrollbar]:w-0 hover:[&::-webkit-scrollbar]:w-2 hover:[&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-200" aria-label="ECD portal navigation">
              {renderGroupedNav(visibleNav, () => setMobileOpen(false))}
            </nav>
            <div className="mt-auto shrink-0 space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 mb-16">
              <p className="truncate text-xs text-slate-500 font-medium">
                Signed in as <span className="font-bold text-slate-900">{userEmail ?? 'Unknown'}</span>
              </p>
              <SignOutButton redirectTo="/" className="w-full bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 font-bold rounded-xl shadow-sm" />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <aside
        className="hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-slate-100 bg-white px-4 py-8 [scrollbar-width:none] hover:[scrollbar-width:thin] [&::-webkit-scrollbar]:w-0 hover:[&::-webkit-scrollbar]:w-2 hover:[&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-200 lg:flex lg:flex-col"
      >
        <div className="px-2 mb-4">
          <BrandMark compact className="brightness-100" />
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">{roleLabel}</p>
        </div>
        <nav className="mt-6 space-y-1" aria-label="ECD portal navigation">
          {renderGroupedNav(visibleNav)}
        </nav>
        <div className="mt-auto shrink-0 space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="truncate text-xs text-slate-500 font-medium">
            Signed in as <span className="font-bold text-slate-900">{userEmail ?? 'Unknown'}</span>  
          </p>
          <SignOutButton redirectTo="/" className="w-full bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 font-bold rounded-xl shadow-sm" />
        </div>
      </aside>

      <BottomNav items={ecdMobileNavItems} />
    </>
  )
}
