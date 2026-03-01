'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Menu, X, LogOut, LucideIcon } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { BrandMark } from '@/components/ecd/BrandMark'
import { SignOutButton } from '@/components/ecd/SignOutButton'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  group?: string
  adminOnly?: boolean
  supervisorAllowed?: boolean
}

type MobileNavMenuProps = {
  items: NavItem[]
  userEmail?: string | null
  roleLabel?: string
  userRole?: string | null
  attentionBadges?: Partial<Record<string, number>>
  type?: 'ecd' | 'admin' | 'public'
}

const GROUP_LABELS: Record<string, string> = {
  daily: 'Daily Operations',
  operations: 'Operations',
  growth: 'Growth & Visibility',
  admin: 'Admin',
}

export function MobileNavMenu({
  items,
  userEmail,
  roleLabel,
  userRole,
  attentionBadges = {},
  type = 'ecd'
}: MobileNavMenuProps) {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)

  const visibleNav = items.filter((item) => {
    if (type === 'public') return true
    if (userRole === 'ecd_admin' || userRole === 'platform_admin') return true
    if (userRole === 'ecd_supervisor') return item.supervisorAllowed === true && !item.adminOnly
    return !item.adminOnly
  })

  const renderNavItem = (item: NavItem) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
    const badgeCount = attentionBadges[item.href] ?? 0
    
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        className={cn(
          'flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-all rounded-xl',
          active
            ? 'text-teal-700 bg-teal-50'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
        )}
      >
        <item.icon className={cn('w-5 h-5 shrink-0', active ? 'text-teal-600' : 'text-slate-400')} />
        <span className="flex-1 truncate">{item.label}</span>
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
        <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 hover:bg-cyan-50 hover:text-cyan-600 transition-all md:hidden">
          <Menu className="h-6 w-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0 border-none bg-white">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-6 border-b border-slate-50 text-left">
            <div className="flex items-center justify-between">
              <div>
                <BrandMark compact className="brightness-100" />
                {roleLabel && (
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">
                    {roleLabel}
                  </p>
                )}
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <nav className="space-y-1">
              {visibleNav.map((item, index) => {
                const prevItem = visibleNav[index - 1]
                const showGroupLabel = item.group && item.group !== prevItem?.group
                
                return (
                  <React.Fragment key={item.href}>
                    {showGroupLabel && (
                      <p className="mt-4 mb-2 px-4 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        {GROUP_LABELS[item.group!] ?? item.group}
                      </p>
                    )}
                    {renderNavItem(item)}
                  </React.Fragment>
                )
              })}
            </nav>
          </div>

          <div className="p-4 border-t border-slate-50 bg-slate-50/50 mt-auto">
            {userEmail && (
              <div className="mb-4 px-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account</p>
                <p className="truncate text-xs text-slate-700 font-bold mt-1">{userEmail}</p>
              </div>
            )}
            <SignOutButton 
              redirectTo="/" 
              className="w-full bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 font-bold rounded-xl py-2.5 shadow-sm text-sm" 
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
