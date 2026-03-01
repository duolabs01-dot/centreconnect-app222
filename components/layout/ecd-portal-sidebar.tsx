'use client'

import Link from 'next/link'
import { Fragment, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/ecd/BrandMark'
import { SignOutButton } from '@/components/ecd/SignOutButton'
import { ECD_DASHBOARD_NAV, type EcdNavItem } from './ecd-navigation'
import { Home, ClipboardList, UserCheck, User } from 'lucide-react'
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
  useAppNavLock()

  useEffect(() => {
    document.documentElement.setAttribute('data-app-shell', 'true')
    return () => document.documentElement.removeAttribute('data-app-shell')
  }, [])

  const visibleNav = ECD_DASHBOARD_NAV.filter((item) => {
    if (userRole === 'ecd_admin') return true
    if (userRole === 'ecd_supervisor') return item.supervisorAllowed === true && !item.adminOnly
    return !item.adminOnly
  })

  const GROUP_LABELS: Record<string, string> = {
    daily: 'Daily Operations',
    operations: 'Operations',
    growth: 'Growth & Visibility',
    admin: 'Admin',
  }

  const renderNavItem = (item: EcdNavItem) => {
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

  const renderGroupedNav = (items: EcdNavItem[]) => {
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
          {renderNavItem(item)}
        </Fragment>
      )
    })
  }

  return (
    <>
      <aside
        className="hidden w-64 shrink-0 sticky top-0 h-screen overflow-y-auto border-r border-slate-100 bg-white px-4 py-8 [scrollbar-width:none] hover:[scrollbar-width:thin] [&::-webkit-scrollbar]:w-0 hover:[&::-webkit-scrollbar]:w-2 hover:[&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-200 lg:flex lg:flex-col"
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
