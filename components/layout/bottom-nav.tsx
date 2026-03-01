'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'
import { type LucideIcon } from 'lucide-react'
import { useCallback, useTransition, useState, useEffect } from 'react'

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

// Ultra-snappy iOS Spring Presets - Optimized for extreme speed
const IOS_SPRING = { type: 'spring', stiffness: 1000, damping: 50, mass: 0.2 }
const BOUNCE_SPRING = { type: 'spring', stiffness: 1200, damping: 30, mass: 0.2 }
const NAV_ENTRY = { type: 'spring', stiffness: 600, damping: 40, mass: 0.7, delay: 0 }

export function BottomNav({ items, pathname }: BottomNavProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [optimisticPath, setOptimisticPath] = useState(pathname)
  const reducedMotion = useReducedMotion()
  const dragX = useMotionValue(0)
  
  // Sync optimistic path with actual pathname when it changes
  useEffect(() => {
    setOptimisticPath(pathname)
  }, [pathname])

  // AGGRESSIVE PREFETCHING: Prefetch all items in the nav bar on mount
  useEffect(() => {
    items.forEach(item => {
      router.prefetch(item.href)
    })
  }, [items, router])

  // Visual tilt effect based on drag
  const rotate = useTransform(dragX, [-100, 100], [-5, 5])
  const opacity = useTransform(dragX, [-150, -100, 0, 100, 150], [0.4, 0.8, 1, 0.8, 0.4])

  const getSpring = useCallback(
    (s: object) => (reducedMotion ? { type: 'tween', duration: 0.1 } : s),
    [reducedMotion]
  )

  const activeIndex = items.findIndex(item => isTabActive(optimisticPath, item.href))

  const handleNav = (href: string) => {
    if (href === optimisticPath) return
    setOptimisticPath(href)
    startTransition(() => {
      router.push(href)
    })
  }

  // Handle Swipe-to-Switch Logic
  const handleDragEnd = (event: any, info: any) => {
    const threshold = 60
    if (info.offset.x < -threshold && activeIndex < items.length - 1) {
      handleNav(items[activeIndex + 1].href)
    } else if (info.offset.x > threshold && activeIndex > 0) {
      handleNav(items[activeIndex - 1].href)
    }
  }

  // Hide on auth pages or where explicitly requested via search params
  const isAuthPage = pathname?.includes('/login') || pathname?.includes('/register')
  if (pathname === '/' || isAuthPage) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] flex justify-center pointer-events-none md:hidden">
      <motion.nav
        aria-label="Main navigation"
        className="pointer-events-auto mb-[calc(1.4rem+env(safe-area-inset-bottom))] mx-6"
        initial={{ y: 100, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={getSpring(NAV_ENTRY)}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        style={{ x: dragX, rotate, opacity }}
        whileDrag={{ scale: 0.98 }}
      >
        {/* Liquid Glass Container */}
        <div
          className="flex items-center gap-1 rounded-[2rem] px-1.5 py-1.5 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.1)]"
          style={{
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(30px) saturate(190%)',
            WebkitBackdropFilter: 'blur(30px) saturate(190%)',
            border: '1px solid rgba(255,255,255,0.5)',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.5), 0 15px 30px rgba(0,0,0,0.2)',
            touchAction: 'none',
          }}
        >
          {items.map((item, idx) => {
            const active = isTabActive(optimisticPath, item.href)
            const hasBadge = !active && (item.badge ?? 0) > 0

            return (
              <button
                key={item.href}
                onClick={() => handleNav(item.href)}
                className="relative outline-none tap-highlight-transparent"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <motion.div
                  animate={{
                    minWidth: active ? 110 : 48,
                    paddingLeft: active ? 18 : 12,
                    paddingRight: active ? 18 : 12,
                  }}
                  transition={getSpring(IOS_SPRING)}
                  whileTap={{ scale: 0.9 }}
                  className="relative flex h-[44px] items-center justify-center gap-2 rounded-full select-none"
                >
                  {/* Shared Liquid Indicator */}
                  {active && (
                    <motion.div
                      layoutId="ios-active-indicator"
                      className="absolute inset-0 z-0 bg-white"
                      style={{ 
                        borderRadius: 9999,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' 
                      }}
                      transition={getSpring(IOS_SPRING)}
                    />
                  )}

                  {/* Badge — Pops with extra bounce */}
                  <AnimatePresence>
                    {hasBadge && (
                      <motion.span
                        key="badge"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={getSpring(BOUNCE_SPRING)}
                        className="absolute top-1.5 right-1.5 z-20 h-2 w-2 rounded-full bg-rose-500 border border-white"
                      />
                    )}
                  </AnimatePresence>

                  {/* Icon — Scale and tilt when active */}
                  <motion.div
                    className="relative z-10 flex items-center justify-center"
                    animate={{
                      color: active ? '#0d9488' : '#64748b',
                      scale: active ? 1.05 : 1,
                    }}
                    transition={getSpring(IOS_SPRING)}
                  >
                    <item.icon
                      size={18}
                      strokeWidth={active ? 2.5 : 2}
                      className={cn(active && "drop-shadow-[0_0_8px_rgba(13,148,136,0.2)]")}
                    />
                  </motion.div>

                  {/* Label — Apple-style slide and fade */}
                  {active && (
                    <motion.span
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="relative z-10 text-[12px] font-[700] tracking-tight text-[#0d9488] whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </motion.div>
              </button>
            )
          })}
        </div>
      </motion.nav>
      
      {/* Visual loading indicator for non-blocking nav */}
      <AnimatePresence>
        {isPending && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 right-0 h-0.5 bg-cyan-500 z-[200]"
          />
        )}
      </AnimatePresence>
    </div>
  )
}
