'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface ApplyCTAProps {
  centreSlug: string
  variant: 'hero' | 'inline'
  userRole?: string | null
}

export function ApplyCTA({ centreSlug, variant, userRole }: ApplyCTAProps) {
  if (userRole === 'ecd_admin' || userRole === 'ecd_staff') return null

  const href = `/apply/${centreSlug}`

  if (variant === 'hero') {
    return (
      <Link
        href={href}
        className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl
                   bg-cyan-600 hover:bg-cyan-700 active:scale-[0.98]
                   text-white font-bold text-lg transition-all
                   shadow-[var(--shadow-elevation-3)] shadow-cyan-900/30"
      >
        Apply Now <ArrowRight className="w-5 h-5" />
      </Link>
    )
  }

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-cyan-600 hover:text-cyan-700
                 font-medium text-sm transition-colors"
    >
      Apply <ArrowRight className="w-3.5 h-3.5" />
    </Link>
  )
}


