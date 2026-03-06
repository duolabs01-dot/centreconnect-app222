import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { getClientAgent, getClientIp } from '@/lib/security/request-context'

const metadataValueSchema = z.union([z.string().max(200), z.number(), z.boolean(), z.null()])

const eventSchema = z.object({
  ecdId: z.string().uuid(),
  eventType: z.enum([
    'profile_view',
    'whatsapp_click',
    'call_click',
    'application_submitted',
    'page_view',
    'page_duration',
    'pickup_verified',
    'announcement_sent',
    'compliance_uploaded',
    'parent_invite_sent',
    'invoice_paid',
    'marketplace_requested',
    'referral_used',
    'daily_report_published',
    'invite_link_opened',
    'welcome_pack_viewed',
    'welcome_pack_scenario_opened',
    'welcome_pack_cta_clicked',
    'qr_poster_viewed',
    'qr_poster_print_clicked',
    'qr_poster_print_completed',
    'onboarding_step_viewed',
    'onboarding_step_completed',
    'onboarding_completed',
    'first_value_reached',
    'parent_record_created',
    'parent_record_updated',
    'parent_record_deleted',
    'pwa_prompt_shown',
    'pwa_install_clicked',
    'pwa_install_accepted',
    'pwa_install_dismissed',
  ]),
  applicationId: z.string().uuid().optional(),
  actorRole: z
    .enum(['platform_admin', 'parent_user', 'ecd_admin', 'ecd_supervisor', 'ecd_staff', 'anonymous'])
    .optional(),
  path: z.string().optional(),
  durationMs: z.number().int().optional(),
  sessionId: z.string().optional(),
  metadata: z.record(metadataValueSchema).optional(),
})

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const agent = getClientAgent(request)
    const rateLimit = await enforceRateLimit({
      scope: 'analytics-event',
      key: `${ip}:${agent}`,
      max: 60,
      windowMs: 60 * 1000,
    })
    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSec) } }
      )
    }

    const body = await request.json()
    const parsed = eventSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Validate centre existence
    const { data: centre } = await supabase
      .from('ecd_centres')
      .select('id,is_active')
      .eq('id', parsed.data.ecdId)
      .maybeSingle()

    if (!centre || !centre.is_active) {
      return NextResponse.json({ error: 'Centre not found' }, { status: 404 })
    }

    const { error } = await supabase.from('ecd_analytics_events').insert({
      ecd_id: parsed.data.ecdId,
      event_type: parsed.data.eventType,
      application_id: parsed.data.applicationId ?? null,
      actor_role: parsed.data.actorRole ?? null,
      path: parsed.data.path ?? null,
      duration_ms: parsed.data.durationMs ?? null,
      session_id: parsed.data.sessionId ?? null,
      metadata: parsed.data.metadata ?? {},
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Analytics API error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
