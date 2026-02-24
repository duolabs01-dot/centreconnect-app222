'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

export function LiveSessionsCounter({ initialCount = 1284 }: { initialCount?: number }) {
  const [liveCount, setLiveCount] = useState(initialCount)

  useEffect(() => {
    const supabase = createClient()
    let active = true

    const fetchLiveCount = async () => {
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
      const { count } = await supabase
        .from('user_sessions')
        .select('id', { count: 'exact', head: true })
        .gte('last_seen_at', fifteenMinsAgo)

      if (active) {
        setLiveCount(count ?? 0)
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
