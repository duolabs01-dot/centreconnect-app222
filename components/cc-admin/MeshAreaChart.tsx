// components/cc-admin/MeshAreaChart.tsx
'use client'

import { motion } from 'framer-motion'

interface MeshAreaChartProps {
  sessions?: number[]
  load?: number[]
}

export function MeshAreaChart({ 
  sessions = [120, 130, 100, 80, 110, 60], 
  load = [140, 120, 135, 115, 130, 125] 
}: MeshAreaChartProps) {
  const W = 400
  const H = 160

  const generatePath = (data: number[], height: number, isArea: boolean) => {
    const step = W / (data.length - 1)
    let path = `M 0,${isArea ? H : data[0]}`
    
    data.forEach((val, i) => {
      const x = i * step
      if (i === 0) {
        path = `M ${x},${val}`
      } else {
        const prevX = (i - 1) * step
        const prevVal = data[i - 1]
        const cp1x = prevX + step / 2
        const cp2x = prevX + step / 2
        path += ` C ${cp1x},${prevVal} ${cp2x},${val} ${x},${val}`
      }
    })

    if (isArea) {
      path += ` L ${W},${H} L 0,${H} Z`
    }
    return path
  }

  const sessionsArea = generatePath(sessions, H, true)
  const sessionsLine = generatePath(sessions, H, false)
  const loadArea = generatePath(load, H, true)
  const loadLine = generatePath(load, H, false)

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex gap-4 mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded" style={{ background: 'var(--cyber-cyan)' }} />
          <span className="font-inter text-[10px]" style={{ color: 'rgb(74, 85, 104)', fontWeight: 500 }}>
            Concurrent Sessions
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded" style={{ background: 'var(--cyber-violet)' }} />
          <span className="font-inter text-[10px]" style={{ color: 'rgb(74, 85, 104)', fontWeight: 500 }}>
            System Load %
          </span>
        </div>
      </div>

      <div className="flex-1 relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="sessions-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="var(--cyber-cyan)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--cyber-cyan)" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="load-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="var(--cyber-violet)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--cyber-violet)" stopOpacity="0.02" />
            </linearGradient>
            <pattern id="mesh" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(var(--cyber-cyan-rgb),0.06)" strokeWidth="0.5"/>
            </pattern>
          </defs>

          <rect width={W} height={H} fill="url(#mesh)" />

          <motion.path d={sessionsArea} fill="url(#sessions-grad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} />
          <motion.path d={loadArea} fill="url(#load-grad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: 0.2 }} />

          <motion.path
            d={sessionsLine}
            fill="none"
            stroke="var(--cyber-cyan)"
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5 }}
            style={{ filter: 'drop-shadow(0 0 4px var(--cyber-cyan))' }}
          />

          <motion.path
            d={loadLine}
            fill="none"
            stroke="var(--cyber-violet)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="4 2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, delay: 0.2 }}
            style={{ filter: 'drop-shadow(0 0 4px var(--cyber-violet))' }}
          />

        </svg>

        <div className="flex justify-between px-0 mt-1">
          {['00:00', '06:00', '12:00', '18:00', '23:59'].map(t => (
            <span key={t} className="font-inter text-[9px]" style={{ color: '#4A5568', fontWeight: 400 }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
