'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/ecd/BrandMark'
import { SignOutButton } from '@/components/ecd/SignOutButton'
import { ECD_DASHBOARD_NAV, type EcdNavItem } from './ecd-navigation'
import { useAppNavLock } from '@/lib/hooks/useAppNavLock'
import { MobileNavMenu } from './mobile-nav-menu'
import { Lock, Sparkles } from 'lucide-react'

type EcdPortalSidebarProps = {
  userEmail: string | null
  roleLabel?: string
  userRole?: 'ecd_admin' | 'ecd_staff' | 'ecd_supervisor' | null
  subscriptionTier?: string | null
  attentionBadges?: Partial<Record<string, number>>
  centreName?: string | null
}

type EcdNavGroup = NonNullable<EcdNavItem['group']>

const MAIN_GROUP_ORDER: EcdNavGroup[] = [
  'daily_ops',
  'admin',
  'grow',
]

const GROUP_LABELS: Record<EcdNavGroup, string> = {
  daily_ops: 'Daily Operations',
  admin: 'Management',
  grow: 'Grow',
  settings: 'Account',
}

const SIDEBAR_SCROLL_KEY = 'ecd-portal-sidebar-scroll-top'

function readSavedSidebarScroll() {
  try {
    const saved = window.sessionStorage.getItem(SIDEBAR_SCROLL_KEY)
    if (!saved) return null
    const parsed = Number.parseInt(saved, 10)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
  } catch {
    return null
  }
}

function writeSavedSidebarScroll(value: number) {
  try {
    window.sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(Math.max(0, Math.floor(value))))
  } catch {
    // Ignore storage write issues (private browsing / quota).
  }
}

export function EcdPortalSidebar({
  userEmail,
  roleLabel = 'ECD Portal',
  userRole = null,
  subscriptionTier = null,
  attentionBadges = {},
  centreName = null,
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
    const saved = readSavedSidebarScroll()
    if (saved !== null) element.scrollTop = saved
    const onScroll = () => writeSavedSidebarScroll(element.scrollTop)
    element.addEventListener('scroll', onScroll, { passive: true })
    return () => element.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const element = desktopScrollRef.current
    if (!element) return
    const saved = readSavedSidebarScroll()
    if (saved !== null) element.scrollTop = saved
  }, [pathname])

  const roleEligibleNav = useMemo(
    () =>
      ECD_DASHBOARD_NAV.filter((item) => {
        if (userRole === 'ecd_admin') return true
        if (userRole === 'ecd_supervisor') return item.supervisorAllowed === true && !item.adminOnly
        return !item.adminOnly
      }),
    [userRole]
  )

  const lockedByTier = roleEligibleNav.filter(
    (item) => item.minTier && (item.minTier === 'standard' || item.minTier === 'premium')
  )

  const visibleNav = roleEligibleNav.filter(
    (item) => !item.minTier || (item.minTier !== 'standard' && item.minTier !== 'premium')
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
    if (stale72hCount > 0) return `${stale72hCount} applications older than 72h - prioritize these`
    if (partialApplicationsCount > 0) return `${partialApplicationsCount} partial applications waiting for documents`
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
          className="group relative flex items-center gap-3 rounded-xl border border-slate-200/60 bg-slate-50/60 px-3 py-2.5"
          aria-disabled="true"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
            <item.icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-slate-500">{item.label}</p>
          </div>
          <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-400">
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
        onClick={() => {
          const element = desktopScrollRef.current
          if (element) writeSavedSidebarScroll(element.scrollTop)
        }}
        className={cn(
          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200',
          active
            ? 'bg-teal-500/10 text-teal-800 border border-teal-200/60'
            : 'text-slate-600 hover:bg-accent hover:text-accent-foreground border border-transparent'
        )}
        aria-current={active ? 'page' : undefined}
      >
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all',
            active
              ? 'bg-teal-600 text-white shadow-sm shadow-teal-900/20'
              : 'bg-slate-100 text-slate-500 group-hover:bg-teal-50 group-hover:text-teal-700'
          )}
        >
          <item.icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate">{item.label}</p>
          {applicationInsight ? (
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] font-medium text-teal-600">
              <Sparkles className="h-3 w-3 shrink-0" />
              {applicationInsight}
            </p>
          ) : null}
        </div>
        {badgeCount > 0 ? (
          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white ring-2 ring-white">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        ) : null}
        {active ? (
          <div className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-teal-500" />
        ) : null}
      </Link>
    )
  }

  const roleInitial = roleLabel?.[0]?.toUpperCase() ?? 'E'

  return (
    <>
      {/* Mobile Top Header */}
      <div className="fixed inset-x-0 top-0 z-[90] flex h-16 items-center justify-between bg-teal-600 px-4 md:hidden shadow-md">
        <div className="flex items-center gap-3">
          <MobileNavMenu
            items={visibleNav}
            userEmail={userEmail}
            roleLabel={roleLabel}
            userRole={userRole}
            subscriptionTier={subscriptionTier}
            attentionBadges={attentionBadges}
          />
          <BrandMark compact className="[&_*]:text-white" />
        </div>
        <div className="flex items-center gap-2">
          {centreName && <span className="hidden sm:block text-[11px] font-bold text-teal-100 truncate max-w-[140px]">{centreName}</span>}
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white border border-white/20">
            {roleLabel}
          </span>
        </div>
      </div>

      <aside
        ref={desktopScrollRef}
        className="hidden h-screen w-[260px] shrink-0 overflow-y-auto border-r border-slate-200/80 bg-white text-foreground shadow-sm [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-teal-100 md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex md:flex-col"
      >
        {/* Branded Header */}
        <div className="bg-gradient-to-br from-teal-600 to-teal-700 px-5 pt-5 pb-4">
          <BrandMark compact className="[&_*]:text-white [&_svg]:text-white" />
          {centreName && (
            <p className="mt-3 text-[14px] font-black text-white leading-tight truncate">{centreName}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold text-white border border-white/20">
              {roleLabel}
            </span>
            {subscriptionTier && (
              <span className="inline-flex items-center rounded-full bg-amber-400/30 px-2.5 py-0.5 text-[10px] font-semibold text-amber-100 border border-amber-300/30 capitalize">
                {subscriptionTier === 'standard' ? '⭐ Growth' : subscriptionTier === 'premium' ? '🚀 Pro' : subscriptionTier}
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 px-4 py-5" aria-label="ECD portal navigation">
          {groupedPrimaryItems.map((bucket) => (
            <div key={bucket.group} className="mb-5">
              {GROUP_LABELS[bucket.group] ? (
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400/80">
                  {GROUP_LABELS[bucket.group]}
                </p>
              ) : null}
              {bucket.items.map((item) => renderNavItem(item))}
            </div>
          ))}

          {settingsItem && !settingsItem.comingSoon ? (
            <div className="mb-5">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-5 mx-3" />
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400/80">
                Account
              </p>
              {renderNavItem(settingsItem)}
            </div>
          ) : null}

          {comingSoonItems.length > 0 ? (
            <div className="mb-5">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-5 mx-3" />
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400/80">
                Coming Soon
              </p>
              {comingSoonItems.map((item) => renderNavItem(item))}
            </div>
          ) : null}

          {lockedByTier.length > 0 ? (
            <div className="mb-5">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-4 mx-3" />
              <Link
                href="/ecd/billing"
                className="block mx-1 mb-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 px-3 py-2.5 hover:from-amber-100 hover:to-orange-100 transition-colors"
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <p className="text-[11px] font-black text-amber-800">Unlock more features</p>
                </div>
                <p className="text-[10px] text-amber-700 leading-tight">Upgrade your plan to access {lockedByTier.length} more tool{lockedByTier.length > 1 ? 's' : ''}</p>
              </Link>
              {lockedByTier.map((item) => (
                <Link
                  key={item.href}
                  href="/ecd/billing"
                  className="group relative flex items-center gap-3 rounded-xl border border-dashed border-amber-200 bg-amber-50/30 px-3 py-2 mb-1 hover:bg-amber-50 transition-colors"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                    <item.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-amber-800">{item.label}</p>
                  </div>
                  <Lock className="h-3 w-3 shrink-0 text-amber-400" />
                </Link>
              ))}
            </div>
          ) : null}
        </nav>

        {/* Footer */}
        <div className="mt-auto space-y-2 px-4 py-5 border-t border-slate-100">
          {/* User email */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5">
            <p className="truncate text-[11px] text-slate-500">{userEmail}</p>
          </div>

          {/* WhatsApp support */}
          <Link
            href="https://wa.me/27685356430?text=Hi%20Mandla%2C%20I%20need%20help%20with%20CentreConnect"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-2.5 text-xs font-medium text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700 transition-all hover:shadow-md"
          >
            💬 WhatsApp support
          </Link>

          {/* Sign out */}
          <SignOutButton
            redirectTo="/"
            className="w-full rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-sm py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-white hover:border-slate-300 hover:shadow-sm"
          />
        </div>
      </aside>
    </>
  )
}
