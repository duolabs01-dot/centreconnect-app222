'use client'

import Link from 'next/link'
import { Fragment, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/ecd/BrandMark'
import { SignOutButton } from '@/components/ecd/SignOutButton'
import { ECD_DASHBOARD_NAV, type EcdNavItem } from './ecd-navigation'
import { useAppNavLock } from '@/lib/hooks/useAppNavLock'
import { MobileNavMenu } from './mobile-nav-menu'

type EcdPortalSidebarProps = {
  userEmail: string | null
  roleLabel?: string
  userRole?: 'ecd_admin' | 'ecd_staff' | 'ecd_supervisor' | null
  attentionBadges?: Partial<Record<string, number>>
}

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
          'flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all duration-200 rounded-2xl group relative',
          active
            ? 'text-teal-900 bg-teal-50/80 shadow-sm border border-teal-100/50'
            : 'text-slate-600 hover:text-teal-700 hover:bg-teal-50/30'
        )}
        aria-current={active ? 'page' : undefined}
      >
        <div className={cn(
          "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
          active ? "bg-teal-600 text-white shadow-lg shadow-teal-900/20" : "bg-slate-100 text-slate-400 group-hover:bg-teal-100 group-hover:text-teal-600"
        )}>
          <item.icon className="w-4 h-4 shrink-0" />
        </div>
        <span className="min-w-0 flex-1 truncate tracking-tight">{item.label}</span>
        {badgeCount > 0 ? (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-black text-white ring-2 ring-white">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        ) : null}
        {active && (
          <div className="absolute left-0 w-1 h-6 bg-teal-600 rounded-r-full" />
        )}
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
            <p className="mt-6 mb-2 px-4 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400/80">
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
      {/* Mobile Top Header - Unified with Parent view */}
      <div className="lg:hidden fixed top-0 inset-x-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 z-[90] px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MobileNavMenu 
            items={ECD_DASHBOARD_NAV} 
            userEmail={userEmail} 
            roleLabel={roleLabel} 
            userRole={userRole} 
            attentionBadges={attentionBadges}
          />
          <BrandMark compact className="brightness-100" />
        </div>
        <div className="flex items-center gap-2">
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">{roleLabel}</p>
        </div>
      </div>

      <aside
        className="hidden w-72 shrink-0 sticky top-0 h-screen overflow-y-auto border-r border-slate-100 bg-white px-5 py-8 [scrollbar-width:none] hover:[scrollbar-width:thin] [&::-webkit-scrollbar]:w-0 hover:[&::-webkit-scrollbar]:w-2 hover:[&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-200 lg:flex lg:flex-col shadow-[1px_0_10px_rgba(0,0,0,0.02)]"
      >
        <div className="px-4 mb-8">
          <BrandMark compact className="brightness-100" />
          <div className="mt-3 inline-flex items-center px-2 py-0.5 rounded-full bg-teal-50 border border-teal-100">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">{roleLabel}</p>
          </div>
        </div>
        <nav className="mt-2 space-y-1.5" aria-label="ECD portal navigation">
          {renderGroupedNav(visibleNav)}
        </nav>
        <div className="mt-auto shrink-0 space-y-4 rounded-[2rem] border border-slate-100 bg-slate-50/50 p-6">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Operator</p>
            <p className="truncate text-sm text-slate-900 font-bold">{userEmail ?? 'Unknown'}</p>  
          </div>
          <SignOutButton redirectTo="/" className="w-full bg-white border border-slate-200 text-slate-900 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all font-bold rounded-2xl py-3 shadow-sm text-sm" />
        </div>
      </aside>
    </>
  )
}
