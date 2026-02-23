'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useReducedMotion } from 'framer-motion'
import { usePathname } from 'next/navigation'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const reducedMotion = useReducedMotion()
  const shouldAnimateTabs =
    pathname?.startsWith('/parent') ||
    pathname?.startsWith('/directory')

  if (reducedMotion || !shouldAnimateTabs) {
    return <div key={pathname}>{children}</div>
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 10, scale: 0.992, filter: 'blur(2px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -6, scale: 0.996, filter: 'blur(1px)' }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="will-change-transform"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
