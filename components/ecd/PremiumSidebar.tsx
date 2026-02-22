// components/ecd/PremiumSidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BrandMark } from './BrandMark'
import { SignOutButton } from './SignOutButton'
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  MessageSquare, 
  CreditCard, 
  Settings, 
  HelpCircle,
  Truck,
  Globe,
  Briefcase,
  GitFork, // For Children Journey (Pipeline)
  Megaphone, // For Announcements
  Store // For Marketplace
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/ecd/dashboard',      label: 'Today',        icon: LayoutDashboard },
  { href: '/ecd/applications',   label: 'Enrolments',   icon: Users },
  { href: '/ecd/pipeline',       label: 'Children Journey', icon: GitFork }, // Added
  { href: '/ecd/calendar',       label: 'Calendar',     icon: Calendar },
  { href: '/ecd/communications', label: 'Messages',     icon: MessageSquare },
  { href: '/ecd/billing',        label: 'Billing',      icon: CreditCard },
  { href: '/ecd/transport',      label: 'Transport',    icon: Truck },
  { href: '/ecd/announcements',  label: 'Announcements',icon: Megaphone }, // Added
  { href: '/ecd/website',        label: 'Website',      icon: Globe },
  { href: '/ecd/marketplace',    label: 'Marketplace',  icon: Store }, // Added
  { href: '/ecd/employment',     label: 'Staffing',     icon: Briefcase },
  { href: '/ecd/profile',        label: 'Settings',     icon: Settings },
  { href: '/ecd/support',        label: 'Support',      icon: HelpCircle },
]

export function PremiumSidebar({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className="flex flex-col h-full w-64 shrink-0 bg-white/40 border-r border-slate-200/60 backdrop-blur-xl">
      <div className="px-6 py-8 border-b border-slate-200/40">
        <BrandMark compact />
        <p className="mt-2 text-[10px] font-bold text-cyan-600 uppercase tracking-[0.15em]">
          Premium Infrastructure
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                active
                  ? "bg-cyan-500/10 text-cyan-700 shadow-sm ring-1 ring-cyan-500/20"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
              )}
            >
              <item.icon className={cn(
                "w-4 h-4 transition-colors",
                active ? "text-cyan-600" : "text-slate-400 group-hover:text-slate-600"
              )} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-slate-200/40">
        <div className="bg-slate-100/50 rounded-2xl p-4 mb-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Active User</p>
          <p className="text-xs font-bold text-slate-700 truncate">{userEmail ?? 'Authenticated'}</p>
        </div>
        <SignOutButton redirectTo="/" className="w-full rounded-xl border-slate-200 text-slate-600 hover:bg-white hover:text-cyan-600 transition-all" />
      </div>
    </aside>
  )
}
