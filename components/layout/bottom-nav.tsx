'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-100 bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] backdrop-blur-md md:hidden">
      <div className="flex h-16 items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          // Check for active state
          const isActive = item.href === '/parent/dashboard' || item.href === '/ecd/dashboard' 
            ? pathname === item.href 
            : pathname.startsWith(item.href)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-1 h-full transition-all duration-300",
                isActive ? "bg-[#065A82]/5" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {/* Active Indicator Line - Thick 4px indicator */}
              {isActive && (
                <div className="absolute top-0 h-1 w-10 rounded-b-full bg-[#065A82]" />
              )}
              
              <item.icon 
                className={cn(
                  "h-7 w-7 transition-all duration-300", 
                  isActive ? "text-[#065A82] scale-110" : "text-slate-400"
                )} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={cn(
                "text-[10px] font-black uppercase tracking-[0.1em] transition-colors",
                isActive ? "text-[#065A82]" : "text-slate-400"
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
