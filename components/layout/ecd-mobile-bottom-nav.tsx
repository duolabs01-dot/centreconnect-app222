'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, UserCheck, ClipboardList, MessagesSquare, FileCheck } from 'lucide-react'

const ECD_BOTTOM_TABS = [
  { href: '/ecd/dashboard',     label: 'Home',       icon: LayoutDashboard,  badgeKey: null },
  { href: '/ecd/attendance',    label: 'Attendance', icon: UserCheck,         badgeKey: null },
  { href: '/ecd/applications',  label: 'Admissions', icon: ClipboardList,     badgeKey: '/ecd/applications' },
  { href: '/ecd/communications',label: 'Messages',   icon: MessagesSquare,    badgeKey: '/ecd/communications' },
  { href: '/ecd/dsd-export',    label: 'DOE Report', icon: FileCheck,         badgeKey: null },
]

type EcdMobileBottomNavProps = {
  pathname: string
  attentionBadges?: Partial<Record<string, number>>
}

export function EcdMobileBottomNav({ pathname, attentionBadges = {} }: EcdMobileBottomNavProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex justify-center md:hidden">
      <div className="pointer-events-auto mb-[calc(0.5rem+env(safe-area-inset-bottom))] w-full max-w-[480px] px-2">
        <nav
          className="flex items-center rounded-[1.5rem] border border-white/30 bg-slate-900/90 px-1 py-1 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
        >
          {ECD_BOTTOM_TABS.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
            const Icon = tab.icon
            const badge = tab.badgeKey ? (attentionBadges[tab.badgeKey] ?? 0) : 0
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.25rem] px-1 transition-all duration-200',
                  active
                    ? 'bg-teal-500/20 text-teal-300'
                    : 'text-slate-400 hover:text-slate-200'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <div className="relative">
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.5 : 1.8}
                    className={cn(
                      'transition-all',
                      active && 'drop-shadow-[0_0_8px_rgba(45,212,191,0.6)]'
                    )}
                  />
                  {badge > 0 && !active && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-1 ring-slate-900">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className={cn(
                  'text-[9px] font-semibold uppercase tracking-[0.06em] leading-none',
                  active ? 'text-teal-300' : 'text-slate-500'
                )}>
                  {tab.label}
                </span>
                {active && (
                  <span className="absolute bottom-1.5 h-0.5 w-5 rounded-full bg-teal-400 opacity-80" />
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
