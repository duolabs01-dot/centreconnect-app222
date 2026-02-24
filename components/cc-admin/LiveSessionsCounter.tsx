'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

export function LiveSessionsCounter({ initialCount = 0 }: { initialCount?: number }) {
  const [liveCount, setLiveCount] = useState(initialCount)

  useEffect(() => {
    const supabase = createClient()
    let active = true

    const fetchLiveCount = async () => {
      try {
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
        const { count, error } = await supabase
          .from('user_sessions')
          .select('*', { count: 'exact', head: true })
          .gte('last_seen_at', fifteenMinsAgo)

        if (active) {
          setLiveCount(error ? 0 : (count ?? 0))
        }
      } catch {
        if (active) {
          setLiveCount(0)
        }
      }
    }

    void fetchLiveCount()
    const interval = setInterval(() => {
      void fetchLiveCount()
    }, 5000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={liveCount}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="font-orbitron holo-text block text-5xl font-black leading-none"
      >
        {liveCount.toLocaleString()}
      </motion.span>
    </AnimatePresence>
  )
}
