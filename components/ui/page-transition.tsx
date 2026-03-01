'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useReducedMotion } from 'framer-motion'
import { usePathname } from 'next/navigation'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const reducedMotion = useReducedMotion()
  
  // Only animate main portal areas for consistent iOS feel
  const shouldAnimateTabs =
    pathname?.startsWith('/parent') ||
    pathname?.startsWith('/directory') ||
    pathname?.startsWith('/ecd') ||
    pathname?.startsWith('/admin')

  if (reducedMotion || !shouldAnimateTabs) {
    return <div key={pathname}>{children}</div>
  }

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, scale: 0.98, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1.02, y: -8 }}
        transition={{ 
          duration: 0.2, 
          ease: [0.33, 1, 0.68, 1] // iOS-style Quint ease
        }}
        className="will-change-[transform,opacity]"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
