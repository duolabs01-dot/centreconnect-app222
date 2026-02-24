'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, CircleUser, Compass, Home } from 'lucide-react'
import { LayoutGroup, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

type BottomNavMode = 'parent' | 'public'

type NavItem = {
  href: string
  label: string
  icon: typeof Home
  matches: string[]
}

const parentNavItems = [
  { href: '/parent/dashboard', label: 'Home', icon: Home, matches: ['/parent/dashboard'] },
  { href: '/directory', label: 'Discover', icon: Compass, matches: ['/directory', '/centre', '/c', '/parent/shortlist', '/parent/compare'] },
  { href: '/parent/notifications', label: 'Inbox', icon: Bell, matches: ['/parent/notifications'] },
  { href: '/parent/profile', label: 'Me', icon: CircleUser, matches: ['/parent/profile', '/parent/children', '/parent/preferences', '/parent/applications', '/apply'] },
] satisfies NavItem[]

const publicNavItems = [
  { href: '/parent/dashboard', label: 'Home', icon: Home, matches: ['/parent/dashboard'] },
  { href: '/directory', label: 'Discover', icon: Compass, matches: ['/directory', '/centre', '/c'] },
  { href: '/parent/notifications', label: 'Inbox', icon: Bell, matches: ['/parent/notifications'] },
  { href: '/parent/profile', label: 'Me', icon: CircleUser, matches: ['/parent/profile', '/parent/children', '/parent/preferences', '/parent/applications', '/apply'] },
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
  const [intentHref, setIntentHref] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    setIntentHref(null)
  }, [pathname])

  useEffect(() => {
    const supabase = createClient()
    let active = true

    void supabase
      .from('parent_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false)
      .then(({ count }) => {
        if (!active) return
        setUnreadCount(count ?? 0)
      })

    return () => {
      active = false
    }
  }, [])

  if (!pathname) return null

  return (
    <nav
      className="fixed bottom-6 left-4 right-4 z-50 pointer-events-none md:hidden"
      aria-label="Primary"
    >
      <LayoutGroup id={`cc-bottom-nav-${mode}`}>
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 24, mass: 0.78 }}
          className="pointer-events-auto mx-auto w-full max-w-md rounded-full border border-white/20 bg-white/60 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:border-white/20 dark:bg-black/60"
        >
          <div className="flex items-center justify-around px-2.5 py-1.5">
            {navItems.map(({ href, label, icon: Icon, matches }) => {
              const active = intentHref ? intentHref === href : isPathActive(pathname, matches)
              return (
                <Link
                  key={`${label}-${href}`}
                  href={href}
                  prefetch
                  scroll={false}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                    setIntentHref(href)
                  }}
                  aria-current={active ? 'page' : undefined}
                  className="relative isolate block rounded-2xl"
                >
                  <motion.div
                    whileTap={{ scale: 0.94 }}
                    transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      'relative isolate flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold tracking-tight transition-colors duration-300 will-change-transform',
                      active ? 'text-sky-700 dark:text-sky-300' : 'text-slate-600/90 dark:text-slate-300'
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId={`cc-bottom-nav-pill-${mode}`}
                        transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.62 }}
                        className="absolute inset-1 -z-10 rounded-2xl bg-white/45 dark:bg-white/15 shadow-[var(--shadow-elevation-1)]"
                      />
                    )}
                    <motion.span
                      animate={active ? { y: -2, scale: 1.08 } : { y: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 360, damping: 26, mass: 0.65 }}
                    >
                      <div className="relative">
                        <Icon className="h-5 w-5" strokeWidth={active ? 2.3 : 2} />
                        {href === '/parent/notifications' && unreadCount > 0 ? (
                          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500" />
                        ) : null}
                      </div>
                    </motion.span>
                    <motion.span
                      animate={active ? { y: -1, opacity: 1 } : { y: 0, opacity: 0.86 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {label}
                    </motion.span>
                  </motion.div>
                </Link>
              )
            })}
          </div>
        </motion.div>
      </LayoutGroup>
    </nav>
  )
}


