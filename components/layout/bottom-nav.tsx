'use client'

import { useRouter } from 'next/navigation'
import { type LucideIcon } from 'lucide-react'
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
  return pathname === href || pathname.startsWith(`${href}/`)
}

const NavButton = memo(({
  item,
  active,
  onPress
}: {
  item: NavItem
  active: boolean
  onPress: (href: string) => void
}) => {
  const Icon = item.icon
  const hasBadge = !active && (item.badge ?? 0) > 0
  const handleClick = useCallback(() => {
    onPress(item.href)
  }, [item.href, onPress])

  return (
    <button
      onClick={handleClick}
      className={cn(
        'mobile-nav-item relative flex h-12 flex-1 items-center justify-center overflow-hidden rounded-2xl px-1 outline-none',
        active ? 'text-cyan-900' : 'text-slate-600 hover:text-slate-900'
      )}
      aria-current={active ? 'page' : undefined}
      aria-label={item.label}
      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
    >
      {active ? (
        <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-200/65 via-sky-100/40 to-indigo-200/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_0_0_1px_rgba(125,211,252,0.55),0_10px_24px_rgba(14,116,144,0.2)]" />
      ) : null}
      <div className="relative flex flex-col items-center justify-center gap-1">
        <div className="relative z-10">
          <Icon
            size={20}
            strokeWidth={active ? 2.4 : 2}
            className={active ? 'drop-shadow-[0_0_10px_rgba(34,211,238,0.45)]' : ''}
          />
          {hasBadge ? (
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
          ) : null}
        </div>

        <span
          className={cn(
            'text-[10px] font-semibold tracking-wide',
            active ? 'text-cyan-800' : 'text-slate-500'
          )}
        >
          {item.label}
        </span>
      </div>
    </button>
  )
})
NavButton.displayName = 'NavButton'

export function BottomNav({ items, pathname }: BottomNavProps) {
  const router = useRouter()
  const { isVisible } = useBottomNav()
  const prefetchedRef = useRef(false)
  const [savedBadges, setSavedBadges] = useState(2)

  useEffect(() => {
    if (prefetchedRef.current) return
    prefetchedRef.current = true
    items.forEach(item => router.prefetch(item.href))
  }, [items, router])

  useEffect(() => {
    // Placeholder logic - replace with real saved centres count from context/api
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('cc:saved-count') : null
    if (stored) {
      setSavedBadges(Number(stored) || 0)
    }
  }, [])

  const handleNav = useCallback((href: string) => {
    if (href === pathname) return
    router.push(href)
  }, [pathname, router])

  const decoratedItems = useMemo(
    () =>
      items.map((item) =>
        item.href === '/parent/saved' ? { ...item, badge: savedBadges } : item
      ),
    [items, savedBadges]
  )

  const isAuthPage = pathname?.includes('/login') || pathname?.includes('/register')
  if (!isVisible || pathname === '/' || isAuthPage) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] flex justify-center pointer-events-none md:hidden">
      <div className="pointer-events-auto mb-[calc(1rem+env(safe-area-inset-bottom))] w-full max-w-[400px] px-4">
        <nav
          className="ios-liquid-nav flex items-center gap-1 rounded-[2rem] border border-white/55 bg-white/35 p-2 shadow-[0_18px_45px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.75)]"
          style={{
            WebkitBackdropFilter: 'blur(28px) saturate(185%)',
            backdropFilter: 'blur(28px) saturate(185%)',
          }}
        >
          {decoratedItems.map((item) => (
            <NavButton
              key={item.href}
              item={item}
              active={isTabActive(pathname, item.href)}
              onPress={handleNav}
            />
          ))}
        </nav>
      </div>
    </div>
  )
}
