'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, LifeBuoy, Settings, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SignOutButton } from '@/components/cc-admin/SignOutButton'
import { MobileNavMenu } from '@/components/layout/mobile-nav-menu'
import { ADMIN_NAV_ITEMS, ADMIN_NAV_SECTIONS } from './admin-nav'

const QA_ADMIN_CRITICAL_ROUTES = ['/admin/parent-reliability']

export function AdminSidebar() {
  const pathname = usePathname()
  const mobileItems = ADMIN_NAV_ITEMS.map((item) => ({
    ...item,
    icon:
      item.href === '/admin/tenants'
        ? Building2
        : item.href === '/admin/support'
        ? LifeBuoy
        : Sparkles,
    group: 'core',
  }))

  return (
    <>
      <div className="md:hidden fixed top-0 inset-x-0 h-16 bg-[#080B13]/85 backdrop-blur-md border-b border-white/10 z-40 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MobileNavMenu items={mobileItems} type="admin" roleLabel="Platform Admin" userRole="platform_admin" />
          <div className="h-8 w-8 rounded-lg bg-teal-600/90 flex items-center justify-center text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-300/90 leading-none">CentreConnect</p>
            <p className="text-[10px] text-slate-300">Platform Admin</p>
          </div>
        </div>
      </div>

      <aside className="hidden md:flex fixed inset-y-0 left-0 w-72 flex-col bg-[#080B13] border-r border-white/10 z-50" data-qa-critical-routes={QA_ADMIN_CRITICAL_ROUTES.join(',')}>
        <div className="p-6 border-b border-white/10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-300">CentreConnect</p>
          <p className="mt-1 text-lg font-semibold text-white">Platform Admin</p>
          <p className="mt-1 text-xs text-slate-400">One place to run company, product, and operations.</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          {ADMIN_NAV_SECTIONS.map((section) => (
            <section key={section.id} className="space-y-2">
              <p className="px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{section.label}</p>
              <nav className="space-y-1.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                        isActive
                          ? 'bg-teal-500/15 text-teal-200 border border-teal-500/30'
                          : 'text-slate-300 border border-transparent hover:bg-white/5 hover:text-white'
                      )}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </nav>
            </section>
          ))}
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-200">Current pilot truth</p>
            <p className="mt-1 text-xs text-amber-100">2 real centres: Bajabulile + Sakhisizwe</p>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors" aria-label="Settings">
              <Settings className="w-5 h-5" />
            </button>
            <SignOutButton
              redirectTo="/"
              variant="ghost"
              className="h-9 rounded-lg px-3 text-xs font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
            />
          </div>
        </div>
      </aside>
    </>
  )
}
