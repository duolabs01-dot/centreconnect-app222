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
  const trialDaysRemaining = getTrialDaysRemaining(subscription?.trialEndsAt)
  const isTrial = status === 'trial'

  return (
    <div
      className={cn(
        'rounded-lg border px-2 py-1.5 shadow-sm',
        isTrial ? 'border-amber-200/80 bg-amber-50/80 text-amber-900' : 'border-teal-200/80 bg-teal-50/80 text-teal-900',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[9px] font-black uppercase tracking-widest opacity-60 shrink-0">Pkg</span>
          <span className="text-[11px] font-semibold truncate">
            {planLabel} · {statusCopy(status)}{monthlyPrice > 0 ? ` · R${monthlyPrice}/mo` : ''}
          </span>
          {isTrial && trialDaysRemaining !== null && (
            <span className={cn(
              'inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold shrink-0',
              trialDaysRemaining <= 1 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
            )}>
              {trialDaysRemaining === 0 ? 'Trial ends today' : `${trialDaysRemaining}d left`}
            </span>
          )}
        </div>
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
