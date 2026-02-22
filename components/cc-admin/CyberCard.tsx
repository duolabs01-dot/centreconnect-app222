// components/cc-admin/CyberCard.tsx
'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CyberCardProps {
  children: React.ReactNode
  className?: string
  accent?: 'cyan' | 'violet' | 'green' | 'rose'
  scanLine?: boolean
  glow?: boolean
  style?: React.CSSProperties
}

export function CyberCard({
  children,
  className,
  accent = 'cyan',
  scanLine = false,
  glow = false,
  style
}: CyberCardProps) {
  const accentClasses = {
    cyan:   'cyber-card-glow-cyan',
    violet: 'cyber-card-glow-violet',
    green:  'cyber-card-glow-green',
    rose:   'cyber-card-glow-rose',
  }

  return (
    <motion.div
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'cyber-card group',
        glow && accentClasses[accent],
        scanLine && 'scanline',
        className
      )}
    >
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20 rounded-tl-sm" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20 rounded-tr-sm" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/20 rounded-bl-sm" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20 rounded-br-sm" />
      
      {/* Internal shine */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <div className="relative z-20">
        {children}
      </div>
    </motion.div>
  )
}
