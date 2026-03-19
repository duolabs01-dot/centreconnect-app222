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
  admin: 'Admin',
  grow: 'Grow',
  settings: 'Settings',
  core: 'Core',
  insights: 'Insights',
  reliability: 'Reliability',
  support: 'Support',
  daily_operations: 'Daily Operations',
  admissions: 'Admissions',
  finance: 'Finance',
  communication: 'Communication',
  compliance_team: 'Compliance & Team',
  growth_tools: 'Growth Tools',
  coming_soon: 'Coming Soon',
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
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500"
          aria-disabled="true"
        >
          <item.icon className="h-5 w-5 shrink-0 text-slate-400" />
          <span className="flex-1 truncate">{item.label}</span>
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
        onClick={() => setOpen(false)}
        className={cn(
          'mobile-nav-item flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold',
          active
            ? 'border-teal-200 bg-teal-50 text-teal-700'
            : 'border-transparent text-slate-600 hover:border-teal-100 hover:bg-teal-50 hover:text-teal-700'
        )}
      >
        <item.icon className={cn('h-5 w-5 shrink-0', active ? 'text-teal-600' : 'text-slate-400')} />
        <span className="flex-1 truncate">
          <span className="block truncate">{item.label}</span>
          {appInsight ? <span className="mt-0.5 block truncate text-[10px] font-semibold text-teal-700">{appInsight}</span> : null}
        </span>
        {badgeCount > 0 ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        ) : null}
      </Link>
    )
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="mobile-nav-item flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 hover:bg-cyan-50 hover:text-cyan-600 md:hidden">
          <Menu className="h-6 w-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0 border-none bg-white">
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-4">
            <nav className="space-y-1">
              {visibleNav.map((item, index) => {
                const prevItem = visibleNav[index - 1]
                const showGroupLabel = item.group && item.group !== prevItem?.group
                
                return (
                  <React.Fragment key={item.href}>
                    {showGroupLabel && (
                      <p className="mb-2 mt-4 px-4 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        {GROUP_LABELS[item.group!] ?? item.group}
                      </p>
                    )}
                    {renderNavItem(item)}
                  </React.Fragment>
                )
              })}
            </nav>
          </div>

          <div className="shrink-0 p-4 border-t border-slate-50 bg-slate-50">
            <div className="mb-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current tier</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{tierLabel}</p>
                <p className="mt-1 text-xs text-slate-500">Billing and website tools follow this plan.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/ecd/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Settings
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/ecd/billing"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Billing
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <a
                href="https://wa.me/27685356430?text=Hi%20Mandla%2C%20I%20need%20help%20with%20CentreConnect"
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-green-900/20 transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>💬</span>
                WhatsApp support
              </a>
            </div>
            {userEmail && (
              <div className="mb-4 px-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account</p>
                <p className="truncate text-xs text-slate-700 font-bold mt-1">{userEmail}</p>
              </div>
            )}
            {type === 'admin' ? (
              <AdminSignOutButton
                redirectTo="/"
                className="w-full bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 font-bold rounded-xl py-2.5 shadow-sm text-sm"
              />
            ) : (
              <EcdSignOutButton
                redirectTo="/"
                className="w-full bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 font-bold rounded-xl py-2.5 shadow-sm text-sm"
              />
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
