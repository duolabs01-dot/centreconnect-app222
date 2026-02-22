import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { runServiceApplicationAction } from '@/lib/admin/service-application-actions'
import { writePlatformActivity } from '@/lib/admin/activity-log'
import { sendPlatformAdminActionNotification } from '@/lib/email/platform-admin-action-notification'

const bulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(['approve', 'reject', 'provision']),
  adminNotes: z.string().max(2000).optional(),
})

export async function PATCH(request: Request) {
  const platformAdmin = await requirePlatformAdmin(request)
  if (!platformAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = bulkSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }

  const admin = createAdminClient()
  const successes: Array<{ id: string; status: string; ecdId?: string; slug?: string; warning?: string }> = []
  const failures: Array<{ id: string; error: string }> = []

  for (const id of parsed.data.ids) {
    const result = await runServiceApplicationAction({
      admin,
      actorUserId: platformAdmin.userId,
      actorEmail: platformAdmin.email,
      applicationId: id,
      action: parsed.data.action,
      adminNotes: parsed.data.adminNotes,
    })
    if (result.ok) {
      successes.push({ id, status: result.status, ecdId: result.ecdId, slug: result.slug, warning: result.warning })
    } else {
      failures.push({ id, error: result.error })
    }
  }

  await writePlatformActivity(admin, {
    actorUserId: platformAdmin.userId,
    actorEmail: platformAdmin.email,
    entityType: 'bulk',
    action: `bulk_${parsed.data.action}`,
    summary: `Bulk ${parsed.data.action}: ${successes.length} success, ${failures.length} failed`,
    details: {
      ids: parsed.data.ids,
      successCount: successes.length,
      failureCount: failures.length,
    },
  })
  void sendPlatformAdminActionNotification({
    subject: `Bulk Application ${parsed.data.action}`,
    heading: 'Bulk service application action completed.',
    lines: [
      `Action: ${parsed.data.action}`,
      `Successes: ${successes.length}`,
      `Failures: ${failures.length}`,
      `Actor: ${platformAdmin.email ?? 'platform-admin'}`,
    ],
    details: {
      ids: parsed.data.ids,
      successCount: successes.length,
      failureCount: failures.length,
    },
  })

  return NextResponse.json({
    ok: failures.length === 0,
    action: parsed.data.action,
    successCount: successes.length,
    failureCount: failures.length,
    successes,
    failures,
  })
}
