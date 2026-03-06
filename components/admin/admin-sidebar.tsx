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
  Activity,
  ScrollText,
  AlertTriangle,
  Cpu,
  LifeBuoy,
  Mail
} from 'lucide-react'
import { BrandMark } from '@/components/cc-admin/BrandMark'
import { SignOutButton } from '@/components/cc-admin/SignOutButton'
import { MobileNavMenu } from '@/components/layout/mobile-nav-menu'

const NAV_ITEMS = [
  { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard, id: 'dash' },
  { label: 'ECD Network', href: '/admin/tenants', icon: Building2, id: 'ecd' },
  { label: 'Directory', href: '/admin/users', icon: Users, id: 'users' },
  { label: 'Revenue Ops', href: '/admin/revenue', icon: CreditCard, id: 'rev' },
  { label: 'Webhook Failures', href: '/admin/webhook-failures', icon: AlertTriangle, id: 'whf' },
  { label: 'Audit Trail', href: '/admin/audit-trail', icon: ScrollText, id: 'audit' },
  { label: 'Platform Stats', href: '/admin/analytics', icon: BarChart3, id: 'stat' },
  { label: 'Command Tower', href: '/admin/command', icon: ShieldCheck, id: 'cmd' },
  { label: 'Invites', href: '/admin/invites', icon: Mail, id: 'invites' },
  { label: 'Support Relay', href: '/admin/support', icon: LifeBuoy, id: 'sup' },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile Top Header - Unified look */}
      <div className="md:hidden fixed top-0 inset-x-0 h-16 bg-[#080B13]/80 backdrop-blur-md border-b border-white/5 z-40 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MobileNavMenu 
            items={NAV_ITEMS} 
            type="admin"
            roleLabel="Platform Admin"
            userRole="platform_admin"
          />
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white">
            <Cpu className="w-4 h-4 animate-pulse" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500/80 leading-none">CentreConnect</p>
        </div>
      </div>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-72 flex-col bg-[#080B13] border-r border-white/5 z-50 overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 -left-20 w-40 h-80 bg-cyan-500/5 blur-[120px]" />
        
        {/* Logo & Brand Header */}
        <div className="relative p-8 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500/80 leading-none">CentreConnect</p>
            <p className="text-sm font-black text-white tracking-tighter mt-1">Admin OS v4.1</p>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 px-4 py-8 relative">
          <p className="px-4 mb-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">Platform Control</p>
          <nav className="space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[13px] font-black transition-all duration-300 relative",
                    isActive 
                      ? "bg-white/5 text-white shadow-xl shadow-black/20" 
                      : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]"
                  )}
                >
                  {/* Active Indicator Line */}
                  {isActive && (
                    <div className="absolute left-0 w-1 h-5 bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,1)]" />
                  )}
                  
                  <item.icon className={cn(
                    "w-5 h-5 transition-all duration-300", 
                    isActive ? "text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" : "text-slate-600 group-hover:text-slate-400"
                  )} />
                  <span className="tracking-tight">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Sidebar Footer Info */}
        <div className="p-4 space-y-3 relative">
          <div className="mx-2 p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-black border border-white/5 shadow-inner">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-3 h-3 text-emerald-500" />
              <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">Regional Nodes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white tracking-tight">Gauteng Hub</span>
              <span className="text-[10px] font-black text-emerald-500">OPTIMAL</span>
            </div>
          </div>
          
          <div className="px-4 py-2 flex items-center justify-between border-t border-white/5 pt-4">
            <button className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all">
              <Settings className="w-5 h-5" />
            </button>
            <SignOutButton
              redirectTo="/"
              variant="ghost"
              className="h-9 rounded-lg px-3 text-xs font-bold text-rose-500/80 hover:bg-rose-500/10 hover:text-rose-400"
            />
          </div>
        </div>
      </aside>
    </>
  )
}
