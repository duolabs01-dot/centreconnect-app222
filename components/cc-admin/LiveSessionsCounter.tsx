'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function LiveSessionsCounter({ initialCount = 1284 }: { initialCount?: number }) {
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    // In a real app, use Supabase Presence
    // For now, simulate small fluctuations around the base count
    const interval = setInterval(() => {
      setCount(prev => prev + (Math.random() > 0.5 ? 1 : -1))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={count}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="font-orbitron holo-text block text-5xl font-black leading-none"
      >
        {count.toLocaleString()}
      </motion.span>
    </AnimatePresence>
  )
}
