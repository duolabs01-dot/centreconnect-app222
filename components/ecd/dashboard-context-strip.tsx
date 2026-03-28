'use client'

import Link from 'next/link'
import { ArrowRight, Users, CalendarCheck2, ImageIcon } from 'lucide-react'
import type { InternalTier } from '@/lib/billing/plans'

type DashboardContextStripProps = {
  childrenCount: number
  attendanceToday: number
  hasLogo: boolean
  hasCover: boolean
  tier: InternalTier
}

type ContextAction = {
  icon: React.ReactNode
  message: string
  href: string
}

export function DashboardContextStrip({
  childrenCount,
  attendanceToday,
  hasLogo,
  hasCover,
}: DashboardContextStripProps) {
  let action: ContextAction | null = null

  if (childrenCount === 0) {
    action = {
      icon: <Users className="h-4 w-4 text-teal-600 shrink-0" aria-hidden />,
      message: 'Add your first children to enable attendance and daily reports',
      href: '/ecd/children/new',
    }
  } else if (attendanceToday === 0) {
    action = {
      icon: <CalendarCheck2 className="h-4 w-4 text-teal-600 shrink-0" aria-hidden />,
      message: "Mark who\u2019s here today \u2014 takes 30 seconds",
      href: '/ecd/attendance',
    }
  } else if (!hasLogo) {
    action = {
      icon: <ImageIcon className="h-4 w-4 text-teal-600 shrink-0" aria-hidden />,
      message: 'Upload your logo \u2014 parents judge in 2 seconds',
      href: '/ecd/profile',
    }
  } else if (!hasCover) {
    action = {
      icon: <ImageIcon className="h-4 w-4 text-teal-600 shrink-0" aria-hidden />,
      message: 'Add a cover photo to build trust with families',
      href: '/ecd/profile',
    }
  }

  if (!action) {
    return (
      <div className="rounded-2xl border border-teal-200 bg-teal-50/60 px-4 py-3">
        <p className="text-sm font-medium text-teal-800">
          \u2713 You\u2019re set up well. Check today\u2019s dashboard below.
        </p>
      </div>
    )
  }

  return (
    <Link
      href={action.href}
      className="group flex items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50/60 px-4 py-3 transition-colors hover:bg-teal-100/60"
    >
      {action.icon}
      <span className="flex-1 text-sm font-medium text-teal-800">{action.message}</span>
      <ArrowRight className="h-4 w-4 text-teal-600 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  )
}
