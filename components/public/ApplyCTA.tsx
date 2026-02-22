'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface ApplyCTAProps {
  centreSlug: string
  variant: 'hero' | 'sticky' | 'inline'
  userRole?: string | null
}

export function ApplyCTA({ centreSlug, variant, userRole }: ApplyCTAProps) {
  if (userRole === 'ecd_admin' || userRole === 'ecd_staff') return null

  const href = `/apply/${centreSlug}`

  if (variant === 'sticky') {
    return (
      <div
        className="fixed bottom-0 inset-x-0 z-40 md:hidden
                   bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl
                   border-t border-border
                   px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      >
        <Link
          href={href}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl
                     bg-cyan-600 hover:bg-cyan-700 active:scale-[0.98]
                     text-white font-semibold text-base transition-all"
        >
          Apply Now <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  if (variant === 'hero') {
    return (
      <Link
        href={href}
        className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl
                   bg-cyan-600 hover:bg-cyan-700 active:scale-[0.98]
                   text-white font-bold text-lg transition-all
                   shadow-lg shadow-cyan-900/30"
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
