import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_STATUSES = new Set(['queued', 'sent', 'delivered', 'opened', 'clicked', 'claimed', 'failed'])

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await requirePlatformAdmin(request)
  if (!identity) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await context.params
  if (!id) return NextResponse.json({ error: 'Missing log id' }, { status: 400 })

  const payload = (await request.json().catch(() => ({}))) as { status?: string }
  const status = String(payload.status ?? '').trim().toLowerCase()
  if (!VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Invalid notification status.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('notification_logs')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: 'Notification log not found.' }, { status: 404 })

  return NextResponse.json({ ok: true, id: data.id, status })
}
