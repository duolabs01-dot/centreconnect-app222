import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { writePlatformActivity } from '@/lib/admin/activity-log'
import { sendPlatformAdminActionNotification } from '@/lib/email/platform-admin-action-notification'

const payloadSchema = z.object({
  status: z.enum(['trial', 'active', 'past_due', 'canceled', 'suspended']),
})

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const platformAdmin = await requirePlatformAdmin(request)
  if (!platformAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })

  const subscriptionId = context.params.id
  const admin = createAdminClient()
  const { data: subscription, error: readError } = await admin
    .from('subscriptions')
    .select('id,ecd_id,status,tier,monthly_price,ecd_centres(name,slug)')
    .eq('id', subscriptionId)
    .maybeSingle()
  if (readError || !subscription) return NextResponse.json({ error: readError?.message || 'Subscription not found' }, { status: 404 })

  const nextStatus = parsed.data.status
  const patch: Record<string, unknown> = { status: nextStatus }
  if (nextStatus === 'canceled') patch.canceled_at = new Date().toISOString()
  if (nextStatus !== 'canceled') patch.canceled_at = null

  const { error } = await admin.from('subscriptions').update(patch).eq('id', subscriptionId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await writePlatformActivity(admin, {
    actorUserId: platformAdmin.userId,
    actorEmail: platformAdmin.email,
    entityType: 'subscription',
    entityId: subscription.ecd_id,
    action: 'set_subscription_status',
    summary: `Subscription status changed ${subscription.status} -> ${nextStatus}`,
    details: { subscriptionId, from: subscription.status, to: nextStatus },
  })
  const centre = Array.isArray((subscription as any).ecd_centres) ? (subscription as any).ecd_centres[0] : (subscription as any).ecd_centres
  void sendPlatformAdminActionNotification({
    subject: 'Subscription Status Updated',
    heading: 'A subscription status was changed.',
    lines: [
      `Centre: ${centre?.name ?? subscription.ecd_id}`,
      `Slug: ${centre?.slug ?? '-'}`,
      `Subscription ID: ${subscriptionId}`,
      `Actor: ${platformAdmin.email ?? 'platform-admin'}`,
    ],
    details: {
      from: subscription.status,
      to: nextStatus,
      tier: subscription.tier,
      monthlyPrice: subscription.monthly_price,
    },
  })

  return NextResponse.json({ ok: true, id: subscriptionId, status: nextStatus })
}
