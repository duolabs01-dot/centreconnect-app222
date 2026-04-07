import { timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateMonthlySubscriptionInvoices, resolveInvoicePeriodStart } from '@/lib/payments/subscription-invoices'
import { logBillingEvent } from '@/lib/payments/structured-logs'

type GeneratePayload = {
  period?: unknown
  notify?: unknown
}

function parseBearerToken(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const [scheme, token] = authHeader.split(' ')
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return null
  return token
}

function safeSecretMatch(received: string | null, expected: string | undefined) {
  if (!received || !expected) return false
  const receivedBuffer = Buffer.from(received)
  const expectedBuffer = Buffer.from(expected)
  if (receivedBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(receivedBuffer, expectedBuffer)
}

function isCronAuthorized(request: Request) {
  return safeSecretMatch(parseBearerToken(request), process.env.CRON_SECRET)
}

function isValidPeriod(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}$/.test(value)
}

async function readPayload(request: Request): Promise<GeneratePayload> {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return {}
  const parsed = await request.json().catch(() => null)
  if (!parsed || typeof parsed !== 'object') return {}
  return parsed as GeneratePayload
}

export async function POST(request: Request) {
  const cronAuthorized = isCronAuthorized(request)
  const platformAdmin = cronAuthorized ? null : await requirePlatformAdmin(request)
  if (!cronAuthorized && !platformAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const payload = await readPayload(request)
  const url = new URL(request.url)
  const periodCandidate = payload.period ?? url.searchParams.get('period') ?? undefined
  if (periodCandidate !== undefined && !isValidPeriod(periodCandidate)) {
    return NextResponse.json({ error: 'Invalid period. Use YYYY-MM.' }, { status: 400 })
  }

  const notifyCandidate = payload.notify
  if (notifyCandidate !== undefined && typeof notifyCandidate !== 'boolean') {
    return NextResponse.json({ error: 'Invalid notify flag.' }, { status: 400 })
  }

  try {
    logBillingEvent('generate_monthly_invoices_requested', {
      actor: cronAuthorized ? 'cron' : 'platform-admin',
      period: periodCandidate ?? 'current',
    })

    const result = await generateMonthlySubscriptionInvoices({
      admin: createAdminClient(),
      periodStart: resolveInvoicePeriodStart(periodCandidate ?? undefined),
      actor: cronAuthorized
        ? { email: 'system:cron', sourceLabel: 'system:cron' }
        : { userId: platformAdmin?.userId, email: platformAdmin?.email, sourceLabel: 'platform-admin' },
      notify: cronAuthorized ? (notifyCandidate ?? false) : true,
    })

    logBillingEvent('generate_monthly_invoices_completed', {
      actor: cronAuthorized ? 'cron' : 'platform-admin',
      periodStart: result.periodStart,
      generated: result.generated,
      skippedExisting: result.skippedExisting,
      skippedInactiveCentre: result.skippedInactiveCentre,
      skippedNonBillable: result.skippedNonBillable,
    })

    return NextResponse.json({
      ok: true,
      actor: cronAuthorized ? 'cron' : 'platform-admin',
      ...result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate invoices'
    logBillingEvent('generate_monthly_invoices_failed', { message }, 'error')
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  return POST(request)
}
