import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await requirePlatformAdmin(request)
  if (!identity) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await context.params
  if (!id) return NextResponse.json({ error: 'Missing notification id' }, { status: 400 })

  const payload = (await request.json().catch(() => ({}))) as { isRead?: boolean }
  if (typeof payload.isRead !== 'boolean') {
    return NextResponse.json({ error: 'Invalid read-state payload.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('parent_notifications')
    .update({ is_read: payload.isRead })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: 'Parent notification not found.' }, { status: 404 })

  return NextResponse.json({ ok: true, id: data.id, isRead: payload.isRead })
}

