import { timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { runBillingAutomation } from '@/lib/payments/billing-automation'
import { checkAndAlertWebhookHealth } from '@/lib/payments/webhook-alerts'
import { logBillingEvent } from '@/lib/payments/structured-logs'

type AutomationPayload = {
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

async function readPayload(request: Request): Promise<AutomationPayload> {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return {}
  const parsed = await request.json().catch(() => null)
  if (!parsed || typeof parsed !== 'object') return {}
  return parsed as AutomationPayload
}

export async function POST(request: Request) {
  const cronAuthorized = isCronAuthorized(request)
  const platformAdmin = cronAuthorized ? null : await requirePlatformAdmin(request)
  if (!cronAuthorized && !platformAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const payload = await readPayload(request)
  if (payload.notify !== undefined && typeof payload.notify !== 'boolean') {
    return NextResponse.json({ error: 'Invalid notify flag.' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()
    const actor = cronAuthorized
      ? { email: 'system:cron', sourceLabel: 'system:cron' }
      : { userId: platformAdmin?.userId, email: platformAdmin?.email, sourceLabel: 'platform-admin' }

    const result = await runBillingAutomation({
      admin,
      actor,
      notify: cronAuthorized ? (payload.notify ?? false) : true,
    })

    const webhookHealth = await checkAndAlertWebhookHealth({
      admin,
      actor,
    })

    logBillingEvent('billing_automation_completed', {
      actor: cronAuthorized ? 'cron' : 'platform-admin',
      scannedInvoices: result.scannedInvoices,
      remindersSent: result.remindersSent,
      subscriptionsSuspended: result.subscriptionsSuspended,
      webhookFailed24h: webhookHealth.failedCount24h,
      webhookLagged: webhookHealth.laggedReceivedCount,
      webhookAlertSent: webhookHealth.alertSent,
    })

    return NextResponse.json({
      ok: true,
      actor: cronAuthorized ? 'cron' : 'platform-admin',
      webhookHealth,
      ...result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run billing automation'
    logBillingEvent('billing_automation_failed', { message }, 'error')
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
