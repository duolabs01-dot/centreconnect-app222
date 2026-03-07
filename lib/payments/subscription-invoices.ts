import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { writePlatformActivity } from '@/lib/admin/activity-log'
import { sendPlatformAdminActionNotification } from '@/lib/email/platform-admin-action-notification'

type BillableSubscriptionStatus = 'trial' | 'active' | 'past_due'

type SubscriptionRow = {
  id: string
  ecd_id: string
  tier: 'basic' | 'standard' | 'premium'
  status: BillableSubscriptionStatus
  monthly_price: number
  current_period_start: string | null
  created_at: string | null
  ecd_centres: { is_active?: boolean; name?: string; slug?: string } | { is_active?: boolean; name?: string; slug?: string }[] | null
}

type InvoiceGenerationActor = {
  userId?: string | null
  email?: string | null
  sourceLabel?: string
}

type GenerateMonthlySubscriptionInvoicesInput = {
  admin: ReturnType<typeof createAdminClient>
  periodStart?: Date
  now?: Date
  actor?: InvoiceGenerationActor
  notify?: boolean
}

export type GenerateMonthlySubscriptionInvoicesResult = {
  generated: number
  skippedExisting: number
  skippedInactiveCentre: number
  skippedNonBillable: number
  scannedSubscriptions: number
  periodStart: string
  periodEnd: string
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function startOfMonthUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0))
}

function addMonthsUtc(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, 0, 0, 0, 0))
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0))
}

function daysBetween(start: Date, end: Date) {
  const diff = end.getTime() - start.getTime()
  if (diff <= 0) return 0
  return Math.round(diff / MS_PER_DAY)
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function periodTag(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}${month}`
}

function invoiceNumberFor(ecdId: string, tag: string) {
  const compact = ecdId.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `INV-${tag}-${compact}`
}

function buildDueAt(periodStart: Date, now: Date) {
  const dueAt = new Date(periodStart)
  dueAt.setUTCDate(7)
  if (dueAt.getTime() <= now.getTime()) {
    const fallback = startOfUtcDay(now)
    fallback.setUTCDate(fallback.getUTCDate() + 7)
    return fallback
  }
  return dueAt
}

export function resolveInvoicePeriodStart(period: string | null | undefined, now = new Date()) {
  if (!period) return startOfMonthUtc(now)
  const match = period.match(/^(\d{4})-(\d{2})$/)
  if (!match) return startOfMonthUtc(now)

  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return startOfMonthUtc(now)
  }

  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
}

export async function generateMonthlySubscriptionInvoices(
  input: GenerateMonthlySubscriptionInvoicesInput
): Promise<GenerateMonthlySubscriptionInvoicesResult> {
  const now = input.now ?? new Date()
  const periodStart = startOfMonthUtc(input.periodStart ?? now)
  const periodEnd = addMonthsUtc(periodStart, 1)
  const dueAt = buildDueAt(periodStart, now)
  const tag = periodTag(periodStart)
  const periodDays = daysBetween(periodStart, periodEnd)

  const { data: subscriptions, error: subscriptionError } = await input.admin
    .from('subscriptions')
    .select('id,ecd_id,tier,status,monthly_price,current_period_start,created_at,ecd_centres(name,slug,is_active)')
    .in('status', ['trial', 'active', 'past_due'])

  if (subscriptionError) {
    throw new Error(subscriptionError.message)
  }

  const scannedSubscriptions = (subscriptions ?? []).length
  const candidateSubscriptions = ((subscriptions ?? []) as SubscriptionRow[]).filter((sub) => {
    const centre = normalizeOne(sub.ecd_centres)
    return Boolean(centre?.is_active)
  })

  let skippedNonBillable = 0
  const toInsert: {
    invoice_number: string
    ecd_id: string
    subscription_id: string
    subtotal: number
    tax: number
    total: number
    status: 'draft'
    due_at: string
    line_items: unknown[]
    notes: string
  }[] = []

  for (const sub of candidateSubscriptions) {
    const monthlyPrice = Number(sub.monthly_price ?? 0)
    if (!Number.isFinite(monthlyPrice) || monthlyPrice <= 0) {
      skippedNonBillable += 1
      continue
    }

    const effectiveStartRaw = parseIsoDate(sub.current_period_start) ?? parseIsoDate(sub.created_at) ?? periodStart
    const effectiveStart = startOfUtcDay(effectiveStartRaw)

    if (effectiveStart.getTime() >= periodEnd.getTime()) {
      skippedNonBillable += 1
      continue
    }

    const billableStart = effectiveStart.getTime() > periodStart.getTime() ? effectiveStart : periodStart
    const billableDays = daysBetween(billableStart, periodEnd)
    if (billableDays <= 0) {
      skippedNonBillable += 1
      continue
    }

    const isProrated = billableDays < periodDays
    const computedAmount = isProrated ? monthlyPrice * (billableDays / periodDays) : monthlyPrice
    const amount = roundCurrency(computedAmount)
    if (amount <= 0) {
      skippedNonBillable += 1
      continue
    }

    const lineItem = isProrated
      ? {
          type: 'subscription',
          tier: sub.tier,
          period: tag,
          amount,
          quantity: 1,
          proration: {
            billableDays,
            periodDays,
            startedAt: billableStart.toISOString(),
          },
        }
      : {
          type: 'subscription',
          tier: sub.tier,
          period: tag,
          amount,
          quantity: 1,
        }

    toInsert.push({
      invoice_number: invoiceNumberFor(sub.ecd_id, tag),
      ecd_id: sub.ecd_id,
      subscription_id: sub.id,
      subtotal: amount,
      tax: 0,
      total: amount,
      status: 'draft',
      due_at: dueAt.toISOString(),
      line_items: [lineItem],
      notes: isProrated
        ? `Auto-generated prorated monthly invoice for ${tag} (${billableDays}/${periodDays} days).`
        : `Auto-generated monthly invoice for ${tag}.`,
    })
  }

  let generated = 0
  if (toInsert.length > 0) {
    const { data: inserted, error: insertError } = await input.admin
      .from('invoices')
      .upsert(toInsert, { onConflict: 'invoice_number', ignoreDuplicates: true })
      .select('id')

    if (insertError) {
      throw new Error(insertError.message)
    }
    generated = (inserted ?? []).length
  }

  const skippedExisting = toInsert.length - generated
  const skippedInactiveCentre = scannedSubscriptions - candidateSubscriptions.length

  await writePlatformActivity(input.admin, {
    actorUserId: input.actor?.userId ?? null,
    actorEmail: input.actor?.email ?? null,
    entityType: 'bulk',
    action: 'generate_monthly_invoices',
    summary: `Generated ${generated} monthly invoices for period ${tag}`,
    details: {
      period: tag,
      generated,
      skippedExisting,
      skippedInactiveCentre,
      skippedNonBillable,
      scannedSubscriptions,
      actor: input.actor?.sourceLabel ?? 'unknown',
    },
  })

  if (input.notify !== false) {
    void sendPlatformAdminActionNotification({
      subject: 'Monthly Invoices Generated',
      heading: 'Monthly invoice generation executed.',
      lines: [
        `Period: ${tag}`,
        `Generated: ${generated}`,
        `Skipped existing: ${skippedExisting}`,
        `Skipped inactive centres: ${skippedInactiveCentre}`,
        `Skipped non-billable: ${skippedNonBillable}`,
        `Actor: ${input.actor?.email ?? input.actor?.sourceLabel ?? 'system'}`,
      ],
      details: {
        action: 'generate_monthly_invoices',
        generated,
        skippedExisting,
        skippedInactiveCentre,
        skippedNonBillable,
        scannedSubscriptions,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        actor: input.actor?.sourceLabel ?? 'unknown',
      },
    })
  }

  return {
    generated,
    skippedExisting,
    skippedInactiveCentre,
    skippedNonBillable,
    scannedSubscriptions,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  }
}
