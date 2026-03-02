'use client'

import { useRouter } from 'next/navigation'
import { type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, memo } from 'react'
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
        'mobile-nav-item relative flex h-12 flex-1 items-center justify-center rounded-2xl outline-none',
        active ? 'bg-teal-50 text-teal-700' : 'bg-transparent text-slate-500'
      )}
      aria-current={active ? 'page' : undefined}
      aria-label={item.label}
      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
    >
      <div className="relative flex flex-col items-center justify-center gap-1">
        <div className="relative z-10">
          <Icon size={20} strokeWidth={active ? 2.5 : 2} />
          {hasBadge ? (
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
          ) : null}
        </div>

        <span
          className={cn(
            'text-[10px] font-bold uppercase tracking-widest',
            active ? 'text-teal-600' : 'text-slate-500'
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

  useEffect(() => {
    if (prefetchedRef.current) return
    prefetchedRef.current = true
    items.forEach(item => router.prefetch(item.href))
  }, [items, router])

  const handleNav = useCallback((href: string) => {
    if (href === pathname) return
    router.push(href)
  }, [pathname, router])

  const isAuthPage = pathname?.includes('/login') || pathname?.includes('/register')
  if (!isVisible || pathname === '/' || isAuthPage) return null

  return (
    <div className="mobile-nav-fast fixed inset-x-0 bottom-0 z-[100] flex justify-center pointer-events-none md:hidden">
      <div className="pointer-events-auto mb-[calc(1rem+env(safe-area-inset-bottom))] w-full max-w-[400px] px-4">
        <nav
          className="flex items-center gap-1 rounded-3xl border border-slate-200 bg-white/95 p-2 shadow-[var(--shadow-elevation-3)]"
        >
          {items.map((item) => (
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
