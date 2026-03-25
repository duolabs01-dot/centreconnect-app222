'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type BillingInterval = 'monthly' | 'yearly'

type PlanCardProps = {
  name: string
  monthlyPrice: number
  yearlyPrice: number | null
  description: string
  features: string[]
  interval: BillingInterval
  isCurrent: boolean
  isHighlighted?: boolean
  ctaLabel: string
  ctaHref: string
  badge?: string
}

function PlanCard({
  name,
  monthlyPrice,
  yearlyPrice,
  description,
  features,
  interval,
  isCurrent,
  isHighlighted,
  ctaLabel,
  ctaHref,
  badge,
}: PlanCardProps) {
  const effectiveMonthly = interval === 'yearly' && yearlyPrice ? Math.round(yearlyPrice / 12) : monthlyPrice
  const showYearlySavings = interval === 'yearly' && yearlyPrice !== null
  const yearlySavings = yearlyPrice ? monthlyPrice * 12 - yearlyPrice : 0

  return (
    <div className={cn(
      'relative flex flex-col rounded-3xl border p-6 transition-all',
      isHighlighted
        ? 'border-teal-300 bg-gradient-to-b from-teal-50 to-white shadow-lg shadow-teal-100 ring-1 ring-teal-300'
        : 'border-slate-200 bg-white shadow-sm',
      isCurrent && 'ring-2 ring-teal-400'
    )}>
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-teal-500 px-3 py-1 text-[11px] font-black text-white shadow-sm">
            {badge}
          </span>
        </div>
      )}
      {isCurrent && (
        <div className="absolute -top-3 right-4">
          <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-black text-white shadow-sm">
            Your plan
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-base font-black text-slate-900">{name}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>

      <div className="mb-6">
        {monthlyPrice === 0 ? (
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-slate-400 line-through">R199/mo</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">Free pilot</span>
            </div>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-4xl font-black text-slate-900">Free</span>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-1">
              {showYearlySavings && (
                <span className="text-base font-semibold text-slate-400 line-through">R{monthlyPrice}</span>
              )}
              <span className="text-4xl font-black text-slate-900">R{effectiveMonthly}</span>
              <span className="text-sm font-medium text-slate-500">/month</span>
            </div>
            {showYearlySavings ? (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-slate-500">Billed R{yearlyPrice}/year</span>
                <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-black text-teal-700">
                  Save R{yearlySavings}/year
                </span>
              </div>
            ) : (
              interval === 'yearly' && yearlyPrice === null && (
                <p className="mt-1 text-xs text-slate-400">Monthly only</p>
              )
            )}
          </>
        )}
      </div>

      <ul className="mb-6 flex-1 space-y-2">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-500" />
            <span className="text-xs leading-5 text-slate-600">{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href={ctaHref}
        className={cn(
          'block w-full rounded-2xl py-2.5 text-center text-sm font-black transition-all',
          isHighlighted
            ? 'bg-teal-500 text-white hover:bg-teal-600 shadow-sm'
            : isCurrent
            ? 'border border-slate-200 bg-slate-50 text-slate-500 cursor-default pointer-events-none'
            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        )}
      >
        {ctaLabel}
      </Link>
    </div>
  )
}

type BillingPricingToggleProps = {
  currentTier: string
}

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 0,
    yearlyPrice: null,
    description: 'Free listing so parents can find you and apply.',
    features: [
      'Centre listing page',
      'Application teasers (see count)',
      '1 logo + 1 preview image',
      'Contact details + map',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    monthlyPrice: 299,
    yearlyPrice: 2990,
    description: 'Full daily operations — attendance, admissions, reports.',
    features: [
      'Full admissions pipeline',
      'Attendance register',
      'Daily Reports + Report Cards',
      'DOE Monthly Report export',
      'Calendar & routine planning',
      'Employment & staff records',
      'Financials & compliance',
      'Parent messaging',
    ],
    badge: 'Most popular',
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 499,
    yearlyPrice: 4990,
    description: 'Growth plus a website, priority support & unlimited uploads.',
    features: [
      'Everything in Growth',
      'Website Builder',
      'Priority WhatsApp support',
      'Unlimited uploads',
      'AI features (coming soon)',
    ],
  },
]

export function BillingPricingToggle({ currentTier }: BillingPricingToggleProps) {
  const [interval, setInterval] = useState<BillingInterval>('monthly')

  const internalToId: Record<string, string> = {
    basic: 'starter',
    standard: 'growth',
    premium: 'pro',
  }
  const currentPlanId = internalToId[currentTier] ?? 'starter'

  return (
    <div>
      {/* Interval Toggle */}
      <div className="mb-6 flex items-center justify-center">
        <div className="flex items-center rounded-full border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setInterval('monthly')}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-bold transition-all',
              interval === 'monthly'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setInterval('yearly')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-all',
              interval === 'yearly'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            Yearly
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[9px] font-black transition-all',
              interval === 'yearly'
                ? 'bg-teal-100 text-teal-700'
                : 'bg-slate-200 text-slate-500'
            )}>
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            name={plan.name}
            monthlyPrice={plan.monthlyPrice}
            yearlyPrice={plan.yearlyPrice}
            description={plan.description}
            features={plan.features}
            interval={interval}
            isCurrent={plan.id === currentPlanId}
            isHighlighted={plan.id === 'growth'}
            badge={'badge' in plan ? plan.badge : undefined}
            ctaLabel={
              plan.id === currentPlanId
                ? 'Current plan'
                : plan.monthlyPrice === 0
                ? 'Downgrade'
                : 'Contact us to upgrade'
            }
            ctaHref={
              plan.id === currentPlanId
                ? '#'
                : 'https://wa.me/27685356430?text=Hi%20Mandla%2C%20I%20would%20like%20to%20upgrade%20my%20CentreConnect%20plan'
            }
          />
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        To upgrade or change your plan, contact us on WhatsApp. Yearly billing available for Growth only.
      </p>
    </div>
  )
}
