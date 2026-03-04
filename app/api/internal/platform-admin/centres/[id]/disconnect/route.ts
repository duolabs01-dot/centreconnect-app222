import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { writePlatformActivity } from '@/lib/admin/activity-log'
import { sendPlatformAdminActionNotification } from '@/lib/email/platform-admin-action-notification'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const platformAdmin = await requirePlatformAdmin(request)
  if (!platformAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: centreId } = await context.params
  if (!centreId) {
    return NextResponse.json({ error: 'Missing centre id' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: centre, error: centreError } = await admin
    .from('ecd_centres')
    .select('id,name,slug,owner_id')
    .eq('id', centreId)
    .maybeSingle()

  if (centreError) {
    return NextResponse.json({ error: centreError.message }, { status: 400 })
  }

  if (!centre) {
    return NextResponse.json({ error: 'Centre not found' }, { status: 404 })
  }

  const previousOwner = centre.owner_id ?? null

  const { error: deleteAdminsError } = await admin.from('ecd_admins').delete().eq('ecd_id', centreId)
  if (deleteAdminsError) {
    return NextResponse.json({ error: deleteAdminsError.message }, { status: 500 })
  }

  const { error: disableError } = await admin
    .from('ecd_centres')
    .update({ owner_id: null, is_active: false })
    .eq('id', centreId)
  if (disableError) {
    return NextResponse.json({ error: disableError.message }, { status: 500 })
  }

  await writePlatformActivity(admin, {
    actorUserId: platformAdmin.userId,
    actorEmail: platformAdmin.email,
    entityType: 'tenant',
    entityId: centreId,
    action: 'disconnect_tenant',
    summary: 'Disconnected tenant from platform access',
    details: {
      previousOwner: previousOwner ?? 'none',
      disconnectedAt: new Date().toISOString(),
    },
  })

  void sendPlatformAdminActionNotification({
    subject: 'Tenant Disconnected',
    heading: 'An ECD tenant has been disconnected from the platform.',
    lines: [
      `Centre: ${centre.name ?? 'Unknown centre'}`,
      `Slug: ${centre.slug ?? '-'}`,
      `Centre ID: ${centre.id}`,
      `Actor: ${platformAdmin.email ?? 'platform-admin'}`,
    ],
    details: {
      previousOwner: previousOwner ?? 'none',
      action: 'disconnect_tenant',
    },
  })

  return NextResponse.json({ ok: true, disconnected: true })
}
