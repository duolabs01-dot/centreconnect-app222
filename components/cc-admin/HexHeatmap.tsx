'use client'

import { motion } from 'framer-motion'

// components/cc-admin/HexHeatmap.tsx

export interface ProvinceScore {
  id: string
  shortLabel: string
  score: number
  centres: number
  row: number
  col: number
}

interface HexHeatmapProps {
  data?: ProvinceScore[]
}

const DEFAULT_PROVINCES: ProvinceScore[] = [
  { id: 'lp',  shortLabel: 'LP', score: 62, centres: 34,  row: 0, col: 1 },
  { id: 'mp',  shortLabel: 'MP', score: 58, centres: 28,  row: 0, col: 2 },
  { id: 'nw',  shortLabel: 'NW', score: 54, centres: 22,  row: 1, col: 0 },
  { id: 'gp',  shortLabel: 'GP', score: 88, centres: 142, row: 1, col: 1 },
  { id: 'kzn', shortLabel: 'KZN',score: 74, centres: 89,  row: 1, col: 2 },
  { id: 'fs',  shortLabel: 'FS', score: 61, centres: 31,  row: 2, col: 0 },
  { id: 'nc',  shortLabel: 'NC', score: 45, centres: 14,  row: 2, col: 1 },
  { id: 'ec',  shortLabel: 'EC', score: 56, centres: 47,  row: 2, col: 2 },
  { id: 'wc',  shortLabel: 'WC', score: 82, centres: 98,  row: 3, col: 0 },
]

function scoreToColor(score: number): { fill: string; stroke: string } {
  if (score >= 80) return { fill: 'rgba(0,255,148,0.25)',   stroke: '#00FF94' }
  if (score >= 65) return { fill: 'rgba(0,242,255,0.20)',   stroke: '#00F2FF' }
  if (score >= 50) return { fill: 'rgba(255,184,0,0.20)',   stroke: '#FFB800' }
  return             { fill: 'rgba(255,68,102,0.20)',   stroke: '#FF4466' }
}

function hexPath(cx: number, cy: number, size: number): string {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30)
    return `${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`
  })
  return `M ${pts.join(' L ')} Z`
}

export function HexHeatmap({ data = DEFAULT_PROVINCES }: HexHeatmapProps) {
  const HEX_SIZE = 38
  const H_SPACING = HEX_SIZE * 1.75
  const V_SPACING = HEX_SIZE * 1.52
  const OFFSET = HEX_SIZE * 0.875

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex flex-wrap gap-3">
        {[
          { color: '#00FF94', label: '≥80 Excellent' },
          { color: '#00F2FF', label: '65–79 Good'    },
          { color: '#FFB800', label: '50–64 Moderate'},
          { color: '#FF4466', label: '<50 Needs Help' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color, opacity: 0.7 }} />
            <span className="font-inter text-[9px]" style={{ color: '#4A5568', fontWeight: 500 }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <svg viewBox="0 0 280 200" className="w-full flex-1">
        <defs>
          <filter id="hex-glow"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>

        {data.map((p, i) => {
          const cx = 50 + p.col * H_SPACING + (p.row % 2) * OFFSET
          const cy = 40 + p.row * V_SPACING
          const { fill, stroke } = scoreToColor(p.score)
          const path = hexPath(cx, cy, HEX_SIZE - 3)

          return (
            <g key={p.id}>
              <motion.path
                d={path}
                fill={fill}
                stroke={stroke}
                strokeWidth="1"
                filter="url(#hex-glow)"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 200, damping: 18 }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
                whileHover={{ scale: 1.08 }}
              />
              <text x={cx} y={cy - 4} textAnchor="middle" fontSize="7" fontWeight="700" fill={stroke} className="font-orbitron" style={{ filter: `drop-shadow(0 0 3px ${stroke})` }}>{p.shortLabel}</text>
              <text x={cx} y={cy + 5} textAnchor="middle" fontSize="8" fontWeight="800" fill="white" className="font-inter">{p.score}</text>
              <text x={cx} y={cy + 13} textAnchor="middle" fontSize="5" fontWeight="400" fill="rgba(255,255,255,0.4)" className="font-inter">{p.centres} ctrs</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
