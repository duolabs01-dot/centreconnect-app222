'use client'

import { useEffect, useState, type CSSProperties } from 'react'

const CONFETTI_PIECES = [
  { left: '4%', hue: '188', delayMs: 0, durationMs: 2100, drift: '-18px' },
  { left: '11%', hue: '205', delayMs: 120, durationMs: 2300, drift: '12px' },
  { left: '18%', hue: '162', delayMs: 40, durationMs: 2200, drift: '-10px' },
  { left: '25%', hue: '36', delayMs: 90, durationMs: 2400, drift: '14px' },
  { left: '33%', hue: '345', delayMs: 10, durationMs: 2000, drift: '-12px' },
  { left: '41%', hue: '195', delayMs: 140, durationMs: 2350, drift: '10px' },
  { left: '49%', hue: '170', delayMs: 0, durationMs: 2500, drift: '-8px' },
  { left: '57%', hue: '202', delayMs: 100, durationMs: 2300, drift: '8px' },
  { left: '64%', hue: '24', delayMs: 55, durationMs: 2100, drift: '-15px' },
  { left: '71%', hue: '191', delayMs: 145, durationMs: 2450, drift: '11px' },
  { left: '78%', hue: '166', delayMs: 20, durationMs: 2250, drift: '-9px' },
  { left: '86%', hue: '212', delayMs: 70, durationMs: 2050, drift: '13px' },
  { left: '92%', hue: '42', delayMs: 130, durationMs: 2200, drift: '-12px' },
  { left: '97%', hue: '185', delayMs: 35, durationMs: 2400, drift: '9px' },
] as const

type ConfettiStyle = CSSProperties & {
  '--confetti-hue': string
  '--confetti-drift': string
}

type EnrolledConfettiProps = {
  applicationId: string
}

export function EnrolledConfetti({ applicationId }: EnrolledConfettiProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const storageKey = `cc-confetti-${applicationId}`
    if (window.localStorage.getItem(storageKey)) {
      return
    }

    window.localStorage.setItem(storageKey, '1')
    setVisible(true)

    const timer = window.setTimeout(() => setVisible(false), 2800)
    return () => window.clearTimeout(timer)
  }, [applicationId])

  if (!visible) return null

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {CONFETTI_PIECES.map((piece, index) => (
        <span
          key={`${piece.left}-${index}`}
          className="parent-confetti-piece"
          style={{
            left: piece.left,
            animationDelay: `${piece.delayMs}ms`,
            animationDuration: `${piece.durationMs}ms`,
            '--confetti-hue': piece.hue,
            '--confetti-drift': piece.drift,
          } as ConfettiStyle}
        />
      ))}
    </div>
  )
}
