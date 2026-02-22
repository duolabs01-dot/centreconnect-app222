import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
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
  ecd_centres: { is_active?: boolean; name?: string; slug?: string } | { is_active?: boolean; name?: string; slug?: string }[] | null
}

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

function periodTag(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}${month}`
}

function invoiceNumberFor(ecdId: string, tag: string) {
  const compact = ecdId.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `INV-${tag}-${compact}`
}

export async function POST(request: Request) {
  const platformAdmin = await requirePlatformAdmin(request)
  if (!platformAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const now = new Date()
  const periodStart = startOfMonthUtc(now)
  const periodEnd = addMonthsUtc(periodStart, 1)
  const dueAt = new Date(periodStart)
  dueAt.setUTCDate(7)
  const tag = periodTag(periodStart)

  const { data: subscriptions, error: subscriptionError } = await admin
    .from('subscriptions')
    .select('id,ecd_id,tier,status,monthly_price,ecd_centres(name,slug,is_active)')
    .in('status', ['trial', 'active', 'past_due'])

  if (subscriptionError) return NextResponse.json({ error: subscriptionError.message }, { status: 400 })

  const candidateSubscriptions = ((subscriptions ?? []) as SubscriptionRow[]).filter((sub) => {
    const centre = normalizeOne(sub.ecd_centres)
    return Boolean(centre?.is_active)
  })

  if (candidateSubscriptions.length === 0) {
    return NextResponse.json({
      ok: true,
      generated: 0,
      skippedExisting: 0,
      skippedInactiveCentre: (subscriptions ?? []).length,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    })
  }

  const toInsert = candidateSubscriptions
    .map((sub) => ({
      invoice_number: invoiceNumberFor(sub.ecd_id, tag),
      ecd_id: sub.ecd_id,
      subscription_id: sub.id,
      subtotal: Number(sub.monthly_price ?? 0),
      tax: 0,
      total: Number(sub.monthly_price ?? 0),
      status: 'draft',
      due_at: dueAt.toISOString(),
      line_items: [
        {
          type: 'subscription',
          tier: sub.tier,
          period: tag,
          amount: Number(sub.monthly_price ?? 0),
          quantity: 1,
        },
      ],
      notes: `Auto-generated monthly invoice for ${tag}`,
    }))

  let generated = 0
  if (toInsert.length > 0) {
    const { data: inserted, error: insertError } = await admin
      .from('invoices')
      .upsert(toInsert, { onConflict: 'invoice_number', ignoreDuplicates: true })
      .select('id')

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 })
    generated = (inserted ?? []).length
  }

  const skippedExisting = toInsert.length - generated
  const skippedInactiveCentre = (subscriptions ?? []).length - candidateSubscriptions.length

  await writePlatformActivity(admin, {
    actorUserId: platformAdmin.userId,
    actorEmail: platformAdmin.email,
    entityType: 'bulk',
    action: 'generate_monthly_invoices',
    summary: `Generated ${generated} monthly invoices for period ${tag}`,
    details: {
      period: tag,
      generated,
      skippedExisting,
      skippedInactiveCentre,
      scannedSubscriptions: (subscriptions ?? []).length,
    },
  })
  void sendPlatformAdminActionNotification({
    subject: 'Monthly Invoices Generated',
    heading: 'Monthly invoice generation executed.',
    lines: [
      `Period: ${tag}`,
      `Generated: ${generated}`,
      `Skipped existing: ${skippedExisting}`,
      `Skipped inactive centres: ${skippedInactiveCentre}`,
      `Actor: ${platformAdmin.email ?? 'platform-admin'}`,
    ],
    details: {
      action: 'generate_monthly_invoices',
      generated,
      skippedExisting,
      skippedInactiveCentre,
      scannedSubscriptions: (subscriptions ?? []).length,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    },
  })

  return NextResponse.json({
    ok: true,
    generated,
    skippedExisting,
    skippedInactiveCentre,
    scannedSubscriptions: (subscriptions ?? []).length,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  })
}
