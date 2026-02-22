import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { runServiceApplicationAction } from '@/lib/admin/service-application-actions'

const actionSchema = z.object({
  action: z.enum(['approve', 'reject', 'provision']),
  adminNotes: z.string().max(2000).optional(),
})

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const platformAdmin = await requirePlatformAdmin(request)
  if (!platformAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = actionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }

  const applicationId = context.params.id
  if (!applicationId) return NextResponse.json({ error: 'Missing application id' }, { status: 400 })

  const admin = createAdminClient()
  const result = await runServiceApplicationAction({
    admin,
    actorUserId: platformAdmin.userId,
    actorEmail: platformAdmin.email,
    applicationId,
    action: parsed.data.action,
    adminNotes: parsed.data.adminNotes,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode ?? 400 })
  }

  return NextResponse.json(result)
}
