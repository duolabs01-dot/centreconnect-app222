'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type BillingInterval = 'monthly' | 'yearly'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 0,
    yearlyPrice: null as number | null,
    description: 'Free listing so parents can find you and apply.',
    features: [
      'Centre listing page',
      'Application teasers (see how many applied)',
      '1 logo + 1 preview image',
      'Contact details + map',
    ],
    cta: 'Get started free',
    ctaHref: '/for-centres/register',
  },
  {
    id: 'growth',
    name: 'Growth',
    monthlyPrice: 299,
    yearlyPrice: 2990 as number | null,
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
    cta: 'Start Growth',
    ctaHref: '/for-centres/register',
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 499,
    yearlyPrice: 4990 as number | null,
    description: 'Growth plus a website, priority support & unlimited uploads.',
    features: [
      'Everything in Growth',
      'Website Builder',
      'Priority WhatsApp support',
      'Unlimited uploads',
      'AI features (coming soon)',
    ],
    cta: 'Contact us',
    ctaHref: 'https://wa.me/27685356430?text=Hi%20Mandla%2C%20I%20am%20interested%20in%20CentreConnect%20Pro',
  },
]

export function PublicPricingToggle() {
  const [interval, setInterval] = useState<BillingInterval>('monthly')

  return (
    <div>
      {/* Interval Toggle */}
      <div className="mb-8 flex items-center justify-center">
        <div className="flex items-center rounded-full border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setInterval('monthly')}
            className={cn(
              'rounded-full px-5 py-2 text-sm font-bold transition-all',
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
              'flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-all',
              interval === 'yearly'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            Yearly
            <span className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-black transition-all',
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
      <div className="grid gap-6 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const effectiveMonthly =
            interval === 'yearly' && plan.yearlyPrice
              ? Math.round(plan.yearlyPrice / 12)
              : plan.monthlyPrice
          const showYearlySavings = interval === 'yearly' && plan.yearlyPrice !== null
          const yearlySavings = plan.yearlyPrice ? plan.monthlyPrice * 12 - plan.yearlyPrice : 0
          const isHighlighted = plan.id === 'growth'

          return (
            <div
              key={plan.id}
              className={cn(
                'relative flex flex-col rounded-3xl border p-6 transition-all',
                isHighlighted
                  ? 'border-teal-300 bg-gradient-to-b from-teal-50 to-white shadow-xl shadow-teal-100 ring-1 ring-teal-300'
                  : 'border-slate-200 bg-white shadow-sm'
              )}
            >
              {'badge' in plan && plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-teal-500 px-4 py-1 text-xs font-black text-white shadow-sm">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h3 className="text-base font-black text-slate-900">{plan.name}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">{plan.description}</p>
              </div>

              <div className="mb-6">
                {plan.monthlyPrice === 0 ? (
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-semibold text-slate-400 line-through">R199/mo</span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">Free pilot</span>
                    </div>
                    <div className="mt-0.5 flex items-baseline gap-1.5">
                      <span className="text-4xl font-black text-slate-900">Free</span>
                      <span className="text-sm font-medium text-slate-500">forever</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1">
                      {showYearlySavings && (
                        <span className="text-lg font-semibold text-slate-400 line-through">
                          R{plan.monthlyPrice}
                        </span>
                      )}
                      <span className="text-4xl font-black text-slate-900">R{effectiveMonthly}</span>
                      <span className="text-sm font-medium text-slate-500">/month</span>
                    </div>
                    {showYearlySavings ? (
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-500">
                          Billed R{plan.yearlyPrice}/year
                        </span>
                        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-black text-teal-700">
                          Save R{yearlySavings}/year
                        </span>
                      </div>
                    ) : (
                      interval === 'yearly' && plan.yearlyPrice === null && (
                        <p className="mt-1 text-xs text-slate-400">Monthly billing only</p>
                      )
                    )}
                  </>
                )}
              </div>

              <ul className="mb-6 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className={cn('mt-0.5 h-4 w-4 shrink-0', isHighlighted ? 'text-teal-500' : 'text-slate-400')} />
                    <span className="text-sm leading-5 text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                className={cn(
                  'block w-full rounded-2xl py-3 text-center text-sm font-black transition-all',
                  isHighlighted
                    ? 'bg-teal-500 text-white hover:bg-teal-600 shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                )}
              >
                {plan.cta}
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
