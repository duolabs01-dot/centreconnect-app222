import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { writePlatformActivity } from '@/lib/admin/activity-log'
import { sendPlatformAdminActionNotification } from '@/lib/email/platform-admin-action-notification'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
type RequestedTier = 'pilot' | 'basic' | 'standard' | 'premium'

function normalizeRequestedTier(
  tier: RequestedTier,
  status: 'trial' | 'active' | 'past_due' | 'canceled' | 'suspended',
  monthlyPrice: number
) {
  if (tier === 'pilot') {
    return {
      tier: 'basic' as const,
      status: 'trial' as const,
      monthlyPrice: 0,
      isPilotPlan: true,
    }
  }

  return { tier, status, monthlyPrice, isPilotPlan: false }
}

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('set_verification'),
    verified: z.boolean(),
  }),
  z.object({
    action: z.literal('set_active'),
    active: z.boolean(),
  }),
  z.object({
    action: z.literal('set_slug'),
    slug: z.string().min(3).max(80).regex(slugPattern),
  }),
  z.object({
    action: z.literal('set_subscription'),
    tier: z.enum(['pilot', 'basic', 'standard', 'premium']),
    status: z.enum(['trial', 'active', 'past_due', 'canceled', 'suspended']),
    monthlyPrice: z.number().min(0).max(100000),
  }),
  z.object({
    action: z.literal('bootstrap_tenant'),
    tier: z.enum(['pilot', 'basic', 'standard', 'premium']).default('basic'),
    status: z.enum(['trial', 'active', 'past_due', 'canceled', 'suspended']).default('trial'),
    monthlyPrice: z.number().min(0).max(100000).default(199),
  }),
  z.object({
    action: z.literal('revert_to_non_paying'),
  }),
])

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const platformAdmin = await requirePlatformAdmin(request)
  if (!platformAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = actionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }

  const { id: centreId } = await context.params
  if (!centreId) return NextResponse.json({ error: 'Missing centre id' }, { status: 400 })

  const admin = createAdminClient()
  const payload = parsed.data
  const { data: centreSnapshot } = await admin.from('ecd_centres').select('id,name,slug').eq('id', centreId).maybeSingle()
  const centreName = centreSnapshot?.name ?? centreId
  const centreSlug = centreSnapshot?.slug ?? '-'

  if (payload.action === 'set_verification') {
    const { error } = await admin
      .from('ecd_centres')
      .update({ is_registered: payload.verified })
      .eq('id', centreId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await writePlatformActivity(admin, {
      actorUserId: platformAdmin.userId,
      actorEmail: platformAdmin.email,
      entityType: 'centre',
      entityId: centreId,
      action: 'set_verification',
      summary: payload.verified ? 'Enabled verification badge' : 'Removed verification badge',
      details: { verified: payload.verified },
    })
    void sendPlatformAdminActionNotification({
      subject: payload.verified ? 'ECD Verified' : 'ECD Unverified',
      heading: payload.verified ? 'Verification badge enabled for an ECD.' : 'Verification badge removed for an ECD.',
      lines: [
        `Centre: ${centreName}`,
        `Slug: ${centreSlug}`,
        `Centre ID: ${centreId}`,
        `Actor: ${platformAdmin.email ?? 'platform-admin'}`,
      ],
      details: { verified: payload.verified },
    })
    return NextResponse.json({ ok: true, verified: payload.verified })
  }

  if (payload.action === 'set_active') {
    const { error } = await admin
      .from('ecd_centres')
      .update({ is_active: payload.active })
      .eq('id', centreId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await writePlatformActivity(admin, {
      actorUserId: platformAdmin.userId,
      actorEmail: platformAdmin.email,
      entityType: 'tenant',
      entityId: centreId,
      action: 'set_active',
      summary: payload.active ? 'Enabled tenant' : 'Disabled tenant',
      details: { active: payload.active },
    })
    void sendPlatformAdminActionNotification({
      subject: payload.active ? 'Tenant Enabled' : 'Tenant Disabled',
      heading: payload.active ? 'Tenant was enabled.' : 'Tenant was disabled.',
      lines: [
        `Centre: ${centreName}`,
        `Slug: ${centreSlug}`,
        `Centre ID: ${centreId}`,
        `Actor: ${platformAdmin.email ?? 'platform-admin'}`,
      ],
      details: { active: payload.active },
    })
    return NextResponse.json({ ok: true, active: payload.active })
  }

  if (payload.action === 'set_slug') {
    const { error } = await admin.from('ecd_centres').update({ slug: payload.slug }).eq('id', centreId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await writePlatformActivity(admin, {
      actorUserId: platformAdmin.userId,
      actorEmail: platformAdmin.email,
      entityType: 'tenant',
      entityId: centreId,
      action: 'set_slug',
      summary: `Updated subdomain slug to ${payload.slug}`,
      details: { slug: payload.slug },
    })
    void sendPlatformAdminActionNotification({
      subject: 'Tenant Subdomain Updated',
      heading: 'A tenant subdomain was updated.',
      lines: [
        `Centre: ${centreName}`,
        `Previous Slug: ${centreSlug}`,
        `New Slug: ${payload.slug}`,
        `Centre ID: ${centreId}`,
        `Actor: ${platformAdmin.email ?? 'platform-admin'}`,
      ],
      details: { slug: payload.slug },
    })
    return NextResponse.json({ ok: true, slug: payload.slug })
  }

  if (payload.action === 'bootstrap_tenant') {
    const normalizedPlan = normalizeRequestedTier(payload.tier, payload.status, payload.monthlyPrice)
    const { error: centreEnableError } = await admin
      .from('ecd_centres')
      .update({ is_active: true })
      .eq('id', centreId)
    if (centreEnableError) return NextResponse.json({ error: centreEnableError.message }, { status: 400 })

    const { error: subscriptionError } = await admin.from('subscriptions').upsert(
      {
        ecd_id: centreId,
        tier: normalizedPlan.tier,
        status: normalizedPlan.status,
        monthly_price: normalizedPlan.monthlyPrice,
      },
      { onConflict: 'ecd_id' }
    )
    if (subscriptionError) return NextResponse.json({ error: subscriptionError.message }, { status: 400 })

    await writePlatformActivity(admin, {
      actorUserId: platformAdmin.userId,
      actorEmail: platformAdmin.email,
      entityType: 'tenant',
      entityId: centreId,
      action: 'bootstrap_tenant',
      summary: `Converted centre into tenant (${normalizedPlan.tier}/${normalizedPlan.status})`,
      details: {
        requestedPlan: payload.tier,
        tier: normalizedPlan.tier,
        status: normalizedPlan.status,
        monthlyPrice: normalizedPlan.monthlyPrice,
        isPilotPlan: normalizedPlan.isPilotPlan,
      },
    })
    void sendPlatformAdminActionNotification({
      subject: 'Centre Converted To Tenant',
      heading: 'A centre without subscription was converted to a tenant.',
      lines: [
        `Centre: ${centreName}`,
        `Slug: ${centreSlug}`,
        `Centre ID: ${centreId}`,
        `Actor: ${platformAdmin.email ?? 'platform-admin'}`,
      ],
      details: {
        requestedPlan: payload.tier,
        tier: normalizedPlan.tier,
        status: normalizedPlan.status,
        monthlyPrice: normalizedPlan.monthlyPrice,
        isPilotPlan: normalizedPlan.isPilotPlan,
      },
    })

    return NextResponse.json({
      ok: true,
      tenant: {
        requestedPlan: payload.tier,
        tier: normalizedPlan.tier,
        status: normalizedPlan.status,
        monthlyPrice: normalizedPlan.monthlyPrice,
        active: true,
      },
    })
  }

  if (payload.action === 'revert_to_non_paying') {
    const { error: detachInvoiceSubscriptionError } = await admin
      .from('invoices')
      .update({ subscription_id: null })
      .eq('ecd_id', centreId)
      .not('subscription_id', 'is', null)
    if (detachInvoiceSubscriptionError) {
      return NextResponse.json({ error: detachInvoiceSubscriptionError.message }, { status: 400 })
    }

    const { error: deleteSubscriptionError } = await admin.from('subscriptions').delete().eq('ecd_id', centreId)
    if (deleteSubscriptionError) return NextResponse.json({ error: deleteSubscriptionError.message }, { status: 400 })

    await writePlatformActivity(admin, {
      actorUserId: platformAdmin.userId,
      actorEmail: platformAdmin.email,
      entityType: 'tenant',
      entityId: centreId,
      action: 'revert_to_non_paying',
      summary: 'Reverted tenant subscription to non-paying state',
      details: {
        detachedInvoiceSubscriptions: true,
      },
    })
    void sendPlatformAdminActionNotification({
      subject: 'Tenant Reverted To Non-Paying',
      heading: 'A tenant subscription was removed and reverted to non-paying.',
      lines: [
        `Centre: ${centreName}`,
        `Slug: ${centreSlug}`,
        `Centre ID: ${centreId}`,
        `Actor: ${platformAdmin.email ?? 'platform-admin'}`,
      ],
      details: {
        action: 'revert_to_non_paying',
        detachedInvoiceSubscriptions: true,
      },
    })

    return NextResponse.json({
      ok: true,
      reverted: true,
      centreId,
    })
  }

  const normalizedPlan = normalizeRequestedTier(payload.tier, payload.status, payload.monthlyPrice)
  const { error } = await admin.from('subscriptions').upsert(
    {
      ecd_id: centreId,
      tier: normalizedPlan.tier,
      status: normalizedPlan.status,
      monthly_price: normalizedPlan.monthlyPrice,
    },
    { onConflict: 'ecd_id' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await writePlatformActivity(admin, {
    actorUserId: platformAdmin.userId,
    actorEmail: platformAdmin.email,
    entityType: 'subscription',
    entityId: centreId,
    action: 'set_subscription',
    summary: `Updated subscription to ${normalizedPlan.tier}/${normalizedPlan.status}`,
    details: {
      requestedPlan: payload.tier,
      tier: normalizedPlan.tier,
      status: normalizedPlan.status,
      monthlyPrice: normalizedPlan.monthlyPrice,
      isPilotPlan: normalizedPlan.isPilotPlan,
    },
  })
  void sendPlatformAdminActionNotification({
    subject: 'Subscription Package Updated',
    heading: 'A tenant package was updated.',
    lines: [
      `Centre: ${centreName}`,
      `Slug: ${centreSlug}`,
      `Centre ID: ${centreId}`,
      `Actor: ${platformAdmin.email ?? 'platform-admin'}`,
    ],
    details: {
      requestedPlan: payload.tier,
      tier: normalizedPlan.tier,
      status: normalizedPlan.status,
      monthlyPrice: normalizedPlan.monthlyPrice,
      isPilotPlan: normalizedPlan.isPilotPlan,
    },
  })

  return NextResponse.json({
    ok: true,
    subscription: {
      requestedPlan: payload.tier,
      tier: normalizedPlan.tier,
      status: normalizedPlan.status,
      monthlyPrice: normalizedPlan.monthlyPrice,
    },
  })
}
