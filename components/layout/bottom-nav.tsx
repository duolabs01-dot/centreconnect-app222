'use client'

import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

interface BottomNavProps {
  items: NavItem[]
}

export function BottomNav({ items }: BottomNavProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleNav = (href: string) => {
    router.push(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] border-t border-slate-100 bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] backdrop-blur-md md:hidden">
      <div className="flex h-16 items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const isActive = item.href === '/parent/dashboard' || item.href === '/ecd/dashboard'
            ? pathname === item.href
            : pathname.startsWith(item.href)

          return (
            <button
              key={item.href}
              onClick={() => handleNav(item.href)}
              className={cn(
                "relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 transition-all duration-200",
                isActive ? "bg-teal-50/80" : "text-slate-400 active:bg-slate-50"
              )}
            >
              {/* Active Indicator Line - 4px solid teal bottom border */}
              {isActive && (
                <div className="absolute bottom-0 h-1 w-full bg-teal-600" />
              )}

              <item.icon
                className={cn(
                  "h-[28px] w-[28px] transition-transform duration-200",
                  isActive ? "text-teal-700 scale-105" : "text-slate-400"
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={cn(
                "text-[10px] font-bold transition-colors",
                isActive ? "text-teal-800" : "text-slate-500"
              )}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
