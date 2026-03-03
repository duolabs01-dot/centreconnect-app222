import { calculateAge } from '@/lib/utils'

export const AGE_GROUP_PRICE_BANDS = [
  { key: '0-2', label: '0-2 years', minAge: 0, maxAgeExclusive: 2 },
  { key: '2-4', label: '2-4 years', minAge: 2, maxAgeExclusive: 4 },
  { key: '4-6', label: '4-6 years', minAge: 4, maxAgeExclusive: 6 },
  { key: '6+', label: 'Aftercare (6+)', minAge: 6, maxAgeExclusive: null },
] as const

export type AgeGroupPricingKey = (typeof AGE_GROUP_PRICE_BANDS)[number]['key']

export type AgeGroupPricingEntry = {
  label: string
  monthly_fee_cents: number
}

export type AgeGroupPricingMap = Record<AgeGroupPricingKey, AgeGroupPricingEntry>

export type ResolvedAgeGroupFee = {
  ageGroupKey: AgeGroupPricingKey
  ageGroupLabel: string
  monthlyFeeCents: number
}

const MAX_MONTHLY_FEE_CENTS = 10_000_000 // R100,000 cap for sanity.

function sanitizeMonthlyFeeCents(value: unknown, fallback = 0) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  const rounded = Math.round(numeric)
  if (rounded <= 0) return 0
  if (rounded > MAX_MONTHLY_FEE_CENTS) return MAX_MONTHLY_FEE_CENTS
  return rounded
}

function fallbackFeeCentsFromRand(fallbackMonthlyFeeRand: number | null | undefined) {
  if (typeof fallbackMonthlyFeeRand !== 'number' || !Number.isFinite(fallbackMonthlyFeeRand)) return 0
  return sanitizeMonthlyFeeCents(Math.round(fallbackMonthlyFeeRand * 100))
}

function emptyPricingMap(baseFeeCents = 0): AgeGroupPricingMap {
  return AGE_GROUP_PRICE_BANDS.reduce((acc, band) => {
    acc[band.key] = {
      label: band.label,
      monthly_fee_cents: baseFeeCents,
    }
    return acc
  }, {} as AgeGroupPricingMap)
}

function toBandKeyForAge(ageYears: number | null | undefined): AgeGroupPricingKey {
  if (typeof ageYears !== 'number' || !Number.isFinite(ageYears) || ageYears < 0) return '2-4'
  if (ageYears < 2) return '0-2'
  if (ageYears < 4) return '2-4'
  if (ageYears < 6) return '4-6'
  return '6+'
}

export function normalizeAgeGroupPricing(
  raw: unknown,
  fallbackMonthlyFeeRand?: number | null
): AgeGroupPricingMap {
  const fallbackCents = fallbackFeeCentsFromRand(fallbackMonthlyFeeRand)
  const normalized = emptyPricingMap(fallbackCents)

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return normalized
  }

  for (const band of AGE_GROUP_PRICE_BANDS) {
    const entry = (raw as Record<string, unknown>)[band.key]
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue

    const label = String((entry as Record<string, unknown>).label ?? '').trim() || band.label
    const monthlyFeeCents = sanitizeMonthlyFeeCents(
      (entry as Record<string, unknown>).monthly_fee_cents,
      fallbackCents
    )

    normalized[band.key] = {
      label,
      monthly_fee_cents: monthlyFeeCents,
    }
  }

  return normalized
}

export function buildAgeGroupPricingFromRandInput(
  input: Partial<Record<AgeGroupPricingKey, string>>,
  fallbackMonthlyFeeRand?: number | null
): AgeGroupPricingMap {
  const fallbackCents = fallbackFeeCentsFromRand(fallbackMonthlyFeeRand)
  const normalized = emptyPricingMap(fallbackCents)

  for (const band of AGE_GROUP_PRICE_BANDS) {
    const rawRand = Number(input[band.key] ?? '')
    if (!Number.isFinite(rawRand) || rawRand < 0) {
      normalized[band.key] = { label: band.label, monthly_fee_cents: 0 }
      continue
    }
    normalized[band.key] = {
      label: band.label,
      monthly_fee_cents: sanitizeMonthlyFeeCents(Math.round(rawRand * 100)),
    }
  }

  return normalized
}

export function resolveAgeGroupFeeForDateOfBirth(params: {
  dateOfBirth?: string | null
  ageGroupPricing: unknown
  fallbackMonthlyFeeRand?: number | null
}): ResolvedAgeGroupFee | null {
  const normalized = normalizeAgeGroupPricing(params.ageGroupPricing, params.fallbackMonthlyFeeRand)
  const age = params.dateOfBirth ? calculateAge(params.dateOfBirth) : null
  const ageGroupKey = toBandKeyForAge(age)
  const selected = normalized[ageGroupKey]
  if (!selected || selected.monthly_fee_cents <= 0) return null
  return {
    ageGroupKey,
    ageGroupLabel: selected.label,
    monthlyFeeCents: selected.monthly_fee_cents,
  }
}

export function getAgeGroupPricingSummary(pricing: AgeGroupPricingMap) {
  const values = Object.values(pricing)
    .map((entry) => entry.monthly_fee_cents)
    .filter((value) => Number.isFinite(value) && value > 0)
  if (values.length === 0) return { minFeeRand: null as number | null, maxFeeRand: null as number | null }
  const min = Math.min(...values)
  const max = Math.max(...values)
  return {
    minFeeRand: min / 100,
    maxFeeRand: max / 100,
  }
}
