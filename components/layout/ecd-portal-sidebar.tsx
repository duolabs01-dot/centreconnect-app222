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
import { ArrowRight, Lock, Sparkles } from 'lucide-react'
import { getInternalTierLabel, toInternalTier, type InternalTier } from '@/lib/billing/plans'

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
  daily_ops: '',
  admin: '',
  grow: '',
  settings: '',
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
    if (saved !== null) {
      element.scrollTop = saved
    }

    const onScroll = () => {
      writeSavedSidebarScroll(element.scrollTop)
    }

    element.addEventListener('scroll', onScroll, { passive: true })
    return () => element.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const element = desktopScrollRef.current
    if (!element) return

    const saved = readSavedSidebarScroll()
    if (saved !== null) {
      element.scrollTop = saved
    }
  }, [pathname])

  const tier = toInternalTier(subscriptionTier, 'basic')
  const tierLabel = getInternalTierLabel(tier)
  const tierRank: Record<InternalTier, number> = { basic: 1, standard: 2, premium: 3 }

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
    (item) => item.minTier && tierRank[tier] < tierRank[item.minTier]
  )

  const visibleNav = roleEligibleNav.filter(
    (item) => !item.minTier || tierRank[tier] >= tierRank[item.minTier]
  )

  const settingsItem = visibleNav.find((item) => item.group === 'settings') ?? null
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
        <div key={item.href} className="group relative flex items-center gap-2.5 rounded-2xl border border-border bg-slate-50 px-3.5 py-2" aria-disabled="true">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-200 text-slate-500">
            <item.icon className="h-4 w-4 shrink-0" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold tracking-tight text-slate-700">{item.label}</p>
          </div>
          <span className="inline-flex items-center rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
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
          if (element) {
            writeSavedSidebarScroll(element.scrollTop)
          }
        }}
        className={cn(
          'group relative flex items-center gap-2.5 rounded-2xl px-3.5 py-2 text-[13px] font-bold tracking-tight transition-colors duration-200',
          active
            ? 'border border-teal-200 bg-teal-50/90 text-teal-900 shadow-sm'
            : 'border border-transparent text-slate-700 hover:border-teal-100 hover:bg-teal-50/60 hover:text-teal-800'
        )}
        aria-current={active ? 'page' : undefined}
      >
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-xl transition-colors',
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
      {/* Mobile Top Header */}
      <div className="fixed inset-x-0 top-0 z-[90] flex h-14 items-center justify-between border-b border-border bg-card px-3 md:hidden">
        <div className="flex items-center gap-2">
          <MobileNavMenu
            items={visibleNav}
            userEmail={userEmail}
            roleLabel={roleLabel}
            userRole={userRole}
            subscriptionTier={subscriptionTier}
            attentionBadges={attentionBadges}
          />
          <BrandMark compact className="brightness-100 h-7" />
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">{roleLabel}</p>
        </div>
      </div>

      <aside
        ref={desktopScrollRef}
        className="hidden h-screen w-72 shrink-0 overflow-y-auto border-r border-border bg-card px-6 py-6 text-foreground shadow-[var(--shadow-elevation-1)] [scrollbar-width:none] hover:[scrollbar-width:thin] [&::-webkit-scrollbar]:w-0 hover:[&::-webkit-scrollbar]:w-2 hover:[&::-webkit-scrollbar-thumb]:rounded-full md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex md:flex-col"
      >
        {/* Header */}
        <div className="px-4 mb-3">
          <BrandMark compact className="brightness-100" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-teal-50 border border-teal-100 text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">{roleLabel}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-1 space-y-1.5" aria-label="ECD portal navigation">
          {groupedPrimaryItems.map((bucket) => (
            <Fragment key={bucket.group}>
              <p className="mb-2 mt-4 px-4 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500/80">
                {GROUP_LABELS[bucket.group]}
              </p>
              {bucket.items.map((item) => renderNavItem(item))}
            </Fragment>
          ))}

          {comingSoonItems.length > 0 ? (
            <Fragment>
              <div className="my-4 px-4">
                <div className="h-px w-full bg-border" />
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
                <div className="h-px w-full bg-border" />
              </div>
              {renderNavItem(settingsItem)}
            </Fragment>
          ) : null}

          {lockedByTier.length > 0 ? (
            <Fragment>
              <div className="my-4 px-4">
                <div className="h-px w-full bg-border" />
              </div>
              <p className="mb-2 px-4 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500/80">
                Upgrade to unlock
              </p>
              {lockedByTier.map((item) => (
                <div key={item.href} className="group relative flex items-center gap-2.5 rounded-2xl border border-border bg-slate-50 px-3.5 py-2 opacity-85">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-200 text-slate-500">
                    <item.icon className="h-4 w-4 shrink-0" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold tracking-tight text-slate-700">{item.label}</p>
                    <p className="text-[10px] font-semibold text-slate-500">Requires {item.minTier === 'standard' ? 'Growth' : 'Pro'}</p>
                  </div>
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
              ))}
            </Fragment>
          ) : null}
        </nav>

        {/* Bottom card — tier (clickable → billing), WhatsApp, sign out */}
        <div className="mt-8 shrink-0 rounded-[2rem] border border-border bg-card px-5 py-4 shadow-[var(--shadow-elevation-1)]">
          {centreName && (
            <p className="truncate text-xs font-black text-teal-700 mb-1">{centreName}</p>
          )}
          <p className="truncate text-[10px] text-slate-400 mb-3">{userEmail ?? ''}</p>

          {/* Tier — clickable to billing */}
          <Link
            href="/ecd/billing"
            className="flex items-center justify-between rounded-2xl border border-teal-200 bg-teal-50 px-4 py-2.5 mb-3 text-xs font-bold text-teal-700 transition-colors hover:bg-teal-100 hover:border-teal-300"
          >
            <span className="font-black uppercase tracking-[0.14em] text-[10px] text-teal-600">Plan</span>
            <span className="flex items-center gap-1.5">
              {tierLabel}
              <ArrowRight className="h-3 w-3" />
            </span>
          </Link>

          {/* WhatsApp support */}
          <Link
            href="https://wa.me/27685356430?text=Hi%20Mandla%2C%20I%20need%20help%20with%20CentreConnect"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-2xl bg-emerald-500 py-2.5 mb-3 text-xs font-black text-white shadow-lg shadow-green-900/20 transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>💬</span>
            WhatsApp support
          </Link>

          <SignOutButton
            redirectTo="/"
            className="w-full rounded-3xl border border-border bg-card py-2.5 text-sm font-bold text-foreground shadow-[var(--shadow-elevation-1)] transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
          />
        </div>
      </aside>
    </>
  )
}
