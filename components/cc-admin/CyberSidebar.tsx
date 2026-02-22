// components/cc-admin/CyberSidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { SignOutButton } from './SignOutButton'
import { BrandMark } from './BrandMark'
import { LayoutDashboard, Users, CreditCard, ShieldCheck, BarChart3, LifeBuoy } from 'lucide-react'

const NAV_ITEMS = [
     { href: '/admin/command', label: 'Command',    icon: LayoutDashboard },  { href: '/admin/tenants',   label: 'Centres',    icon: ShieldCheck },
  { href: '/admin/revenue',   label: 'Revenue',    icon: CreditCard },
  { href: '/admin/users',     label: 'Operatives', icon: Users },
  { href: '/admin/analytics', label: 'Neural',     icon: BarChart3 },
  { href: '/admin/support',   label: 'Relay',      icon: LifeBuoy },
]

export function CyberSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className="flex flex-col h-full w-64 shrink-0 bg-cyber-bg border-r border-white/10 scanline">
      {/* Brand area */}
      <div className="px-6 py-8 border-b border-white/5">
        <BrandMark compact className="hover:opacity-80 transition-opacity" />
        <div className="mt-4">
          <p className="font-orbitron text-[10px] uppercase tracking-[0.3em] text-cyber-cyan opacity-70">
            System Admin
          </p>
          <p className="font-orbitron text-xs font-bold text-white tracking-widest mt-1">
            v1.0.4-PROD
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="px-4 mt-8 mb-2">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.25em] px-2">
          Core Protocols
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 relative overflow-hidden",
                active
                  ? "bg-white/10 text-white shadow-[0_0_15px_rgba(0,242,255,0.1)]"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-0 bottom-0 w-0.5 bg-cyber-cyan"
                  initial={{ height: 0 }}
                  animate={{ height: '100%' }}
                />
              )}
              <item.icon className={cn(
                "w-4 h-4 shrink-0 transition-colors",
                active ? "text-cyber-cyan" : "group-hover:text-white"
              )} />
              <span className={cn("font-orbitron tracking-wider", active ? "holo-text" : "")}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto border-t border-white/5 p-4 space-y-4">
        <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
          <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-1">Authenticated</p>
          <p className="text-[11px] font-mono text-cyber-cyan truncate">{userEmail}</p>
        </div>
        <SignOutButton redirectTo="/" className="w-full font-orbitron text-[10px] tracking-widest uppercase border-white/10 hover:bg-white/10 hover:text-white" />
      </div>
    </aside>
  )
}
