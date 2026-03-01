'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { type LucideIcon } from 'lucide-react'
import { useCallback, useRef } from 'react'

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

// Spring presets
const PILL_SPRING = { type: 'spring', stiffness: 500, damping: 35, mass: 0.8 }
const ICON_SPRING = { type: 'spring', stiffness: 600, damping: 20, mass: 0.6 }
const LABEL_SPRING = { type: 'spring', stiffness: 400, damping: 28, mass: 0.7 }
const BADGE_SPRING = { type: 'spring', stiffness: 700, damping: 25, mass: 0.4 }
const NAV_ENTRY = { type: 'spring', stiffness: 300, damping: 30, mass: 1, delay: 0.1 }

export function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname()
  const reducedMotion = useReducedMotion()
  const tapRefs = useRef<Record<string, boolean>>({})

  const getSpring = useCallback(
    (s: object) => (reducedMotion ? { type: 'tween', duration: 0.15 } : s),
    [reducedMotion]
  )

  // Don't show bottom nav on the landing page if called from a shell that wraps it
  if (pathname === '/') return null

  return (
    // Entry animation — nav slides up from below on first mount
    <motion.nav
      aria-label="Main navigation"
      className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2 md:hidden"
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={getSpring(NAV_ENTRY)}
    >
      {/* Frosted glass pill container */}
      <div
        className="flex items-center gap-1.5 rounded-full px-2 py-2 shadow-2xl"
        style={{
          background: 'rgba(255,255,255,0.22)',
          backdropFilter: 'blur(32px) saturate(200%)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.35)',
          boxShadow:
            '0 12px 40px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.4)',
        }}
      >
        {items.map((item) => {
          const active = isTabActive(pathname, item.href)
          const hasBadge = !active && (item.badge ?? 0) > 0

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              className="relative outline-none"
            >
              <motion.div
                // Morphing pill: width expands when active, collapses when not
                animate={{
                  minWidth: active ? 110 : 48,
                  paddingLeft: active ? 18 : 14,
                  paddingRight: active ? 18 : 14,
                }}
                transition={getSpring(PILL_SPRING)}
                whileTap={{ scale: 0.9 }}
                style={{
                  height: 46,
                  borderRadius: 9999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  userSelect: 'none',
                  position: 'relative',
                }}
              >
                {/* Shared Background — Slides smoothly between items */}
                {active && (
                  <motion.div
                    layoutId="nav-active-pill"
                    className="absolute inset-0 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.08)]"
                    style={{ borderRadius: 9999, zIndex: 0 }}
                    transition={getSpring(PILL_SPRING)}
                  />
                )}

                {/* Badge dot — pops in with spring */}
                <AnimatePresence>
                  {hasBadge && (
                    <motion.span
                      key="badge"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={getSpring(BADGE_SPRING)}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        background: '#f43f5e',
                        border: '2px solid rgba(255,255,255,0.8)',
                        zIndex: 10,
                      }}
                      aria-hidden
                    />
                  )}
                </AnimatePresence>

                {/* Icon — bounces up when becoming active */}
                <motion.div
                  className="relative z-10"
                  animate={{
                    color: active ? '#0f766e' : '#475569',
                    scale: active ? 1.05 : 1,
                    y: active ? -0.5 : 0,
                  }}
                  transition={getSpring(ICON_SPRING)}
                >
                  <item.icon
                    style={{
                      width: active ? 19 : 21,
                      height: active ? 19 : 21,
                      strokeWidth: active ? 2.5 : 2,
                      flexShrink: 0,
                    }}
                    aria-hidden
                  />
                </motion.div>

                {/* Label — fades + slides in from left when active */}
                <AnimatePresence mode="wait">
                  {active && (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -2 }}
                      transition={getSpring(LABEL_SPRING)}
                      className="relative z-10"
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                        color: '#0f766e',
                      }}
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
  )
}
