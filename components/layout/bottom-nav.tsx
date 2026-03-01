'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { type LucideIcon } from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  badge?: number
}

interface BottomNavProps {
  items: NavItem[]
}

function isTabActive(pathname: string, href: string) {
  const exact = ['/parent/dashboard', '/ecd/dashboard', '/directory']
  if (exact.includes(href)) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 md:hidden"
      aria-label="Main navigation"
    >
      <div className="flex items-center gap-1 rounded-full px-2 py-2 bg-white/20 backdrop-blur-2xl border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.14),0_2px_8px_rgba(0,0,0,0.08)]">
        {items.map((item) => {
          const active = isTabActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex h-11 items-center justify-center gap-1.5 rounded-full px-4 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] select-none outline-none',
                active
                  ? 'bg-white text-teal-700 shadow-sm min-w-[96px]'
                  : 'text-slate-700 hover:text-slate-900 min-w-[44px]',
              )}
            >
              {!active && (item.badge ?? 0) > 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
              )}
              <item.icon
                className={cn('shrink-0 transition-all duration-200', active ? 'h-[18px] w-[18px]' : 'h-5 w-5')}
                strokeWidth={active ? 2.5 : 2}
                aria-hidden
              />
              {active && (
                <span className="whitespace-nowrap text-[13px] font-bold leading-none">
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
