import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { getClientAgent, getClientIp } from '@/lib/security/request-context'

const metadataValueSchema = z.union([z.string().max(200), z.number(), z.boolean(), z.null()])

const eventSchema = z.object({
  ecdId: z.string().uuid(),
  eventType: z.enum(['profile_view', 'whatsapp_click', 'call_click', 'application_submitted']),
  applicationId: z.string().uuid().optional(),
  metadata: z.record(metadataValueSchema).optional(),
})

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const agent = getClientAgent(request)
    const rateLimit = await enforceRateLimit({
      scope: 'analytics-events-ip',
      key: `${ip}:${agent}`,
      max: 120,
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
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const supabase = createAdminClient()

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
      metadata: parsed.data.metadata ?? {},
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
