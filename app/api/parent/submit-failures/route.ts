import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { getClientAgent, getClientIp } from '@/lib/security/request-context'

const contextValueSchema = z.union([z.string().max(200), z.number(), z.boolean(), z.null()])

const payloadSchema = z.object({
  route: z.string().trim().min(1).max(160),
  form: z.string().trim().min(1).max(80),
  failureType: z.string().trim().min(1).max(80),
  message: z.string().trim().min(1).max(600),
  code: z.string().trim().min(1).max(80).optional(),
  source: z.enum(['client', 'server']).optional(),
  context: z.record(contextValueSchema).optional(),
})

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const agent = getClientAgent(request)
    const limit = await enforceRateLimit({
      scope: 'parent-submit-failure',
      key: `${ip}:${agent}`,
      max: 90,
      windowMs: 60 * 1000,
    })

    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
      )
    }

    const body = await request.json()
    const parsed = payloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase.from('parent_form_submit_failures').insert({
      parent_id: user.id,
      route_path: parsed.data.route,
      form_name: parsed.data.form,
      failure_type: parsed.data.failureType,
      source: parsed.data.source ?? 'client',
      error_code: parsed.data.code ?? null,
      error_message: parsed.data.message,
      context: parsed.data.context ?? {},
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
