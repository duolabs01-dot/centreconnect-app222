export type InternalTier = 'basic' | 'standard' | 'premium'
export type PublicPlan = 'starter' | 'growth' | 'pro'
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'suspended'

type PlanDefinition = {
  label: string
  monthlyPrice: number
  yearlyPrice?: number // total billed annually (Growth-only promo)
  description: string
  includes: string[]
  outcomes: string[]
  website: {
    includes: string[]
    suggestedAddOns: string[]
  }
}

const PLAN_DEFINITIONS: Record<PublicPlan, PlanDefinition> = {
  starter: {
    label: 'Starter',
    monthlyPrice: 0,
    description: 'A free listing so parents can find your centre online and submit applications.',
    includes: [
      'Professional centre listing (parents can find you)',
      'Application teasers — see how many parents applied',
      '1 logo upload + 1 preview image',
      'Contact details + map page',
    ],
    outcomes: [
      'Get discovered by parents searching for ECD centres',
      'See application demand before committing to a paid plan',
      'No credit card required — free forever',
    ],
    website: {
      includes: ['Centre profile page', 'Contact details + map', 'Hero, About and Programs sections'],
      suggestedAddOns: ['Upgrade to Growth to manage applications', 'Unlock gallery + events sections'],
    },
  },
  growth: {
    label: 'Growth',
    monthlyPrice: 299,
    yearlyPrice: 2990, // 10 months for 12 — save R598/year
    description: 'Everything you need to run your centre day-to-day — attendance, admissions, reports, and more.',
    includes: [
      'Full admissions pipeline — manage every application',
      'Attendance register (with legacy data merge)',
      'Calendar and routine planning',
      'Daily Reports and Report Cards',
      'DOE Monthly Report export',
      'Employment and staff records',
      'Financials and compliance tracking',
      'Parent messaging and announcements',
    ],
    outcomes: [
      'Replace spreadsheets and WhatsApp chaos with one system',
      'Never miss a DOE filing deadline again',
      'Keep parents informed and your team aligned',
    ],
    website: {
      includes: ['Attendance and daily operations layer', 'Gallery + events + jobs sections', 'Richer public presentation'],
      suggestedAddOns: ['Domain setup help', 'Premium design pass'],
    },
  },
  pro: {
    label: 'Pro',
    monthlyPrice: 499,
    yearlyPrice: 4990, // 10 months for 12 — save R998/year
    description: 'Growth plus a professional website, priority support, and unlimited uploads.',
    includes: [
      'Everything in Growth',
      'Website Builder — full public site',
      'Priority WhatsApp support',
      'Unlimited photo and document uploads',
      'AI-powered features (coming soon)',
    ],
    outcomes: [
      'Own your online presence with a real website',
      'Get help faster when something needs fixing',
      'Never hit an upload limit',
    ],
    website: {
      includes: ['Full public + operations stack', 'All sections: gallery, events, jobs, programs', 'Custom domain support'],
      suggestedAddOns: ['Seasonal campaign design', 'Advanced integrations'],
    },
  },
}

const PUBLIC_TO_INTERNAL_TIER: Record<PublicPlan, InternalTier> = {
  starter: 'basic',
  growth: 'standard',
  pro: 'premium',
}

const INTERNAL_TO_PUBLIC_PLAN: Record<InternalTier, PublicPlan> = {
  basic: 'starter',
  standard: 'growth',
  premium: 'pro',
}

const PLAN_ALIAS_TO_PUBLIC_PLAN: Record<string, PublicPlan> = {
  starter: 'starter',
  basic: 'starter',
  pilot: 'starter',
  growth: 'growth',
  standard: 'growth',
  pro: 'pro',
  premium: 'pro',
}

export const PUBLIC_PLAN_OPTIONS: PublicPlan[] = ['starter', 'growth', 'pro']

export function toPublicPlan(input: string | null | undefined, fallback: PublicPlan = 'growth'): PublicPlan {
  const key = (input ?? '').trim().toLowerCase()
  return PLAN_ALIAS_TO_PUBLIC_PLAN[key] ?? fallback
}

export function isKnownPlanAlias(input: string | null | undefined) {
  const key = (input ?? '').trim().toLowerCase()
  if (!key) return false
  return key in PLAN_ALIAS_TO_PUBLIC_PLAN
}

export function toInternalTier(input: string | null | undefined, fallback: InternalTier = 'basic'): InternalTier {
  const publicPlan = toPublicPlan(input, INTERNAL_TO_PUBLIC_PLAN[fallback])
  return PUBLIC_TO_INTERNAL_TIER[publicPlan]
}

export function toPublicPlanFromInternal(tier: InternalTier): PublicPlan {
  return INTERNAL_TO_PUBLIC_PLAN[tier]
}

export function getPublicPlanDefinition(plan: PublicPlan) {
  return PLAN_DEFINITIONS[plan]
}

export function getInternalTierDefinition(tier: InternalTier) {
  return PLAN_DEFINITIONS[INTERNAL_TO_PUBLIC_PLAN[tier]]
}

export function getPublicPlanLabel(plan: PublicPlan) {
  return PLAN_DEFINITIONS[plan].label
}

export function getInternalTierLabel(tier: InternalTier) {
  return PLAN_DEFINITIONS[INTERNAL_TO_PUBLIC_PLAN[tier]].label
}

export function getPublicPlanPrice(plan: PublicPlan) {
  return PLAN_DEFINITIONS[plan].monthlyPrice
}

export function getPublicPlanYearlyPrice(plan: PublicPlan): number | null {
  return PLAN_DEFINITIONS[plan].yearlyPrice ?? null
}

export function getInternalTierPrice(tier: InternalTier) {
  return PLAN_DEFINITIONS[INTERNAL_TO_PUBLIC_PLAN[tier]].monthlyPrice
}

export function getWebsiteGuideByTier(tier: InternalTier) {
  const plan = INTERNAL_TO_PUBLIC_PLAN[tier]
  const definition = PLAN_DEFINITIONS[plan]
  return {
    label: definition.label,
    includes: definition.website.includes,
    suggestedAddOns: definition.website.suggestedAddOns,
  }
}

export function normalizeSubscriptionStatus(
  status: string | null | undefined,
  fallback: SubscriptionStatus = 'trial'
): SubscriptionStatus {
  const normalized = (status ?? '').trim().toLowerCase()
  if (
    normalized === 'trial' ||
    normalized === 'active' ||
    normalized === 'past_due' ||
    normalized === 'canceled' ||
    normalized === 'suspended'
  ) {
    return normalized
  }
  return fallback
}
