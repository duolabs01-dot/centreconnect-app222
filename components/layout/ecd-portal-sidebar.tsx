'use client'

import Link from 'next/link'
import { Fragment, useEffect, useMemo, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/ecd/BrandMark'
import { SignOutButton } from '@/components/ecd/SignOutButton'
import { ECD_DASHBOARD_NAV, type EcdNavItem } from './ecd-navigation'
import { useAppNavLock } from '@/lib/hooks/useAppNavLock'
import { MobileNavMenu } from './mobile-nav-menu'
import { Sparkles } from 'lucide-react'

type EcdPortalSidebarProps = {
  userEmail: string | null
  roleLabel?: string
  userRole?: 'ecd_admin' | 'ecd_staff' | 'ecd_supervisor' | null
  attentionBadges?: Partial<Record<string, number>>
}

const MAIN_GROUP_ORDER: NonNullable<EcdNavItem['group']>[] = [
  'daily_operations',
  'admissions',
  'finance',
  'communication',
  'compliance_team',
  'growth_tools',
]

const GROUP_LABELS: Record<NonNullable<EcdNavItem['group']>, string> = {
  daily_operations: 'Daily Operations',
  admissions: 'Admissions',
  finance: 'Finance',
  communication: 'Communication',
  compliance_team: 'Compliance & Team',
  growth_tools: 'Growth Tools',
  coming_soon: 'Coming Soon',
  settings: 'Settings',
}

const SIDEBAR_SCROLL_KEY = 'ecd-portal-sidebar-scroll-top'

export function EcdPortalSidebar({
  userEmail,
  roleLabel = 'ECD Portal',
  userRole = null,
  attentionBadges = {},
}: EcdPortalSidebarProps) {
  const pathname = usePathname()
  useAppNavLock()
  const desktopScrollRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-app-shell', 'true')
    return () => document.documentElement.removeAttribute('data-app-shell')
  }, [])

  useEffect(() => {
    const element = desktopScrollRef.current
    if (!element) return

    const savedScroll = window.sessionStorage.getItem(SIDEBAR_SCROLL_KEY)
    if (savedScroll) {
      const parsed = Number.parseInt(savedScroll, 10)
      if (Number.isFinite(parsed) && parsed >= 0) {
        element.scrollTop = parsed
      }
    }

    const onScroll = () => {
      window.sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(element.scrollTop))
    }

    element.addEventListener('scroll', onScroll, { passive: true })
    return () => element.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const element = desktopScrollRef.current
    if (!element) return

    const savedScroll = window.sessionStorage.getItem(SIDEBAR_SCROLL_KEY)
    if (!savedScroll) return

    const parsed = Number.parseInt(savedScroll, 10)
    if (Number.isFinite(parsed) && parsed >= 0) {
      element.scrollTop = parsed
    }
  }, [pathname])

  const visibleNav = useMemo(
    () =>
      ECD_DASHBOARD_NAV.filter((item) => {
        if (userRole === 'ecd_admin') return true
        if (userRole === 'ecd_supervisor') return item.supervisorAllowed === true && !item.adminOnly
        return !item.adminOnly
      }),
    [userRole]
  )

  const settingsItem = visibleNav.find((item) => item.group === 'settings' || item.href === '/ecd/profile') ?? null
  const comingSoonItems = visibleNav.filter((item) => item.comingSoon)
  const primaryItems = visibleNav.filter((item) => !item.comingSoon && item !== settingsItem)

  const groupedPrimaryItems = MAIN_GROUP_ORDER.map((group) => ({
    group,
    items: primaryItems.filter((item) => item.group === group),
  })).filter((bucket) => bucket.items.length > 0)

  const stale72hCount = attentionBadges['/ecd/applications:stale72h'] ?? 0
  const partialApplicationsCount = attentionBadges['/ecd/applications:partial'] ?? 0

  const getApplicationInsight = () => {
    if (stale72hCount > 0) {
      return `${stale72hCount} applications older than 72h - prioritize these`
    }
    if (partialApplicationsCount > 0) {
      return `${partialApplicationsCount} partial applications waiting for documents`
    }
    return null
  }

  const renderNavItem = (item: EcdNavItem) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
    const badgeCount = attentionBadges[item.href] ?? 0
    const applicationInsight = item.href === '/ecd/applications' ? getApplicationInsight() : null

    if (item.comingSoon) {
      return (
        <div
          key={item.href}
          className="group relative flex items-center gap-3 rounded-3xl border border-slate-200/80 bg-slate-50 px-4 py-3"
          aria-disabled="true"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-200 text-slate-500">
            <item.icon className="h-4 w-4 shrink-0" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold tracking-tight text-slate-700">{item.label}</p>
          </div>
          <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
            Soon
          </span>
        </div>
      )
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        scroll={false}
        className={cn(
          'group relative flex items-center gap-3 rounded-3xl px-4 py-3 text-sm font-bold tracking-tight transition-all duration-200 transform-gpu [will-change:transform]',
          active
            ? 'border border-teal-200 bg-teal-50/90 text-teal-900 shadow-sm'
            : 'border border-transparent text-slate-700 hover:border-teal-100 hover:bg-teal-50/60 hover:text-teal-800'
        )}
        aria-current={active ? 'page' : undefined}
      >
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-2xl transition-colors',
            active
              ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/20'
              : 'bg-slate-100 text-slate-500 group-hover:bg-teal-100 group-hover:text-teal-700'
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate">{item.label}</p>
          {applicationInsight ? (
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] font-semibold text-teal-700">
              <Sparkles className="h-3 w-3 shrink-0" />
              {applicationInsight}
            </p>
          ) : null}
        </div>
        {badgeCount > 0 ? (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-black text-white ring-2 ring-white">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        ) : null}
        {active ? <div className="absolute left-0 h-6 w-1 rounded-r-full bg-teal-600" /> : null}
      </Link>
    )
  }

  return (
    <>
      {/* Mobile Top Header - Unified with Parent view */}
      <div className="fixed inset-x-0 top-0 z-[90] flex h-16 items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-3">
          <MobileNavMenu 
            items={visibleNav} 
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
        ref={desktopScrollRef}
        className="hidden h-screen w-72 shrink-0 overflow-y-auto border-r border-border bg-card px-5 py-8 text-foreground shadow-[var(--shadow-elevation-1)] [scrollbar-width:none] hover:[scrollbar-width:thin] [&::-webkit-scrollbar]:w-0 hover:[&::-webkit-scrollbar]:w-2 hover:[&::-webkit-scrollbar-thumb]:rounded-full md:flex md:flex-col"
      >
        <div className="px-4 mb-8">
          <BrandMark compact className="brightness-100" />
          <div className="mt-3 inline-flex items-center px-2 py-0.5 rounded-full bg-teal-50 border border-teal-100">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">{roleLabel}</p>
          </div>
        </div>
        <nav className="mt-2 space-y-2" aria-label="ECD portal navigation">
          {groupedPrimaryItems.map((bucket) => (
            <Fragment key={bucket.group}>
              <p className="mb-2 mt-6 px-4 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500/80">
                {GROUP_LABELS[bucket.group]}
              </p>
              {bucket.items.map((item) => renderNavItem(item))}
            </Fragment>
          ))}

          {comingSoonItems.length > 0 ? (
            <Fragment>
              <div className="my-4 px-4">
                <div className="h-px w-full bg-slate-100" />
              </div>
              <p className="mb-2 px-4 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500/80">
                Coming Soon
              </p>
              {comingSoonItems.map((item) => renderNavItem(item))}
            </Fragment>
          ) : null}

          {settingsItem ? (
            <Fragment>
              <div className="my-4 px-4">
                <div className="h-px w-full bg-slate-100" />
              </div>
              <p className="mb-2 px-4 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500/80">
                {GROUP_LABELS.settings}
              </p>
              {renderNavItem(settingsItem)}
            </Fragment>
          ) : null}
        </nav>
        <div className="mt-8 shrink-0 space-y-4 rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-elevation-1)]">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Operator</p>
            <p className="truncate text-sm font-bold text-foreground">{userEmail ?? 'Unknown'}</p>  
          </div>
          <SignOutButton
            redirectTo="/"
            className="w-full rounded-3xl border border-border bg-card py-3 text-sm font-bold text-foreground shadow-[var(--shadow-elevation-1)] transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
          />
        </div>
      </aside>
    </>
  )
}
