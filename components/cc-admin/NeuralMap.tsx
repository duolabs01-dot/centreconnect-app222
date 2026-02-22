// components/cc-admin/NeuralMap.tsx
// Abstract neural activity grid — South Africa context
'use client'

import { motion } from 'framer-motion'

const NODES = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  x: 10 + Math.random() * 80,
  y: 10 + Math.random() * 80,
  size: 1 + Math.random() * 3,
  pulse: 2 + Math.random() * 4,
}))

const CONNECTIONS = [
  [0, 5], [5, 12], [12, 18], [18, 22], [2, 8], [8, 15], [15, 20], [1, 7], [7, 14], [3, 9], [9, 16]
]

export function NeuralMap() {
  return (
    <div className="w-full h-full bg-slate-950/20 rounded-lg overflow-hidden relative">
      {/* Neural grid background */}
      <div 
        className="absolute inset-0 opacity-10" 
        style={{ 
          backgroundImage: 'radial-gradient(rgb(var(--cyber-cyan-rgb)) 0.5px, transparent 0.5px)', 
          backgroundSize: '20px 20px' 
        }} 
      />

      <svg viewBox="0 0 100 100" className="w-full h-full relative z-10">
        {/* Connections */}
        {CONNECTIONS.map(([from, to], i) => (
          <motion.line
            key={i}
            x1={NODES[from].x} y1={NODES[from].y}
            x2={NODES[to].x}   y2={NODES[to].y}
            stroke="var(--cyber-cyan)"
            strokeWidth="0.2"
            strokeOpacity="0.3"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.3 }}
            transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse', delay: i * 0.2 }}
          />
        ))}

        {/* Active nodes */}
        {NODES.map((node) => (
          <g key={node.id}>
            <motion.circle
              cx={node.x} cy={node.y} r={node.size}
              fill="var(--cyber-cyan)"
              initial={{ opacity: 0.2, scale: 0.8 }}
              animate={{ 
                opacity: [0.2, 0.8, 0.2],
                scale: [0.8, 1.2, 0.8] 
              }}
              transition={{ duration: node.pulse, repeat: Infinity, ease: 'easeInOut' }}
              style={{ filter: 'drop-shadow(0 0 2px var(--cyber-cyan))' }}
            />
            {/* Core dot */}
            <circle cx={node.x} cy={node.y} r={node.size * 0.4} fill="white" />
          </g>
        ))}
      </svg>

      {/* Region labels */}
      <div className="absolute bottom-2 left-3 flex gap-4 text-[8px] font-orbitron tracking-widest text-slate-500 uppercase">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-cyber-cyan shadow-[0_0_5px_var(--cyber-cyan)]" />
          GP-HQ
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-cyber-violet shadow-[0_0_5px_var(--cyber-violet)]" />
          WC-NODE
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-cyber-green shadow-[0_0_5px_var(--cyber-green)]" />
          KZN-HUB
        </div>
      </div>
    </div>
  )
}
