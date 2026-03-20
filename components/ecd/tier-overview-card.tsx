'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tier = 'starter' | 'growth' | 'pro'
type PlanStatus = 'current' | 'upgrade' | 'downgrade'

type FeatureRow = {
  label: string
  starter: React.ReactNode
  growth: React.ReactNode
  pro: React.ReactNode
  note?: string
}

const TIERS: { key: Tier; label: string; price: number; color: string; bg: string; border: string; badge: string }[] = [
  {
    key: 'starter',
    label: 'Starter',
    price: 199,
    color: 'text-slate-700',
    bg: 'bg-white',
    border: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-600',
  },
  {
    key: 'growth',
    label: 'Growth',
    price: 299,
    color: 'text-teal-700',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    badge: 'bg-teal-100 text-teal-700',
  },
  {
    key: 'pro',
    label: 'Pro',
    price: 499,
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    badge: 'bg-purple-100 text-purple-700',
  },
]

const CheckOrDash = ({ has }: { has: React.ReactNode }) =>
  typeof has === 'boolean' ? (
    has ? (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-teal-600">
        <Check className="h-3.5 w-3.5" />
      </span>
    ) : (
      <span className="text-slate-300 text-sm font-medium">—</span>
    )
  ) : (
    <span className="text-xs font-medium text-teal-700">{has}</span>
  )

const FeatureLabel = ({ label, note }: { label: string; note?: string }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-sm font-medium text-slate-700">{label}</span>
    {note && <span className="text-[11px] text-slate-400">{note}</span>}
  </div>
)

// Full feature comparison
const featureRows: FeatureRow[] = [
  // Discovery & Admissions
  { label: 'Professional centre listing', starter: true, growth: true, pro: true },
  { label: 'Appear in parent search results', starter: true, growth: true, pro: true },
  { label: 'Online parent applications', starter: true, growth: true, pro: true },
  { label: 'Parent enquiry messages', starter: true, growth: true, pro: true },
  { label: 'Structured child intake forms', starter: true, growth: true, pro: true },
  // Daily Operations
  { label: 'Attendance register', starter: false, growth: true, pro: true, note: 'Mark presence daily' },
  { label: 'Calendar and routine planning', starter: false, growth: true, pro: true, note: 'Plan events and activities' },
  { label: 'Daily operational tracking', starter: false, growth: true, pro: true, note: 'Track what happens each day' },
  { label: 'Daily report notes', starter: false, growth: true, pro: true, note: 'Share updates with parents' },
  { label: 'Report cards', starter: false, growth: true, pro: true },
  // Public Website
  { label: 'Basic public profile page', starter: true, growth: true, pro: true },
  { label: 'Gallery section', starter: false, growth: true, pro: true },
  { label: 'Events section', starter: false, growth: true, pro: true },
  { label: 'Jobs section', starter: false, growth: true, pro: true },
  { label: 'Richer website sections', starter: false, growth: false, pro: true, note: 'Programs, team, testimonials' },
  // Support & Onboarding
  { label: 'Email support', starter: true, growth: true, pro: true },
  { label: 'WhatsApp support', starter: true, growth: true, pro: true },
  { label: 'Onboarding guidance', starter: false, growth: 'Priority', pro: true, note: 'Growth: guided setup | Pro: personal walkthrough' },
  { label: 'Priority onboarding help', starter: false, growth: false, pro: true },
  // Billing
  { label: 'Subscription billing via Paystack', starter: true, growth: true, pro: true },
  { label: 'Invoice generation', starter: true, growth: true, pro: true },
]

type TierOverviewCardProps = {
  currentTier?: string | null
  subscriptionStatus?: string | null
  compact?: boolean
}

export function TierOverviewCard({ currentTier, subscriptionStatus, compact }: TierOverviewCardProps) {
  const current = (currentTier ?? 'starter') as Tier
  const isTrial = subscriptionStatus === 'trial'
  const isActive = subscriptionStatus === 'active'

  if (compact) {
    const tier = TIERS.find(t => t.key === current)
    return (
      <div className={cn('rounded-2xl border px-4 py-3', tier?.border, tier?.bg)}>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Current plan</p>
        <p className={cn('mt-1 text-base font-black', tier?.color)}>
          {tier?.label}
          {isTrial && <span className="ml-2 text-xs font-bold text-amber-600">· Trial</span>}
        </p>
        <p className="text-sm font-bold text-slate-600">R{tier?.price}/month</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="grid grid-cols-4 gap-3">
        <div /> {/* label column */}
        {TIERS.map(tier => (
          <div
            key={tier.key}
            className={cn('rounded-2xl border p-4 text-center', tier.bg, tier.border, current === tier.key && 'ring-2 ring-teal-400')}
          >
            {current === tier.key && (
              <span className="mb-2 inline-block rounded-full bg-teal-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">
                Current
              </span>
            )}
            <p className={cn('text-lg font-black', tier.color)}>{tier.label}</p>
            <p className="mt-1 text-2xl font-black text-slate-900">R{tier.price}</p>
            <p className="text-[11px] text-slate-500">per month</p>
          </div>
        ))}
      </div>

      {/* Feature rows */}
      <div className="space-y-2">
        {/* Group: Discovery & Admissions */}
        <p className="pt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Discovery &amp; Admissions</p>
        {featureRows.filter(r => ['Professional centre listing', 'Appear in parent search results', 'Online parent applications', 'Parent enquiry messages', 'Structured child intake forms'].includes(r.label)).map(row => (
          <div key={row.label} className="grid grid-cols-4 items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3">
            <FeatureLabel label={row.label} note={row.note} />
            {TIERS.map(t => <div key={t.key} className="flex justify-center"><CheckOrDash has={row[t.key] === true ? true : row[t.key]} /></div>)}
          </div>
        ))}

        {/* Group: Daily Operations */}
        <p className="pt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Daily Operations</p>
        {featureRows.filter(r => ['Attendance register', 'Calendar and routine planning', 'Daily operational tracking', 'Daily report notes', 'Report cards'].includes(r.label)).map(row => (
          <div key={row.label} className="grid grid-cols-4 items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3">
            <FeatureLabel label={row.label} note={row.note} />
            {TIERS.map(t => <div key={t.key} className="flex justify-center"><CheckOrDash has={row[t.key] === true ? true : row[t.key]} /></div>)}
          </div>
        ))}

        {/* Group: Public Website */}
        <p className="pt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Public Website</p>
        {featureRows.filter(r => ['Basic public profile page', 'Gallery section', 'Events section', 'Jobs section', 'Richer website sections'].includes(r.label)).map(row => (
          <div key={row.label} className="grid grid-cols-4 items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3">
            <FeatureLabel label={row.label} note={row.note} />
            {TIERS.map(t => <div key={t.key} className="flex justify-center"><CheckOrDash has={row[t.key] === true ? true : row[t.key]} /></div>)}
          </div>
        ))}

        {/* Group: Support */}
        <p className="pt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Support &amp; Onboarding</p>
        {featureRows.filter(r => ['Email support', 'WhatsApp support', 'Onboarding guidance', 'Priority onboarding help'].includes(r.label)).map(row => (
          <div key={row.label} className="grid grid-cols-4 items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3">
            <FeatureLabel label={row.label} note={row.note} />
            {TIERS.map(t => <div key={t.key} className="flex justify-center"><CheckOrDash has={row[t.key] === true ? true : row[t.key]} /></div>)}
          </div>
        ))}
      </div>
    </div>
  )
}
