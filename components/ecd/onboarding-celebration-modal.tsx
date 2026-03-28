'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { CheckCircle2, Share2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const CONFETTI_PIECES = [
  { left: '5%',  hue: '165', delayMs: 0,   durationMs: 2100, drift: '-20px' },
  { left: '13%', hue: '188', delayMs: 80,  durationMs: 2300, drift: '14px'  },
  { left: '21%', hue: '36',  delayMs: 40,  durationMs: 2200, drift: '-12px' },
  { left: '29%', hue: '345', delayMs: 110, durationMs: 2400, drift: '16px'  },
  { left: '38%', hue: '205', delayMs: 20,  durationMs: 2000, drift: '-10px' },
  { left: '47%', hue: '162', delayMs: 150, durationMs: 2350, drift: '12px'  },
  { left: '55%', hue: '195', delayMs: 60,  durationMs: 2500, drift: '-8px'  },
  { left: '63%', hue: '24',  delayMs: 100, durationMs: 2300, drift: '10px'  },
  { left: '71%', hue: '191', delayMs: 35,  durationMs: 2150, drift: '-16px' },
  { left: '79%', hue: '166', delayMs: 130, durationMs: 2450, drift: '13px'  },
  { left: '87%', hue: '212', delayMs: 10,  durationMs: 2250, drift: '-9px'  },
  { left: '94%', hue: '42',  delayMs: 70,  durationMs: 2050, drift: '11px'  },
] as const

type ConfettiStyle = CSSProperties & {
  '--confetti-hue': string
  '--confetti-drift': string
}

type Props = {
  ecdId: string
  centreName: string
  publicProfileUrl: string
  dashboardUrl?: string
}

export function OnboardingCelebrationModal({
  ecdId,
  centreName,
  publicProfileUrl,
  dashboardUrl = '/ecd/dashboard',
}: Props) {
  const [visible, setVisible] = useState(false)
  const [confettiActive, setConfettiActive] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const storageKey = `cc-ecd-celebrate-shown-v1:${ecdId}`
    if (typeof window === 'undefined') return
    if (window.localStorage.getItem(storageKey)) return

    window.localStorage.setItem(storageKey, '1')
    setVisible(true)
    setConfettiActive(true)

    const confettiTimer = window.setTimeout(() => setConfettiActive(false), 2800)
    return () => window.clearTimeout(confettiTimer)
  }, [ecdId])

  if (!visible) return null

  const whatsappText = encodeURIComponent(
    `${centreName} is now on CentreConnect! Parents can find us and apply for free — no registration fee. View our profile: ${publicProfileUrl}`
  )
  const whatsappHref = `https://wa.me/?text=${whatsappText}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(publicProfileUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select the text
    }
  }

  return (
    <>
      {/* Confetti keyframes */}
      <style>{`
        @keyframes ecd-confetti-fall {
          0%   { transform: translateY(-10px) translateX(0) rotate(0deg) scale(1); opacity: 1; }
          60%  { opacity: 1; }
          100% { transform: translateY(110vh) translateX(var(--confetti-drift, 0)) rotate(540deg) scale(0.6); opacity: 0; }
        }
        .ecd-confetti-piece {
          position: absolute;
          top: -8px;
          width: 10px;
          height: 14px;
          border-radius: 2px;
          background-color: hsl(var(--confetti-hue, 165), 80%, 55%);
          animation: ecd-confetti-fall var(--confetti-duration, 2200ms) var(--confetti-delay, 0ms) ease-in both;
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4"
        role="dialog"
        aria-modal="true"
        aria-label="Onboarding complete celebration"
      >
        {/* Confetti layer */}
        {confettiActive && (
          <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
            {CONFETTI_PIECES.map((piece, i) => (
              <span
                key={i}
                className="ecd-confetti-piece"
                style={{
                  left: piece.left,
                  '--confetti-hue': piece.hue,
                  '--confetti-drift': piece.drift,
                  '--confetti-duration': `${piece.durationMs}ms`,
                  '--confetti-delay': `${piece.delayMs}ms`,
                } as ConfettiStyle}
              />
            ))}
          </div>
        )}

        {/* Modal card */}
        <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700/60 shadow-2xl overflow-hidden">
          {/* Teal glow top bar */}
          <div className="h-1 w-full bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-500" />

          <div className="p-6 sm:p-8 text-center">
            {/* Icon */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-500/15 ring-1 ring-teal-500/30">
              <CheckCircle2 className="h-8 w-8 text-teal-400" aria-hidden />
            </div>

            <h2 className="text-xl font-semibold text-white mb-1">
              {centreName} is live!
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Families can now find your crèche and apply for free. Share your page to start getting enquiries.
            </p>

            {/* Share toolkit */}
            <div className="space-y-3 mb-6">
              <button
                onClick={handleCopy}
                className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700/80 transition-colors"
                type="button"
              >
                <span className="truncate text-left">{publicProfileUrl}</span>
                <span className="shrink-0 text-teal-400 font-medium">
                  {copied ? 'Copied!' : 'Copy'}
                </span>
              </button>

              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 px-4 py-3 text-sm font-medium text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
              >
                <Share2 className="h-4 w-4 shrink-0" aria-hidden />
                Share on WhatsApp
              </a>
            </div>

            {/* Go to dashboard */}
            <Link
              href={dashboardUrl}
              onClick={() => setVisible(false)}
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-teal-400 transition-colors"
            >
              Go to dashboard
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
