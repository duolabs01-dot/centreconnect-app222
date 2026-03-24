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
import { Lock, Sparkles, Zap } from 'lucide-react'

type EcdPortalSidebarProps = {
  userEmail: string | null
  roleLabel?: string
  userRole?: 'ecd_admin' | 'ecd_staff' | 'ecd_supervisor' | null
  subscriptionTier?: string | null
  attentionBadges?: Partial<Record<string, number>>
  centreName?: string | null
}

type EcdNavGroup = NonNullable<EcdNavItem['group']>

const MAIN_GROUP_ORDER: EcdNavGroup[] = ['daily_ops', 'admin', 'grow']

const GROUP_LABELS: Record<EcdNavGroup, string> = {
  daily_ops: 'Daily Ops',
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
  } catch { return null }
}

function writeSavedSidebarScroll(value: number) {
  try {
    window.sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(Math.max(0, Math.floor(value))))
  } catch { /* noop */ }
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
    const el = desktopScrollRef.current
    if (!el) return
    const saved = readSavedSidebarScroll()
    if (saved !== null) el.scrollTop = saved
    const onScroll = () => writeSavedSidebarScroll(el.scrollTop)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const el = desktopScrollRef.current
    if (!el) return
    const saved = readSavedSidebarScroll()
    if (saved !== null) el.scrollTop = saved
  }, [pathname])

  const roleEligibleNav = useMemo(
    () => ECD_DASHBOARD_NAV.filter((item) => {
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

  const renderNavItem = (item: EcdNavItem) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
    const badgeCount = attentionBadges[item.href] ?? 0
    const appInsight = item.href === '/ecd/applications'
      ? stale72hCount > 0 ? `${stale72hCount} waiting 72h+`
        : partialApplicationsCount > 0 ? `${partialApplicationsCount} partial`
        : null
      : null

    if (item.comingSoon) {
      return (
        <div key={item.href} className="flex items-center gap-2.5 rounded-xl px-3 py-2 opacity-40" aria-disabled="true">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5">
            <item.icon className="h-4 w-4 text-slate-500" />
          </div>
          <span className="flex-1 truncate text-[12px] font-medium text-slate-500">{item.label}</span>
          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">Soon</span>
        </div>
      )
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        scroll={false}
        onClick={() => {
          const el = desktopScrollRef.current
          if (el) writeSavedSidebarScroll(el.scrollTop)
        }}
        className={cn(
          'group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12px] font-medium transition-all duration-150',
          active
            ? 'bg-teal-500/15 text-teal-300'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        )}
        aria-current={active ? 'page' : undefined}
      >
        <div className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all',
          active
            ? 'bg-teal-500/20 text-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.25)]'
            : 'bg-white/5 text-slate-500 group-hover:bg-white/10 group-hover:text-slate-300'
        )}>
          <item.icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate">{item.label}</p>
          {appInsight && (
            <p className="mt-0.5 truncate text-[10px] font-medium text-teal-400/80">{appInsight}</p>
          )}
        </div>
        {badgeCount > 0 && (
          <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
        {active && (
          <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-teal-400" />
        )}
      </Link>
    )
  }

  return (
    <>
      {/* ── Mobile Top Header ── */}
      <div className="fixed inset-x-0 top-0 z-[90] flex h-14 items-center justify-between bg-slate-900/95 px-4 md:hidden"
        style={{ backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
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
          {centreName && (
            <span className="max-w-[140px] truncate text-[11px] font-semibold text-slate-300">{centreName}</span>
          )}
        </div>
      </div>

      {/* ── Desktop Sidebar ── */}
      <aside
        ref={desktopScrollRef}
        className="hidden w-[220px] shrink-0 overflow-y-auto bg-slate-900 text-foreground [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex md:flex-col"
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-4">
          <BrandMark compact className="[&_*]:text-white" />
          {centreName && (
            <p className="mt-3 truncate text-[13px] font-black leading-tight text-white">{centreName}</p>
          )}
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[9px] font-semibold text-slate-300">
              {roleLabel}
            </span>
            {subscriptionTier && (
              <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 text-[9px] font-semibold text-teal-300 capitalize">
                {subscriptionTier === 'standard' ? '⭐ Growth' : subscriptionTier === 'premium' ? '🚀 Pro' : subscriptionTier}
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-white/[0.06]" />

        {/* Navigation */}
        <nav className="flex-1 space-y-0 px-3 py-4" aria-label="ECD portal navigation">
          {groupedPrimaryItems.map((bucket) => (
            <div key={bucket.group} className="mb-4">
              <p className="mb-1 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">
                {GROUP_LABELS[bucket.group]}
              </p>
              {bucket.items.map((item) => renderNavItem(item))}
            </div>
          ))}

          {settingsItem && !settingsItem.comingSoon && (
            <div className="mb-4">
              <div className="mx-3 mb-3 h-px bg-white/[0.06]" />
              <p className="mb-1 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">Account</p>
              {renderNavItem(settingsItem)}
            </div>
          )}

          {comingSoonItems.length > 0 && (
            <div className="mb-4">
              <div className="mx-3 mb-3 h-px bg-white/[0.06]" />
              <p className="mb-1 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">Coming Soon</p>
              {comingSoonItems.map((item) => renderNavItem(item))}
            </div>
          )}

          {lockedByTier.length > 0 && (
            <div className="mb-4">
              <div className="mx-3 mb-3 h-px bg-white/[0.06]" />
              <Link
                href="/ecd/billing"
                className="mx-1 mb-2 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 transition-colors hover:bg-amber-500/15"
              >
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <div>
                  <p className="text-[10px] font-black text-amber-300">Unlock {lockedByTier.length} more</p>
                  <p className="text-[9px] text-amber-400/70">Upgrade plan</p>
                </div>
              </Link>
              {lockedByTier.map((item) => (
                <Link key={item.href} href="/ecd/billing"
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 opacity-50 hover:opacity-70 transition-opacity"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                    <item.icon className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                  <span className="flex-1 truncate text-[12px] font-medium text-amber-300/80">{item.label}</span>
                  <Lock className="h-3 w-3 text-amber-500/60" />
                </Link>
              ))}
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="mt-auto space-y-2 px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Link
            href="/ecd/support"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-white/5 border border-white/10 py-2 text-[11px] font-semibold text-slate-400 transition-all hover:bg-white/10 hover:text-slate-200"
          >
            Help &amp; Support
          </Link>
          <a
            href="https://wa.me/27685356430?text=Hi%20Mandla%2C%20I%20need%20help%20with%20CentreConnect"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-500/15 border border-emerald-500/20 py-2 text-[11px] font-semibold text-emerald-400 transition-all hover:bg-emerald-500/25"
          >
            💬 WhatsApp support
          </a>
          <div className="rounded-xl bg-white/5 px-3 py-2">
            <p className="truncate text-[10px] text-slate-500">{userEmail}</p>
          </div>
          <SignOutButton
            redirectTo="/"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 text-[11px] font-medium text-slate-400 transition-all hover:bg-white/10 hover:text-slate-200"
          />
        </div>
      </aside>
    </>
  )
}
