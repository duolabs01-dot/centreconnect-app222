'use client'

import Link from 'next/link'
import { ArrowRight, Users, ClipboardList, CalendarCheck2, FileCheck, ShieldCheck, FileText, MessagesSquare, Globe } from 'lucide-react'
import type { InternalTier } from '@/lib/billing/plans'
import { cn } from '@/lib/utils'

type DiscoveryCard = {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  minTier: InternalTier
  tone: string
}

const DISCOVERY_CARDS: DiscoveryCard[] = [
  {
    title: 'Families can find you',
    description: 'Your public listing is live. Share the link with parents in your area.',
    href: '/ecd/website',
    icon: <Globe className="h-5 w-5" aria-hidden />,
    minTier: 'basic',
    tone: 'border-teal-200 bg-teal-50/80 text-teal-700',
  },
  {
    title: 'See who\u2019s applying',
    description: 'Review applications from families who found your cr\u00e8che.',
    href: '/ecd/applications',
    icon: <ClipboardList className="h-5 w-5" aria-hidden />,
    minTier: 'basic',
    tone: 'border-cyan-200 bg-cyan-50/80 text-cyan-700',
  },
  {
    title: 'Take attendance',
    description: "Mark who's here today. Keeps your DSD register accurate.",
    href: '/ecd/attendance',
    icon: <CalendarCheck2 className="h-5 w-5" aria-hidden />,
    minTier: 'basic',
    tone: 'border-blue-200 bg-blue-50/80 text-blue-700',
  },
  {
    title: 'DOE monthly report',
    description: 'Generate your government-required DSD report in one click.',
    href: '/ecd/dsd-export',
    icon: <FileCheck className="h-5 w-5" aria-hidden />,
    minTier: 'basic',
    tone: 'border-indigo-200 bg-indigo-50/80 text-indigo-700',
  },
  {
    title: 'Safe pickup',
    description: 'QR-based collection verification. Replace your paper book.',
    href: '/ecd/pickup',
    icon: <ShieldCheck className="h-5 w-5" aria-hidden />,
    minTier: 'standard',
    tone: 'border-violet-200 bg-violet-50/80 text-violet-700',
  },
  {
    title: 'Send daily updates',
    description: 'Photo + note for each child. Parents love knowing their child\u2019s day.',
    href: '/ecd/daily-reports',
    icon: <FileText className="h-5 w-5" aria-hidden />,
    minTier: 'standard',
    tone: 'border-purple-200 bg-purple-50/80 text-purple-700',
  },
  {
    title: 'Message all parents',
    description: 'Send announcements to every parent at once. No WhatsApp groups needed.',
    href: '/ecd/communications',
    icon: <MessagesSquare className="h-5 w-5" aria-hidden />,
    minTier: 'standard',
    tone: 'border-pink-200 bg-pink-50/80 text-pink-700',
  },
  {
    title: 'Build your website',
    description: 'Customise your public profile, gallery, and contact details.',
    href: '/ecd/website',
    icon: <Globe className="h-5 w-5" aria-hidden />,
    minTier: 'premium',
    tone: 'border-amber-200 bg-amber-50/80 text-amber-700',
  },
]

const TIER_ORDER: Record<InternalTier, number> = { basic: 0, standard: 1, premium: 2 }

function meetsMinTier(tier: InternalTier, minTier: InternalTier): boolean {
  return TIER_ORDER[tier] >= TIER_ORDER[minTier]
}

type FeatureDiscoveryCardsProps = {
  tier: InternalTier
  publicProfileUrl?: string
}

export function FeatureDiscoveryCards({ tier, publicProfileUrl }: FeatureDiscoveryCardsProps) {
  const visibleCards = DISCOVERY_CARDS.filter((card) => meetsMinTier(tier, card.minTier))

  // Override "Families can find you" href with actual public profile URL when available
  const cardsWithUrls = visibleCards.map((card) =>
    card.title === 'Families can find you' && publicProfileUrl
      ? { ...card, href: publicProfileUrl }
      : card
  )

  const showUpgradeCard = tier === 'basic'

  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 mb-3">
        Explore your features
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {cardsWithUrls.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            target={card.href.startsWith('http') ? '_blank' : undefined}
            rel={card.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            className={cn(
              'group flex items-start gap-3 rounded-2xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
              card.tone
            )}
          >
            <span className="mt-0.5 shrink-0">{card.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-900">{card.title}</p>
              <p className="mt-0.5 text-xs leading-5 text-slate-600">{card.description}</p>
            </div>
            <ArrowRight
              className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        ))}

        {showUpgradeCard && (
          <Link
            href="/ecd/billing"
            className="group flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:col-span-2"
          >
            <Users className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
            <div className="flex-1">
              <p className="text-sm font-black text-amber-900">Unlock daily operations</p>
              <p className="mt-0.5 text-xs leading-5 text-amber-700">
                R299/month \u2014 attendance history, daily reports, parent messaging, safe pickup, and more.
              </p>
            </div>
            <ArrowRight
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        )}
      </div>
    </div>
  )
}
