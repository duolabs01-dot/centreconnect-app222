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
  { href: '/admin/command', label: 'Command',    icon: LayoutDashboard },  
  { href: '/admin/tenants',   label: 'Centres',    icon: ShieldCheck },
  { href: '/admin/revenue',   label: 'Revenue',    icon: CreditCard },
  { href: '/admin/users',     label: 'Operatives', icon: Users },
  { href: '/admin/analytics', label: 'Neural',     icon: BarChart3 },
  { href: '/admin/support',   label: 'Relay',      icon: LifeBuoy },
]

export function CyberSidebar({ userEmail, onSelect }: { userEmail: string, onSelect?: () => void }) {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className="flex flex-col h-full w-64 shrink-0 bg-admin-bg border-r border-admin-border">
      {/* Brand area */}
      <div className="px-6 py-8 border-b border-admin-border">
        <BrandMark compact className="invert brightness-200 hover:opacity-80 transition-opacity" />
        <div className="mt-4">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-admin-accent opacity-70">
            System Admin
          </p>
          <p className="text-xs font-bold text-admin-text tracking-widest mt-1">
            v1.0.4-PROD
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="px-4 mt-8 mb-2">
        <p className="text-[9px] font-black text-admin-text-muted uppercase tracking-[0.25em] px-2">
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
              onClick={onSelect}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 relative overflow-hidden",
                active
                  ? "text-admin-accent bg-admin-accent-glow border-l-2 border-admin-accent shadow-float"
                  : "text-admin-text-muted hover:text-admin-text hover:bg-admin-surface-hover"
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active-admin"
                  className="absolute left-0 top-0 bottom-0 w-0.5 bg-admin-accent"
                  initial={{ height: 0 }}
                  animate={{ height: '100%' }}
                />
              )}
              <item.icon className={cn(
                "w-4 h-4 shrink-0 transition-colors",
                active ? "text-admin-accent" : "text-admin-text-muted group-hover:text-admin-text"
              )} />
              <span className={cn("tracking-widest uppercase text-[10px]", active ? "text-admin-accent" : "")}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto border-t border-admin-border p-4 space-y-4">
        <div className="rounded-xl border border-admin-border bg-admin-surface px-4 py-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-admin-text-muted mb-1">Authenticated</p>
          <p className="text-[11px] font-mono text-admin-accent truncate">{userEmail}</p>
        </div>
        <SignOutButton redirectTo="/" className="w-full bg-admin-accent text-black hover:bg-admin-accent-hover font-black text-[10px] tracking-widest uppercase rounded-xl h-11" />
      </div>
    </aside>
  )
}
