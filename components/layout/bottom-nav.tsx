'use client'

import { useRouter } from 'next/navigation'
import { type LucideIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react'
import { cn } from '@/lib/utils'
import { useBottomNav } from '@/lib/context/BottomNavProvider'

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  badge?: number
}

interface BottomNavProps {
  items: NavItem[]
  pathname: string
}

function isTabActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  if (href === '/parent/discover') {
    return pathname === '/parent/discover' || pathname === '/directory' || pathname.startsWith('/c/') || pathname.startsWith('/apply/')
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

const NavButton = memo(({
  item,
  active,
  onPress,
}: {
  item: NavItem
  active: boolean
  onPress: (href: string) => void
}) => {
  const Icon = item.icon
  const isSavedTab = item.href === '/parent/shortlist'
  const hasBadge = !active && (item.badge ?? 0) > 0
  const handleClick = useCallback(() => {
    onPress(item.href)
  }, [item.href, onPress])

  return (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.7 }}
      className={cn(
        'mobile-nav-item relative flex min-h-[44px] flex-1 items-center justify-center overflow-hidden rounded-2xl px-1.5 outline-none transition-colors duration-200',
        active ? 'text-cyan-900' : 'text-slate-600 hover:text-slate-900'
      )}
      aria-current={active ? 'page' : undefined}
      aria-label={item.label}
      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
    >
      <AnimatePresence>
        {active ? (
          <motion.span
            layoutId="bottom-nav-active-pill"
            className="pointer-events-none absolute inset-0 rounded-2xl bg-cyan-50/40"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          />
        ) : null}
      </AnimatePresence>

      <motion.div
        className="relative z-10 flex flex-col items-center justify-center gap-0.5"
        animate={{ y: active ? -1 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      >
        <div className="relative">
          <Icon
            size={20}
            strokeWidth={active ? 2.4 : 2}
            className={cn(
              active ? 'text-cyan-900 drop-shadow-[0_0_16px_rgba(14,165,233,0.4)]' : 'text-slate-500',
              isSavedTab ? 'text-cyan-600' : ''
            )}
          />
          {hasBadge ? <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" /> : null}
        </div>

        <span
          className={cn(
            'text-[10px] font-semibold uppercase tracking-[0.08em]',
            active ? 'text-cyan-800' : 'text-slate-500'
          )}
        >
          {item.label}
        </span>
      </motion.div>
    </motion.button>
  )
})
NavButton.displayName = 'NavButton'

export function BottomNav({ items, pathname }: BottomNavProps) {
  const router = useRouter()
  const { isVisible } = useBottomNav()
  const prefetchedRef = useRef(false)
  const [mounted, setMounted] = useState(false)
  const [savedBadges, setSavedBadges] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (prefetchedRef.current) return
    prefetchedRef.current = true
    items.forEach((item) => router.prefetch(item.href))
  }, [items, router])

  useEffect(() => {
    const readSavedCount = async () => {
      if (typeof window === 'undefined') return

      const stored = window.localStorage.getItem('cc:saved-count')
      if (stored != null) {
        setSavedBadges(Number(stored) || 0)
      }

      try {
        const response = await fetch('/api/parent/shortlist/summary', { cache: 'no-store' })
        if (!response.ok) return
        const payload = await response.json()
        const nextCount = Number(payload?.savedCount ?? 0) || 0
        window.localStorage.setItem('cc:saved-count', String(nextCount))
        setSavedBadges(nextCount)
      } catch {
        // Keep the locally cached count if the summary request fails.
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'cc:saved-count') {
        setSavedBadges(Number(event.newValue ?? 0) || 0)
      }
    }

    const handleSavedCountChange = (event: Event) => {
      const nextCount = Number((event as CustomEvent<number>).detail ?? 0) || 0
      setSavedBadges(nextCount)
    }

    void readSavedCount()
    window.addEventListener('storage', handleStorage)
    window.addEventListener('cc:saved-count-change', handleSavedCountChange as EventListener)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('cc:saved-count-change', handleSavedCountChange as EventListener)
    }
  }, [])

  const decoratedItems = useMemo(() => {
    return items.map((item) =>
      item.href === '/parent/shortlist'
        ? { ...item, badge: savedBadges > 0 ? savedBadges : undefined }
        : item
    )
  }, [items, savedBadges])

  const handleNav = useCallback(
    (href: string) => {
      if (href === pathname) return
      router.push(href)
    },
    [pathname, router]
  )

  const isAuthPage = pathname?.includes('/login') || pathname?.includes('/register')
  if (!mounted || !isVisible || pathname === '/' || isAuthPage) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex justify-center md:hidden">
      <motion.div
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="pointer-events-auto mb-[calc(0.75rem+env(safe-area-inset-bottom))] w-full max-w-[420px] px-3"
      >
        <motion.nav
          className="flex items-center gap-1 rounded-[1.75rem] border border-white/40 bg-white/30 p-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.22)]"
          style={{
            WebkitBackdropFilter: 'blur(18px) saturate(160%)',
            backdropFilter: 'blur(18px) saturate(160%)',
          }}
          whileHover={{ scale: 1.005 }}
        >
          {decoratedItems.map((item) => (
            <NavButton key={item.href} item={item} active={isTabActive(pathname, item.href)} onPress={handleNav} />
          ))}
        </motion.nav>
      </motion.div>
    </div>
  )
}
