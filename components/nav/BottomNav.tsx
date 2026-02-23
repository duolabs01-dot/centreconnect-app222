'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
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
  { href: '/parent/notifications', label: 'Messages', icon: Bell, matches: ['/parent/notifications'] },
  { href: '/parent/profile', label: 'Me', icon: CircleUser, matches: ['/parent/profile', '/parent/children', '/parent/preferences', '/parent/applications', '/apply'] },
] satisfies NavItem[]

const publicNavItems = [
  { href: '/parent/dashboard', label: 'Home', icon: Home, matches: ['/parent/dashboard'] },
  { href: '/directory', label: 'Discover', icon: Compass, matches: ['/directory', '/centre', '/c'] },
  { href: '/parent/notifications', label: 'Messages', icon: Bell, matches: ['/parent/notifications'] },
  { href: '/parent/profile', label: 'Me', icon: CircleUser, matches: ['/parent/profile', '/parent/children', '/parent/preferences', '/parent/applications', '/apply'] },
] satisfies NavItem[]

function isPathActive(pathname: string, matches: string[]) {
  return matches.some((match) => pathname === match || pathname.startsWith(`${match}/`))
}

type BottomNavProps = {
  mode?: BottomNavMode
}

type NavRuntime = 'ios-standalone' | 'ios-browser' | 'android' | 'other'

function resolveRuntime(): NavRuntime {
  if (typeof window === 'undefined') return 'other'

  const ua = window.navigator.userAgent ?? ''
  const standaloneQuery = window.matchMedia('(display-mode: standalone)')
  const isStandalone = standaloneQuery.matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const isAndroid = /Android/i.test(ua)

  if (isIOS && isStandalone) return 'ios-standalone'
  if (isIOS) return 'ios-browser'
  if (isAndroid) return 'android'
  return 'other'
}

export function BottomNav({ mode = 'parent' }: BottomNavProps) {
  const pathname = usePathname()
  const navItems = mode === 'public' ? publicNavItems : parentNavItems
  const [runtime, setRuntime] = useState<NavRuntime>('other')
  const [intentHref, setIntentHref] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const applyRuntime = () => setRuntime(resolveRuntime())
    const standaloneQuery = window.matchMedia('(display-mode: standalone)')

    applyRuntime()
    window.addEventListener('resize', applyRuntime)
    window.addEventListener('orientationchange', applyRuntime)

    if (typeof standaloneQuery.addEventListener === 'function') {
      standaloneQuery.addEventListener('change', applyRuntime)
    } else {
      standaloneQuery.addListener(applyRuntime)
    }

    return () => {
      window.removeEventListener('resize', applyRuntime)
      window.removeEventListener('orientationchange', applyRuntime)
      if (typeof standaloneQuery.removeEventListener === 'function') {
        standaloneQuery.removeEventListener('change', applyRuntime)
      } else {
        standaloneQuery.removeListener(applyRuntime)
      }
    }
  }, [])

  const navOffset = useMemo(() => {
    switch (runtime) {
      case 'ios-standalone':
        return 'calc(max(env(safe-area-inset-bottom), 18px) + 16px)'
      case 'ios-browser':
        return 'calc(max(env(safe-area-inset-bottom), 10px) + 14px)'
      case 'android':
        return 'calc(max(env(safe-area-inset-bottom), 8px) + 12px)'
      default:
        return 'calc(max(env(safe-area-inset-bottom), 10px) + 12px)'
    }
  }, [runtime])

  const navStyle = useMemo(
    () =>
      ({
        '--cc-bottom-nav-offset': navOffset,
      }) as CSSProperties,
    [navOffset]
  )

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
      className="fixed z-50 md:hidden pointer-events-none [left:max(1rem,calc(env(safe-area-inset-left)+0.75rem))] [right:max(1rem,calc(env(safe-area-inset-right)+0.75rem))] [bottom:var(--cc-bottom-nav-offset)]"
      style={navStyle}
      aria-label="Primary"
    >
      <LayoutGroup id={`cc-bottom-nav-${mode}`}>
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 24, mass: 0.78 }}
          className="pointer-events-auto mx-auto w-full max-w-md rounded-full border border-white/35 dark:border-white/20 bg-white/35 dark:bg-black/30 ring-1 ring-white/30 dark:ring-white/15 backdrop-blur-2xl shadow-[var(--shadow-elevation-3)]"
        >
          <div className="grid grid-cols-4 items-center px-2.5 py-1.5">
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


