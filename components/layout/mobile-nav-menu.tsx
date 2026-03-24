'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Menu, X, LogOut, ArrowRight, LucideIcon } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { SignOutButton as EcdSignOutButton } from '@/components/ecd/SignOutButton'
import { SignOutButton as AdminSignOutButton } from '@/components/cc-admin/SignOutButton'
import { useBottomNav } from '@/lib/context/BottomNavProvider'
import { useEffect } from 'react'
import { getInternalTierLabel, toInternalTier } from '@/lib/billing/plans'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  group?: string
  comingSoon?: boolean
  adminOnly?: boolean
  supervisorAllowed?: boolean
}

type MobileNavMenuProps = {
  items: NavItem[]
  userEmail?: string | null
  roleLabel?: string
  userRole?: string | null
  attentionBadges?: Partial<Record<string, number>>
  subscriptionTier?: string | null
  type?: 'ecd' | 'admin' | 'public'
}

const GROUP_LABELS: Record<string, string> = {
  daily_ops: 'Daily Ops',
  admin: 'Management',
  grow: 'Grow',
  settings: 'Account',
}

export function MobileNavMenu({
  items,
  userEmail,
  roleLabel,
  userRole,
  subscriptionTier,
  attentionBadges = {},
  type = 'ecd'
}: MobileNavMenuProps) {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  const { setVisible } = useBottomNav()
  const tierLabel = getInternalTierLabel(toInternalTier(subscriptionTier, 'basic'))

  useEffect(() => {
    setVisible(!open)
    return () => setVisible(true)
  }, [open, setVisible])

  const visibleNav = items.filter((item) => {
    if (type === 'public') return true
    if (userRole === 'ecd_admin' || userRole === 'platform_admin') return true
    if (userRole === 'ecd_supervisor') return item.supervisorAllowed === true && !item.adminOnly
    return !item.adminOnly
  })

  const renderNavItem = (item: NavItem) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
    const badgeCount = attentionBadges[item.href] ?? 0
    const stale72hCount = attentionBadges['/ecd/applications:stale72h'] ?? 0
    const partialApplicationsCount = attentionBadges['/ecd/applications:partial'] ?? 0
    const appInsight =
      item.href === '/ecd/applications'
        ? stale72hCount > 0
          ? `${stale72hCount} older than 72h - prioritize`
          : partialApplicationsCount > 0
            ? `${partialApplicationsCount} partial applications`
            : null
        : null

    if (item.comingSoon) {
      return (
        <div
          key={item.href}
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 opacity-40"
          aria-disabled="true"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5">
            <item.icon className="h-3.5 w-3.5 text-slate-500" />
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
        onClick={() => setOpen(false)}
        className={cn(
          'group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12px] font-medium transition-all duration-150',
          active
            ? 'bg-teal-500/15 text-teal-300'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        )}
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-slate-300 transition-colors hover:bg-white/15 hover:text-white md:hidden">
          <Menu className="h-6 w-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0 border-none bg-slate-900 z-[100]">
        <div className="flex flex-col h-full pt-14">
          <div className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <nav className="space-y-0.5">
              {visibleNav.map((item, index) => {
                const prevItem = visibleNav[index - 1]
                const showGroupLabel = item.group && item.group !== prevItem?.group

                return (
                  <React.Fragment key={item.href}>
                    {showGroupLabel && (
                      <p className="mb-1 mt-4 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        {GROUP_LABELS[item.group!] ?? item.group}
                      </p>
                    )}
                    {renderNavItem(item)}
                  </React.Fragment>
                )
              })}
            </nav>
          </div>

          <div className="shrink-0 px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Plan</p>
                <p className="truncate text-xs font-bold text-teal-300">{tierLabel}</p>
              </div>
              <Link
                href="/ecd/billing"
                onClick={() => setOpen(false)}
                className="flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 transition-colors hover:bg-white/15"
              >
                Upgrade
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <a
              href="https://wa.me/27685356430?text=Hi%20Mandla%2C%20I%20need%20help%20with%20CentreConnect"
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="mb-2 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-400"
            >
              💬 WhatsApp support
            </a>
            {userEmail && (
              <div className="mb-2 rounded-xl bg-white/5 px-3 py-2">
                <p className="truncate text-[10px] text-slate-500">{userEmail}</p>
              </div>
            )}
            {type === 'admin' ? (
              <AdminSignOutButton
                redirectTo="/"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2 text-[11px] font-medium text-slate-400 transition-all hover:bg-white/10 hover:text-slate-200"
              />
            ) : (
              <EcdSignOutButton
                redirectTo="/"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2 text-[11px] font-medium text-slate-400 transition-all hover:bg-white/10 hover:text-slate-200"
              />
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
