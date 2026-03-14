'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type BannerContext = 'ecd' | 'parent'

type BannerContent = {
  title: string
  message: string
  cta?: string
  ctaHref?: string
}

type BannerConfig = {
  [key in BannerContext]: BannerContent[]
}

const BANNER_CONTENT: BannerConfig = {
  ecd: [
    {
      title: 'Go Digital in Minutes',
      message: 'Paper register to digital, in minutes! Upload your existing attendance list and we\'ll set everything up for you.',
      cta: 'Try it now',
      ctaHref: '/ecd/ai-upload',
    },
    {
      title: 'Simplify Your DSD Compliance',
      message: 'Generate your Department of Social Development pack with one click. All required forms auto-populated.',
      cta: 'Generate DSD pack',
      ctaHref: '/ecd/dsd-export',
    },
    {
      title: 'Parents Love Daily Updates',
      message: 'Send photos and daily reports to parents automatically. Build trust and reduce your WhatsApp workload.',
      cta: 'Set up daily reports',
      ctaHref: '/ecd/daily-reports',
    },
    {
      title: 'Safe Pickup Verification',
      message: 'Replace paper collection books with secure PIN-based pickup. Parents get instant peace of mind.',
      cta: 'Enable safe pickup',
      ctaHref: '/ecd/pickup',
    },
    {
      title: 'Free Trial Active',
      message: 'Your 14-day trial includes all premium features. Add your children, try attendance, explore everything.',
      cta: 'Start setup',
      ctaHref: '/ecd/children/new',
    },
  ],
  parent: [
    {
      title: 'Stay Connected to Your Child\'s Day',
      message: 'Get daily photos, meals, and activities straight to your phone. Never miss a moment.',
      cta: 'View today\'s update',
      ctaHref: '/parent/dashboard',
    },
    {
      title: 'Easy Fee Payments',
      message: 'Pay creche fees securely through the app. Set up recurring payments and never miss a due date.',
      cta: 'Manage payments',
      ctaHref: '/parent/fees',
    },
    {
      title: 'Instant Notifications',
      message: 'Know immediately when your child arrives, has a meal, or gets picked up. Real-time peace of mind.',
      cta: 'Enable notifications',
      ctaHref: '/parent/settings',
    },
    {
      title: 'Access Documents Anytime',
      message: 'View receipts, reports, and compliance documents whenever you need them. All in one place.',
      cta: 'View documents',
      ctaHref: '/parent/documents',
    },
    {
      title: 'Welcome to CentreConnect',
      message: 'The easiest way to stay connected with your creche. Let\'s get you set up.',
      cta: 'Complete profile',
      ctaHref: '/parent/profile',
    },
  ],
}

const MAX_SHOWS = 5
const STORAGE_KEY = 'centreconnect_feature_banner'

function getStorageKey(context: BannerContext): string {
  return `${STORAGE_KEY}_${context}`
}

function getShowCount(context: BannerContext): number {
  if (typeof window === 'undefined') return 0
  try {
    const stored = localStorage.getItem(getStorageKey(context))
    return stored ? parseInt(stored, 10) : 0
  } catch {
    return 0
  }
}

function incrementShowCount(context: BannerContext): void {
  if (typeof window === 'undefined') return
  try {
    const current = getShowCount(context)
    localStorage.setItem(getStorageKey(context), String(current + 1))
  } catch {
    // Ignore localStorage errors
  }
}

function dismissBanner(context: BannerContext): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(getStorageKey(context), String(MAX_SHOWS))
  } catch {
    // Ignore localStorage errors
  }
}

export function FeatureBanner({ context }: { context: BannerContext }) {
  const [isVisible, setIsVisible] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    const showCount = getShowCount(context)
    if (showCount >= MAX_SHOWS) {
      setIsDismissed(true)
      return
    }

    const timer = setTimeout(() => {
      setIsVisible(true)
      incrementShowCount(context)
    }, 800)

    return () => clearTimeout(timer)
  }, [context])

  useEffect(() => {
    if (!isVisible) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const content = BANNER_CONTENT[context]
        const next = (prev + 1) % content.length
        return next
      })
    }, 8000)

    return () => clearInterval(interval)
  }, [isVisible, context])

  const handleDismiss = () => {
    setIsVisible(false)
    dismissBanner(context)
    setIsDismissed(true)
  }

  if (isDismissed || !isVisible) {
    return null
  }

  const content = BANNER_CONTENT[context][currentIndex]

  return (
    <div
      className={cn(
        'overflow-hidden rounded-3xl border border-cyan-200 bg-gradient-to-r from-cyan-50 via-white to-teal-50 shadow-lg transition-all duration-500',
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      )}
    >
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="flex-1 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">
            {context === 'ecd' ? '💡 Feature tip' : '✨ New on CentreConnect'}
          </p>
          <h3 className="text-lg font-black text-slate-900">{content.title}</h3>
          <p className="text-sm leading-relaxed text-slate-600">{content.message}</p>
          {content.cta && content.ctaHref && (
            <a
              href={content.ctaHref}
              className="inline-flex mt-2 items-center rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-cyan-700"
            >
              {content.cta}
            </a>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex justify-center gap-1.5 pb-3">
        {BANNER_CONTENT[context].map((_, idx) => (
          <span
            key={idx}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              idx === currentIndex ? 'w-6 bg-cyan-500' : 'w-1.5 bg-slate-200'
            )}
          />
        ))}
      </div>
    </div>
  )
}
