import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  getInternalTierDefinition,
  getInternalTierLabel,
  normalizeSubscriptionStatus,
  toInternalTier,
} from '@/lib/billing/plans'

type TrialStatusBannerProps = {
  subscription?: {
    tier?: string | null
    status?: string | null
    monthlyPrice?: number | null
    trialEndsAt?: string | null
  } | null
  className?: string
}

function getTrialDaysRemaining(trialEndsAt: string | null | undefined) {
  if (!trialEndsAt) return null
  const end = new Date(trialEndsAt)
  if (Number.isNaN(end.getTime())) return null
  const now = new Date()
  const msPerDay = 24 * 60 * 60 * 1000
  const diff = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / msPerDay))
}

function statusCopy(status: string) {
  if (status === 'trial') return 'Trial'
  if (status === 'active') return 'Active'
  if (status === 'past_due') return 'Past due'
  if (status === 'canceled') return 'Canceled'
  if (status === 'suspended') return 'Suspended'
  return 'Unknown'
}

export function TrialStatusBanner({ subscription, className }: TrialStatusBannerProps) {
  const tier = toInternalTier(subscription?.tier, 'basic')
  const status = normalizeSubscriptionStatus(subscription?.status, 'trial')
  const planLabel = getInternalTierLabel(tier)
  const monthlyPrice = Number(subscription?.monthlyPrice ?? getInternalTierDefinition(tier).monthlyPrice)
  const included = getInternalTierDefinition(tier).includes
  const trialDaysRemaining = getTrialDaysRemaining(subscription?.trialEndsAt)
  const isTrial = status === 'trial'

  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-3 shadow-sm',
        isTrial ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-teal-200 bg-teal-50 text-teal-900',
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Current package</p>
          <p className="mt-1 text-sm font-black">
            {planLabel} | {statusCopy(status)} {monthlyPrice > 0 ? `| R${monthlyPrice}/month` : '| R0/month'}
          </p>
          {isTrial ? (
            <p className="mt-1 text-xs font-semibold">
              {trialDaysRemaining === null
                ? 'Trial active.'
                : trialDaysRemaining === 0
                  ? 'Trial ends today.'
                  : `${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} left in trial.`}
            </p>
          ) : null}
        </div>
        <Link
          href="/ecd/billing"
          className={cn(
            'inline-flex h-8 items-center justify-center rounded-xl border px-3 text-xs font-bold transition-colors',
            isTrial
              ? 'border-amber-300 text-amber-900 hover:bg-amber-100'
              : 'border-teal-300 text-teal-900 hover:bg-teal-100'
          )}
        >
          View billing
        </Link>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {included.slice(0, 3).map((feature) => (
          <span key={feature} className="text-[11px] font-medium opacity-90">
            - {feature}
          </span>
        ))}
      </div>
    </div>
  )
}

type OnboardingChecklistCardProps = {
  items: Array<{ id: string; label: string; done: boolean; href: string }>
  className?: string
}

export function OnboardingChecklistCard({ items, className }: OnboardingChecklistCardProps) {
  const completed = items.filter((item) => item.done).length
  const total = items.length
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className={cn('rounded-3xl border border-slate-100 bg-white p-5 shadow-sm', className)}>
      <div className="mb-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Quick first steps</p>
        <p className="mt-1 text-sm font-black text-slate-900">
          {completed}/{total} complete ({percent}%)
        </p>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              'block rounded-2xl border px-3 py-2 text-xs font-medium transition-colors',
              item.done
                ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
                : 'border-slate-100 bg-slate-50 text-slate-700 hover:bg-slate-100'
            )}
          >
            <span className="inline-flex items-center gap-2">
              <span aria-hidden>{item.done ? '[x]' : '[ ]'}</span>
              <span>{item.label}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
