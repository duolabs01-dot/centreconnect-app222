import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { writePlatformActivity } from '@/lib/admin/activity-log'
import { sendPlatformAdminActionNotification } from '@/lib/email/platform-admin-action-notification'

const bulkSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('set_verification'),
    ids: z.array(z.string().uuid()).min(1).max(200),
    verified: z.boolean(),
  }),
  z.object({
    action: z.literal('set_active'),
    ids: z.array(z.string().uuid()).min(1).max(200),
    active: z.boolean(),
  }),
  z.object({
    action: z.literal('set_subscription_status'),
    ids: z.array(z.string().uuid()).min(1).max(200),
    status: z.enum(['active', 'suspended']),
  }),
  z.object({
    action: z.literal('bootstrap_tenant'),
    ids: z.array(z.string().uuid()).min(1).max(200),
    tier: z.enum(['basic', 'standard', 'premium']).default('basic'),
    status: z.enum(['trial', 'active', 'past_due', 'canceled', 'suspended']).default('trial'),
    monthlyPrice: z.number().min(0).max(100000).default(199),
  }),
])

export async function PATCH(request: Request) {
  const platformAdmin = await requirePlatformAdmin(request)
  if (!platformAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = bulkSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }

  const admin = createAdminClient()
  const payload = parsed.data

  if (payload.action === 'set_verification') {
    const { error } = await admin.from('ecd_centres').update({ is_registered: payload.verified }).in('id', payload.ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await writePlatformActivity(admin, {
      actorUserId: platformAdmin.userId,
      actorEmail: platformAdmin.email,
      entityType: 'bulk',
      action: 'bulk_set_verification',
      summary: `Bulk verification updated for ${payload.ids.length} centres`,
      details: { ids: payload.ids, verified: payload.verified },
    })
    void sendPlatformAdminActionNotification({
      subject: 'Bulk Verification Update',
      heading: 'Bulk verification update executed.',
      lines: [
        `Centres affected: ${payload.ids.length}`,
        `Actor: ${platformAdmin.email ?? 'platform-admin'}`,
      ],
      details: { action: 'bulk_set_verification', verified: payload.verified, ids: payload.ids },
    })

    return NextResponse.json({ ok: true, count: payload.ids.length, verified: payload.verified })
  }

  if (payload.action === 'bootstrap_tenant') {
    const { error: activateError } = await admin.from('ecd_centres').update({ is_active: true }).in('id', payload.ids)
    if (activateError) return NextResponse.json({ error: activateError.message }, { status: 400 })

    const rows = payload.ids.map((id) => ({
      ecd_id: id,
      tier: payload.tier,
      status: payload.status,
      monthly_price: payload.monthlyPrice,
    }))
    const { error: subscriptionError } = await admin.from('subscriptions').upsert(rows, { onConflict: 'ecd_id' })
    if (subscriptionError) return NextResponse.json({ error: subscriptionError.message }, { status: 400 })

    await writePlatformActivity(admin, {
      actorUserId: platformAdmin.userId,
      actorEmail: platformAdmin.email,
      entityType: 'bulk',
      action: 'bulk_bootstrap_tenant',
      summary: `Bulk converted ${payload.ids.length} centres to tenants`,
      details: {
        ids: payload.ids,
        tier: payload.tier,
        status: payload.status,
        monthlyPrice: payload.monthlyPrice,
      },
    })
    void sendPlatformAdminActionNotification({
      subject: 'Bulk Convert To Tenant',
      heading: 'Bulk centre-to-tenant conversion executed.',
      lines: [
        `Centres converted: ${payload.ids.length}`,
        `Actor: ${platformAdmin.email ?? 'platform-admin'}`,
      ],
      details: {
        action: 'bulk_bootstrap_tenant',
        tier: payload.tier,
        status: payload.status,
        monthlyPrice: payload.monthlyPrice,
        ids: payload.ids,
      },
    })

    return NextResponse.json({
      ok: true,
      count: payload.ids.length,
      tenant: { tier: payload.tier, status: payload.status, monthlyPrice: payload.monthlyPrice },
    })
  }

  if (payload.action === 'set_subscription_status') {
    const { error } = await admin
      .from('subscriptions')
      .update({ status: payload.status })
      .in('ecd_id', payload.ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await writePlatformActivity(admin, {
      actorUserId: platformAdmin.userId,
      actorEmail: platformAdmin.email,
      entityType: 'bulk',
      action: 'bulk_set_subscription_status',
      summary: `Bulk subscription status set to ${payload.status} for ${payload.ids.length} centres`,
      details: { ids: payload.ids, status: payload.status },
    })
    void sendPlatformAdminActionNotification({
      subject: 'Bulk Subscription Status Update',
      heading: 'Bulk subscription status update executed.',
      lines: [
        `Centres affected: ${payload.ids.length}`,
        `New status: ${payload.status}`,
        `Actor: ${platformAdmin.email ?? 'platform-admin'}`,
      ],
      details: { action: 'bulk_set_subscription_status', status: payload.status, ids: payload.ids },
    })

    return NextResponse.json({ ok: true, count: payload.ids.length, status: payload.status })
  }

  const { error } = await admin.from('ecd_centres').update({ is_active: payload.active }).in('id', payload.ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await writePlatformActivity(admin, {
    actorUserId: platformAdmin.userId,
    actorEmail: platformAdmin.email,
    entityType: 'bulk',
    action: 'bulk_set_active',
    summary: `Bulk activation updated for ${payload.ids.length} centres`,
    details: { ids: payload.ids, active: payload.active },
  })
  void sendPlatformAdminActionNotification({
    subject: 'Bulk Activation Update',
    heading: 'Bulk tenant activation update executed.',
    lines: [
      `Centres affected: ${payload.ids.length}`,
      `Actor: ${platformAdmin.email ?? 'platform-admin'}`,
    ],
    details: { action: 'bulk_set_active', active: payload.active, ids: payload.ids },
  })

  return NextResponse.json({ ok: true, count: payload.ids.length, active: payload.active })
}
