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
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Your plan</p>
          <p className="flex items-center gap-2 text-lg font-black text-slate-900">
            <span className={cn(
              'rounded-xl px-2.5 py-0.5 text-sm font-black',
              tier === 'standard' ? 'bg-teal-100 text-teal-700' :
              tier === 'premium' ? 'bg-purple-100 text-purple-700' :
              'bg-slate-100 text-slate-700'
            )}>
              {planLabel}
            </span>
            <span className="text-sm font-bold text-slate-500">
              R{monthlyPrice > 0 ? monthlyPrice : '0'}/month
            </span>
            {isTrial && (
              <span className="rounded-xl border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-700">
                Trial
              </span>
            )}
            {!isTrial && status !== 'active' && (
              <span className={cn(
                'rounded-xl border px-2 py-0.5 text-xs font-black',
                status === 'past_due' ? 'border-rose-300 bg-rose-100 text-rose-700' :
                'border-slate-300 bg-slate-100 text-slate-600'
              )}>
                {statusCopy(status)}
              </span>
            )}
          </p>
          {isTrial ? (
            <p className="text-xs font-semibold text-amber-700">
              {trialDaysRemaining === null
                ? 'Trial active — no charge yet.'
                : trialDaysRemaining === 0
                  ? 'Trial ends today. Add payment to continue.'
                  : `${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} left — add payment method now.`}
            </p>
          ) : null}
        </div>
        <Link
          href="/ecd/billing"
          className={cn(
            'inline-flex h-9 items-center justify-center rounded-xl border px-4 text-xs font-bold transition-colors',
            isTrial
              ? 'border-amber-300 text-amber-900 hover:bg-amber-100'
              : 'border-teal-300 text-teal-900 hover:bg-teal-100'
          )}
        >
          {isTrial ? 'Add payment' : 'Manage billing'}
        </Link>
      </div>

      {/* Feature pills */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {included.slice(0, 4).map((feature) => (
          <span key={feature} className="text-[11px] font-medium opacity-80">
            · {feature}
          </span>
        ))}
        {included.length > 4 && (
          <span className="text-[11px] font-medium text-teal-600 opacity-80">
            +{included.length - 4} more
          </span>
        )}
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
