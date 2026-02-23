'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CircleUser, Compass, Home, Map } from 'lucide-react'
import { cn } from '@/lib/utils'

type BottomNavMode = 'parent' | 'public'

type NavItem = {
  href: string
  label: string
  icon: typeof Home
  matches: string[]
}

const parentNavItems = [
  { href: '/parent/dashboard', label: 'Home', icon: Home, matches: ['/parent/dashboard', '/parent/notifications'] },
  { href: '/directory', label: 'Discover', icon: Compass, matches: ['/directory', '/centre', '/c', '/parent/shortlist', '/parent/compare'] },
  { href: '/parent/applications', label: 'Journey', icon: Map, matches: ['/parent/applications', '/apply'] },
  { href: '/parent/profile', label: 'Me', icon: CircleUser, matches: ['/parent/profile', '/parent/children', '/parent/preferences'] },
] satisfies NavItem[]

const publicNavItems = [
  { href: '/parent/dashboard', label: 'Home', icon: Home, matches: ['/parent/dashboard', '/parent/notifications'] },
  { href: '/directory', label: 'Discover', icon: Compass, matches: ['/directory', '/centre', '/c'] },
  { href: '/parent/applications', label: 'Journey', icon: Map, matches: ['/parent/applications', '/apply'] },
  { href: '/parent/profile', label: 'Me', icon: CircleUser, matches: ['/parent/profile', '/parent/children', '/parent/preferences'] },
] satisfies NavItem[]

function isPathActive(pathname: string, matches: string[]) {
  return matches.some((match) => pathname === match || pathname.startsWith(`${match}/`))
}

type BottomNavProps = {
  mode?: BottomNavMode
}

export function BottomNav({ mode = 'parent' }: BottomNavProps) {
  const pathname = usePathname()
  const navItems = mode === 'public' ? publicNavItems : parentNavItems

  if (!pathname) return null

  return (
    <nav
      className="fixed z-50 md:hidden pointer-events-none [left:max(1rem,calc(env(safe-area-inset-left)+0.75rem))] [right:max(1rem,calc(env(safe-area-inset-right)+0.75rem))] [bottom:calc(max(env(safe-area-inset-bottom),20px)+10px)]"
      aria-label="Primary"
    >
      <div className="pointer-events-auto mx-auto w-full max-w-md rounded-full border border-white/35 dark:border-white/20 bg-white/35 dark:bg-black/30 ring-1 ring-white/30 dark:ring-white/15 backdrop-blur-2xl shadow-[0_10px_30px_rgba(15,23,42,0.16)]">
        <div className="grid grid-cols-4 items-center px-2.5 py-1.5">
          {navItems.map(({ href, label, icon: Icon, matches }) => {
            const active = isPathActive(pathname, matches)
            return (
              <Link
                key={`${label}-${href}`}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold tracking-tight transition-colors',
                  active
                    ? 'bg-white/45 dark:bg-white/15 text-sky-700 dark:text-sky-300'
                    : 'text-slate-600/90 dark:text-slate-300'
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.3 : 2} />
                <span>{label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
