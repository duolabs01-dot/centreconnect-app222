export type InternalTier = 'basic' | 'standard' | 'premium'
export type PublicPlan = 'starter' | 'growth' | 'pro'
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'suspended'

type PlanDefinition = {
  label: string
  monthlyPrice: number
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
    monthlyPrice: 199,
    description: 'Best for centres that want to fill open spaces and start quickly.',
    includes: [
      'Parent applications in one dashboard',
      'Announcements and direct parent messages',
      'Professional centre listing',
      'Structured child profile intake',
    ],
    outcomes: [
      'Capture parent interest faster from your listing',
      'Reduce manual admission follow-up',
      'Standardize parent communication from day one',
    ],
    website: {
      includes: ['Centre profile page', 'Contact details + map', 'Hero, About and Programs sections'],
      suggestedAddOns: ['Gallery expansion', 'Design polish support'],
    },
  },
  growth: {
    label: 'Growth',
    monthlyPrice: 299,
    description: 'For busy centres that need stronger daily operations and follow-up.',
    includes: [
      'Everything in Starter',
      'Attendance and calendar workflows',
      'Faster admissions follow-up and reminders',
      'Daily operational tracking',
    ],
    outcomes: [
      'Improve daily operations consistency',
      'Increase conversion from application to enrollment',
      'Keep teams aligned on child updates and attendance',
    ],
    website: {
      includes: ['Everything in Starter', 'Gallery + events + jobs sections', 'Richer public presentation'],
      suggestedAddOns: ['Domain setup help', 'Premium design pass'],
    },
  },
  pro: {
    label: 'Pro',
    monthlyPrice: 499,
    description: 'For high-volume centres that want full control and priority support.',
    includes: [
      'Everything in Growth',
      'Website and growth tools',
      'Priority onboarding and support',
      'Advanced configuration support',
    ],
    outcomes: [
      'Operate admissions and centre visibility in one place',
      'Present a stronger public profile to parents',
      'Move faster with high-touch rollout support',
    ],
    website: {
      includes: ['Everything in Growth', 'Highest website support priority', 'Full growth stack compatibility'],
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
