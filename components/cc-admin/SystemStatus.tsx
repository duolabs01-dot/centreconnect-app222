'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

function getCyberRgbVar(colorVar: string): string {
  if (colorVar === 'var(--cyber-green)') return 'var(--cyber-green-rgb)'
  if (colorVar === 'var(--cyber-cyan)') return 'var(--cyber-cyan-rgb)'
  if (colorVar === 'var(--cyber-amber)') return 'var(--cyber-amber-rgb)'
  if (colorVar === 'var(--cyber-rose)') return 'var(--cyber-rose-rgb)'
  return '255,255,255' // Default to white RGB
}

interface ServiceHealth {
  label: string
  val: number
  color: string
}

export function SystemStatus() {
  const [services, setServices] = useState<ServiceHealth[]>([
    { label: 'API GATEWAY', val: 99, color: 'var(--cyber-green)' },
    { label: 'DB CLUSTER',  val: 87, color: 'var(--cyber-cyan)' },
    { label: 'BLOB STORAGE', val: 64, color: 'var(--cyber-amber)' },
    { label: 'AUTH PROVIDER', val: 100, color: 'var(--cyber-green)' },
  ])

  useEffect(() => {
    const interval = setInterval(() => {
      setServices(prev => prev.map(s => {
        // Randomly fluctuate health for visual telemetry
        const change = Math.random() > 0.8 ? (Math.random() > 0.5 ? 1 : -1) : 0
        const newVal = Math.min(100, Math.max(60, s.val + change))
        let newColor = 'var(--cyber-green)' // Stable
        if (newVal < 90) newColor = 'var(--cyber-cyan)' // Warning
        if (newVal < 70) newColor = 'var(--cyber-amber)' // Degraded
        if (newVal < 50) newColor = 'var(--cyber-rose)' // Critical
        return { ...s, val: newVal, color: newColor }
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-4">
      {services.map((s) => (
        <div key={s.label}>
          <div className="flex justify-between mb-1.5">
            <span className="font-inter text-[9px] text-slate-400 font-semibold tracking-wider">{s.label}</span>
            <motion.span 
              key={s.val}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              className="font-mono text-[9px]" 
              style={{ color: s.color }}
            >
              {s.val}%
            </motion.span>
          </div>
          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              initial={false}
                            animate={{
                              width: `${s.val}%`,
                              background: `linear-gradient(90deg, rgba(${getCyberRgbVar(s.color)}, 0.25), ${s.color})`,
                              boxShadow: `0 0 8px rgba(${getCyberRgbVar(s.color)}, 0.25)`
                            }}              className="h-full rounded-full transition-all duration-1000"
            />
          </div>
        </div>
      ))}
    </div>
  )
}
