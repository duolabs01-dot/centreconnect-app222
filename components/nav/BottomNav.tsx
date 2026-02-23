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
      className="fixed bottom-6 left-4 right-4 z-50 md:hidden pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      <div className="pointer-events-auto mx-auto w-full max-w-md rounded-full border border-white/20 bg-white/60 dark:bg-black/60 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
        <div className="grid grid-cols-4 items-center px-2 py-1">
          {navItems.map(({ href, label, icon: Icon, matches }) => {
            const active = isPathActive(pathname, matches)
            return (
              <Link
                key={`${label}-${href}`}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold tracking-tight transition-colors',
                  active ? 'text-sky-700 dark:text-sky-300' : 'text-slate-500 dark:text-slate-400'
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

