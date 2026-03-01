'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'
import { type LucideIcon } from 'lucide-react'
import { useCallback, useRef, useEffect } from 'react'

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  badge?: number
}

interface BottomNavProps {
  items: NavItem[]
}

function isTabActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

// Ultra-snappy iOS Spring Presets
const IOS_SPRING = { type: 'spring', stiffness: 600, damping: 38, mass: 0.5 }
const BOUNCE_SPRING = { type: 'spring', stiffness: 800, damping: 25, mass: 0.4 }
const NAV_ENTRY = { type: 'spring', stiffness: 400, damping: 40, mass: 1, delay: 0.1 }

export function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const dragX = useMotionValue(0)
  
  // Visual tilt effect based on drag
  const rotate = useTransform(dragX, [-100, 100], [-5, 5])
  const opacity = useTransform(dragX, [-150, -100, 0, 100, 150], [0.4, 0.8, 1, 0.8, 0.4])

  const getSpring = useCallback(
    (s: object) => (reducedMotion ? { type: 'tween', duration: 0.15 } : s),
    [reducedMotion]
  )

  const activeIndex = items.findIndex(item => isTabActive(pathname, item.href))

  // Handle Swipe-to-Switch Logic
  const handleDragEnd = (event: any, info: any) => {
    const threshold = 60
    if (info.offset.x < -threshold && activeIndex < items.length - 1) {
      // Swipe Left -> Go Right
      router.push(items[activeIndex + 1].href)
    } else if (info.offset.x > threshold && activeIndex > 0) {
      // Swipe Right -> Go Left
      router.push(items[activeIndex - 1].href)
    }
  }

  if (pathname === '/') return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] flex justify-center pointer-events-none md:hidden">
      <motion.nav
        aria-label="Main navigation"
        className="pointer-events-auto mb-[calc(1.8rem+env(safe-area-inset-bottom))] mx-6"
        initial={{ y: 150, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={getSpring(NAV_ENTRY)}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        style={{ x: dragX, rotate, opacity }}
        whileDrag={{ scale: 0.96 }}
      >
        {/* Liquid Glass Container */}
        <div
          className="flex items-center gap-1 rounded-[2rem] px-2 py-2 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.15)] overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.25)',
            backdropFilter: 'blur(40px) saturate(220%)',
            WebkitBackdropFilter: 'blur(40px) saturate(220%)',
            border: '1px solid rgba(255,255,255,0.4)',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4), 0 20px 40px rgba(0,0,0,0.3)',
            touchAction: 'none', // Required for custom drag logic
          }}
        >
          {items.map((item, idx) => {
            const active = isTabActive(pathname, item.href)
            const hasBadge = !active && (item.badge ?? 0) > 0

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className="relative outline-none"
                prefetch={true}
              >
                <motion.div
                  animate={{
                    minWidth: active ? 115 : 52,
                    paddingLeft: active ? 20 : 14,
                    paddingRight: active ? 20 : 14,
                  }}
                  transition={getSpring(IOS_SPRING)}
                  whileTap={{ scale: 0.85 }}
                  className="relative flex h-[48px] items-center justify-center gap-2.5 rounded-full select-none"
                >
                  {/* Shared Liquid Indicator */}
                  {active && (
                    <motion.div
                      layoutId="ios-active-indicator"
                      className="absolute inset-0 z-0 bg-white"
                      style={{ 
                        borderRadius: 9999,
                        boxShadow: '0 4px 15px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)' 
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
                        className="absolute top-2 right-2 z-20 h-2.5 w-2.5 rounded-full bg-[#f43f5e] border-2 border-white/60"
                      />
                    )}
                  </AnimatePresence>

                  {/* Icon — Scale and tilt when active */}
                  <motion.div
                    className="relative z-10 flex items-center justify-center"
                    animate={{
                      color: active ? '#0d9488' : '#475569',
                      scale: active ? 1.1 : 1,
                      y: active ? -0.5 : 0,
                    }}
                    transition={getSpring(IOS_SPRING)}
                  >
                    <item.icon
                      size={20}
                      strokeWidth={active ? 2.5 : 2}
                      className={cn("transition-transform duration-300", active && "drop-shadow-[0_0_8px_rgba(13,148,136,0.3)]")}
                    />
                  </motion.div>

                  {/* Label — Apple-style slide and fade */}
                  <AnimatePresence mode="wait">
                    {active && (
                      <motion.span
                        key="label"
                        initial={{ opacity: 0, x: -10, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, x: -5, filter: 'blur(2px)' }}
                        transition={getSpring(IOS_SPRING)}
                        className="relative z-10 text-[13px] font-[800] tracking-tight text-[#0d9488] whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            )
          })}
        </div>
      </motion.nav>
    </div>
  )
}

