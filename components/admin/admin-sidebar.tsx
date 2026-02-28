'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  CreditCard, 
  BarChart3, 
  ShieldCheck, 
  Settings,
  LogOut
} from 'lucide-react'
import { BrandMark } from '@/components/cc-admin/BrandMark'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Centres', href: '/admin/tenants', icon: Building2 },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Revenue', href: '/admin/revenue', icon: CreditCard },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Security', href: '/admin/command', icon: ShieldCheck },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col bg-[#0F1219] border-r border-white/5 z-50">
        <div className="p-6 flex items-center gap-3">
          <BrandMark compact className="invert brightness-200" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500">Platform</p>
            <p className="text-xs font-bold text-white tracking-widest mt-0.5">Admin Console</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                  isActive 
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.1)]" 
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-cyan-400" : "text-slate-500")} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
          <button className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
          <button className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition-all">
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0F1219]/95 border-t border-white/5 backdrop-blur-xl z-50 flex items-center justify-around px-2 md:hidden">
        {NAV_ITEMS.slice(0, 4).map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all relative",
                isActive ? "text-cyan-400" : "text-slate-500"
              )}
            >
              {isActive && <div className="absolute top-0 h-0.5 w-8 bg-cyan-400 rounded-b-full shadow-[0_0_10px_rgba(6,182,212,0.5)]" />}
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
