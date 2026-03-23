'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, LifeBuoy, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SignOutButton } from '@/components/cc-admin/SignOutButton'
import { MobileNavMenu } from '@/components/layout/mobile-nav-menu'
import { ADMIN_NAV_ITEMS } from './admin-nav'
import { Badge } from '@/components/ui/badge'

const QA_ADMIN_CRITICAL_ROUTES = ['/admin/parent-reliability']

export function AdminSidebar() {
  const pathname = usePathname()
  const mobileItems = ADMIN_NAV_ITEMS.map((item) => ({
    ...item,
    icon:
      item.icon ??
      (item.href === '/admin/tenants'
        ? Building2
        : item.href === '/admin/support'
          ? LifeBuoy
          : Sparkles),
    group: 'core',
  }))

  return (
    <>
      <div className="md:hidden fixed top-0 inset-x-0 h-16 bg-[var(--cyber-bg)]/85 backdrop-blur-md border-b border-white/10 z-40 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MobileNavMenu items={mobileItems} type="admin" roleLabel="Platform Admin" userRole="platform_admin" />
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/25">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-300/90 leading-none">CentreConnect</p>
            <p className="text-[10px] text-slate-300">Platform Admin</p>
          </div>
        </div>
      </div>

      <aside className="hidden md:flex fixed inset-y-0 left-0 w-72 flex-col bg-gradient-to-b from-[var(--cyber-bg)] to-slate-950 border-r border-white/5 z-50">
        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-400/80">CentreConnect</p>
              <p className="text-sm font-bold text-white/90">Platform Admin</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500 leading-relaxed">One place to run company, product, and operations.</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {ADMIN_NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-teal-500/20 to-teal-500/10 text-teal-200 border border-teal-500/25 shadow-sm shadow-teal-500/10'
                    : 'text-slate-400 border border-transparent hover:bg-white/[0.03] hover:text-slate-200'
                )}
              >
                {Icon && <Icon className="h-4 w-4 shrink-0" />}
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/5">
          {/* Compact pilot badge */}
          <Badge variant="outline" className="w-full justify-start px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider border-amber-500/30 bg-amber-500/5 text-amber-300/80 hover:bg-amber-500/10">
            <span className="mr-2">●</span>
            Pilot: Bajabulile + Sakhisizwe
          </Badge>

          {/* Sign out */}
          <div className="mt-3 flex items-center justify-end">
            <SignOutButton
              redirectTo="/"
              variant="ghost"
              className="h-9 rounded-lg px-3 text-xs font-bold text-rose-400/70 hover:bg-rose-500/10 hover:text-rose-300"
            />
          </div>
        </div>
      </aside>
    </>
  )
}
