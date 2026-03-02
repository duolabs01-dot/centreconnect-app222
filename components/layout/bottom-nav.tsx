'use client'

import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { type LucideIcon } from 'lucide-react'
import { useCallback, useTransition, useState, useEffect, memo } from 'react'

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

const NAV_SPRING = { type: 'spring' as const, stiffness: 400, damping: 25, mass: 0.8 }

const NavButton = memo(({
  item,
  active,
  onClick,
  reducedMotion
}: {
  item: NavItem,
  active: boolean,
  onClick: () => void,
  reducedMotion: boolean
}) => {
  const Icon = item.icon
  const hasBadge = !active && (item.badge ?? 0) > 0

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="relative flex h-12 flex-1 items-center justify-center outline-none tap-highlight-transparent"
      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
    >
      <div className="relative flex flex-col items-center justify-center gap-1">
        <motion.div
          animate={{
            color: active ? '#0d9488' : '#64748b',
            scale: active ? 1.25 : 1,
            y: active ? -4 : 0
          }}
          transition={reducedMotion ? { duration: 0.1 } : NAV_SPRING}
          className="relative z-10"
        >
          <Icon size={20} strokeWidth={active ? 2.5 : 2} />

          <AnimatePresence>
            {hasBadge && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"
              />
            )}
          </AnimatePresence>
        </motion.div>

        <motion.span
          animate={{
            opacity: active ? 1 : 0.6,
            scale: active ? 1 : 0.9,
            color: active ? '#0d9488' : '#64748b'
          }}
          transition={reducedMotion ? { duration: 0.1 } : NAV_SPRING}
          className="text-[10px] font-bold uppercase tracking-widest"
        >
          {item.label}
        </motion.span>

        {active && (
          <motion.div
            layoutId="active-pill"
            className="absolute -inset-x-4 -inset-y-2 z-0 rounded-2xl bg-teal-50/50"
            transition={reducedMotion ? { duration: 0.1 } : NAV_SPRING}
          />
        )}
      </div>
    </motion.button>
  )
})
NavButton.displayName = 'NavButton'

export function BottomNav({ items, pathname }: BottomNavProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [optimisticPath, setOptimisticPath] = useState(pathname)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    setOptimisticPath(pathname)
  }, [pathname])

  useEffect(() => {
    items.forEach(item => router.prefetch(item.href))
  }, [items, router])

  const handleNav = useCallback((href: string) => {
    if (href === optimisticPath) return
    setOptimisticPath(href)
    startTransition(() => {
      router.push(href)
    })
  }, [optimisticPath, router])

  const isAuthPage = pathname?.includes('/login') || pathname?.includes('/register')
  if (pathname === '/' || isAuthPage) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] flex justify-center pointer-events-none md:hidden">
      <div className="pointer-events-auto mb-[calc(1rem+env(safe-area-inset-bottom))] w-full max-w-[400px] px-4">
        <nav
          className="flex items-center gap-1 rounded-3xl border border-slate-200 bg-white/90 p-2 shadow-[0_8px_32px_rgba(0,0,0,0.15)] backdrop-blur-xl"
        >
          {items.map((item) => (
            <NavButton
              key={item.href}
              item={item}
              active={isTabActive(optimisticPath, item.href)}
              onClick={() => handleNav(item.href)}
              reducedMotion={reducedMotion ?? false}
            />
          ))}
        </nav>
      </div>

      <AnimatePresence>
        {isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 right-0 h-1 bg-cyan-500 z-[200]"
          />
        )}
      </AnimatePresence>
    </div>
  )
}
