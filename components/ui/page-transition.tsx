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
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ 
          duration: 0.15,
          ease: [0.25, 1, 0.5, 1] 
        }}
        className="will-change-[transform,opacity]"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
