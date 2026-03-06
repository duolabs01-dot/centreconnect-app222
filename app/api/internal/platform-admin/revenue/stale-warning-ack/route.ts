import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { writePlatformActivity } from '@/lib/admin/activity-log'

const payloadSchema = z.object({
  counterAgeMinutes: z.number().int().nonnegative().nullable(),
  thresholdMinutes: z.number().int().positive(),
})

export async function POST(request: Request) {
  const platformAdmin = await requirePlatformAdmin(request)
  if (!platformAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })

  const admin = createAdminClient()
  await writePlatformActivity(admin, {
    actorUserId: platformAdmin.userId,
    actorEmail: platformAdmin.email,
    entityType: 'bulk',
    action: 'ack_revenue_stale_warning',
    summary: 'Operator acknowledged revenue counter stale-data warning',
    details: {
      counterAgeMinutes: parsed.data.counterAgeMinutes,
      thresholdMinutes: parsed.data.thresholdMinutes,
      acknowledgedAt: new Date().toISOString(),
    },
  })

  return NextResponse.json({ ok: true })
}

