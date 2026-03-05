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
    action: z.literal('set_brand_media'),
    logoUrl: z.string().url().nullable().optional(),
    coverImageUrl: z.string().url().nullable().optional(),
  }),
  z.object({
    action: z.literal('delete'),
  }),
  z.object({
    action: z.literal('restore'),
  }),
  z.object({
    action: z.literal('set_profile'),
    name: z.string().min(2).max(160).optional(),
    slug: z.string().min(3).max(80).regex(slugPattern).optional(),
    primaryContactName: z.string().min(2).max(160).nullable().optional(),
    email: z.string().email().optional(),
    phone: z.string().min(5).max(40).optional(),
    contactPhone: z.string().min(5).max(40).nullable().optional(),
    contactWhatsapp: z.string().min(5).max(40).nullable().optional(),
    address: z.string().max(255).optional(),
    suburb: z.string().max(120).optional(),
    city: z.string().max(120).optional(),
    province: z.string().max(120).optional(),
    postalCode: z.string().max(20).nullable().optional(),
    logoUrl: z.string().url().nullable().optional(),
    coverImageUrl: z.string().url().nullable().optional(),
    feesDisplayMode: z.enum(['exact', 'range', 'contact']).optional(),
    monthlyFeeMin: z.number().min(0).nullable().optional(),
    monthlyFeeMax: z.number().min(0).nullable().optional(),
    subsidyAccepted: z.boolean().optional(),
    ageGroupPricing: z.record(z.string(), z.any()).optional(),
    operatingHours: z.string().max(400).nullable().optional(),
    dsdStatus: z.string().max(80).nullable().optional(),
    marketplaceUpgrades: z.array(z.string().max(120)).max(25).optional(),
    isActive: z.boolean().optional(),
    isRegistered: z.boolean().optional(),
    subscriptionTier: z.enum(['pilot', 'basic', 'standard', 'premium']).optional(),
    subscriptionStatus: z.enum(['trial', 'active', 'past_due', 'canceled', 'suspended']).optional(),
    subscriptionMonthlyPrice: z.number().min(0).max(100000).optional(),
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

  if (payload.action === 'set_brand_media') {
    const updatePayload: { logo_url?: string | null; cover_image_url?: string | null } = {}
    if (Object.prototype.hasOwnProperty.call(payload, 'logoUrl')) {
      updatePayload.logo_url = payload.logoUrl ?? null
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'coverImageUrl')) {
      updatePayload.cover_image_url = payload.coverImageUrl ?? null
    }
    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No media fields provided.' }, { status: 400 })
    }

    const { error } = await admin.from('ecd_centres').update(updatePayload).eq('id', centreId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await writePlatformActivity(admin, {
      actorUserId: platformAdmin.userId,
      actorEmail: platformAdmin.email,
      entityType: 'tenant',
      entityId: centreId,
      action: 'set_brand_media',
      summary: 'Updated tenant logo/hero media',
      details: {
        logo_url: updatePayload.logo_url ?? undefined,
        cover_image_url: updatePayload.cover_image_url ?? undefined,
      },
    })

    return NextResponse.json({
      ok: true,
      logoUrl: updatePayload.logo_url ?? null,
      coverImageUrl: updatePayload.cover_image_url ?? null,
    })
  }

  if (payload.action === 'set_profile') {
    const updatePayload: Record<string, unknown> = {}
    if (payload.name !== undefined) updatePayload.name = payload.name
    if (payload.slug !== undefined) updatePayload.slug = payload.slug
    if (payload.primaryContactName !== undefined) updatePayload.primary_contact_name = payload.primaryContactName
    if (payload.email !== undefined) updatePayload.email = payload.email.toLowerCase()
    if (payload.phone !== undefined) updatePayload.phone = payload.phone
    if (payload.contactPhone !== undefined) updatePayload.contact_phone = payload.contactPhone
    if (payload.contactWhatsapp !== undefined) updatePayload.contact_whatsapp = payload.contactWhatsapp
    if (payload.address !== undefined) updatePayload.address = payload.address
    if (payload.suburb !== undefined) updatePayload.suburb = payload.suburb
    if (payload.city !== undefined) updatePayload.city = payload.city
    if (payload.province !== undefined) updatePayload.province = payload.province
    if (payload.postalCode !== undefined) updatePayload.postal_code = payload.postalCode
    if (payload.logoUrl !== undefined) updatePayload.logo_url = payload.logoUrl
    if (payload.coverImageUrl !== undefined) updatePayload.cover_image_url = payload.coverImageUrl
    if (payload.feesDisplayMode !== undefined) updatePayload.fees_display_mode = payload.feesDisplayMode
    if (payload.monthlyFeeMin !== undefined) updatePayload.monthly_fee_min = payload.monthlyFeeMin
    if (payload.monthlyFeeMax !== undefined) updatePayload.monthly_fee_max = payload.monthlyFeeMax
    if (payload.subsidyAccepted !== undefined) updatePayload.subsidy_accepted = payload.subsidyAccepted
    if (payload.ageGroupPricing !== undefined) updatePayload.age_group_pricing = payload.ageGroupPricing
    if (payload.isActive !== undefined) updatePayload.is_active = payload.isActive
    if (payload.isRegistered !== undefined) updatePayload.is_registered = payload.isRegistered

    if (
      payload.operatingHours !== undefined ||
      payload.dsdStatus !== undefined ||
      payload.marketplaceUpgrades !== undefined
    ) {
      const { data: settingsRow, error: settingsError } = await admin
        .from('ecd_centres')
        .select('communication_automation_settings')
        .eq('id', centreId)
        .maybeSingle()
      if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 400 })

      const existingSettings =
        settingsRow?.communication_automation_settings &&
        typeof settingsRow.communication_automation_settings === 'object' &&
        !Array.isArray(settingsRow.communication_automation_settings)
          ? (settingsRow.communication_automation_settings as Record<string, unknown>)
          : {}
      const tenantAdminOverrides =
        existingSettings.tenant_admin_overrides &&
        typeof existingSettings.tenant_admin_overrides === 'object' &&
        !Array.isArray(existingSettings.tenant_admin_overrides)
          ? { ...(existingSettings.tenant_admin_overrides as Record<string, unknown>) }
          : {}

      if (payload.operatingHours !== undefined) tenantAdminOverrides.operating_hours = payload.operatingHours
      if (payload.dsdStatus !== undefined) tenantAdminOverrides.dsd_status = payload.dsdStatus
      if (payload.marketplaceUpgrades !== undefined) tenantAdminOverrides.marketplace_upgrades = payload.marketplaceUpgrades

      updatePayload.communication_automation_settings = {
        ...existingSettings,
        tenant_admin_overrides: tenantAdminOverrides,
      }
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error } = await admin.from('ecd_centres').update(updatePayload).eq('id', centreId)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const hasSubscriptionUpdate =
      payload.subscriptionTier !== undefined ||
      payload.subscriptionStatus !== undefined ||
      payload.subscriptionMonthlyPrice !== undefined

    if (hasSubscriptionUpdate) {
      const { data: existingSubscription, error: subscriptionReadError } = await admin
        .from('subscriptions')
        .select('tier,status,monthly_price')
        .eq('ecd_id', centreId)
        .maybeSingle()
      if (subscriptionReadError) return NextResponse.json({ error: subscriptionReadError.message }, { status: 400 })

      const requestedTier = (payload.subscriptionTier ?? existingSubscription?.tier ?? 'basic') as RequestedTier
      const requestedStatus = (payload.subscriptionStatus ?? existingSubscription?.status ?? 'trial') as
        | 'trial'
        | 'active'
        | 'past_due'
        | 'canceled'
        | 'suspended'
      const requestedMonthlyPrice = payload.subscriptionMonthlyPrice ?? Number(existingSubscription?.monthly_price ?? 0)
      const normalizedPlan = normalizeRequestedTier(requestedTier, requestedStatus, requestedMonthlyPrice)

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
    }

    await writePlatformActivity(admin, {
      actorUserId: platformAdmin.userId,
      actorEmail: platformAdmin.email,
      entityType: 'tenant',
      entityId: centreId,
      action: 'set_profile',
      summary: 'Updated tenant profile and commercial settings',
      details: {
        updatedFields: Object.keys(updatePayload),
        subscriptionUpdated: hasSubscriptionUpdate,
      },
    })

    return NextResponse.json({
      ok: true,
      updated: true,
      subscriptionUpdated: hasSubscriptionUpdate,
    })
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

  if (payload.action === 'delete') {
    const now = new Date().toISOString()
    const { error } = await admin.from('ecd_centres').update({
      is_deleted: true,
      deleted_at: now,
      deleted_by: platformAdmin.userId,
      is_active: false,
    }).eq('id', centreId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await writePlatformActivity(admin, {
      actorUserId: platformAdmin.userId,
      actorEmail: platformAdmin.email,
      entityType: 'tenant',
      entityId: centreId,
      action: 'delete',
      summary: 'Moved tenant to bin',
      details: { deletedAt: now },
    })
    void sendPlatformAdminActionNotification({
      subject: 'Centre moved to bin',
      heading: 'A centre was moved to the admin bin.',
      lines: [
        `Centre: ${centreName}`,
        `Slug: ${centreSlug}`,
        `Centre ID: ${centreId}`,
        `Actor: ${platformAdmin.email ?? 'platform-admin'}`,
      ],
      details: { deleted: true, deletedAt: now },
    })

    return NextResponse.json({ ok: true, deleted: true })
  }

  if (payload.action === 'restore') {
    const { error } = await admin.from('ecd_centres').update({
      is_deleted: false,
      deleted_at: null,
      deleted_by: null,
    }).eq('id', centreId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await writePlatformActivity(admin, {
      actorUserId: platformAdmin.userId,
      actorEmail: platformAdmin.email,
      entityType: 'tenant',
      entityId: centreId,
      action: 'restore',
      summary: 'Restored tenant from bin',
    })
    void sendPlatformAdminActionNotification({
      subject: 'Centre restored',
      heading: 'A centre was restored from the bin.',
      lines: [
        `Centre: ${centreName}`,
        `Slug: ${centreSlug}`,
        `Centre ID: ${centreId}`,
        `Actor: ${platformAdmin.email ?? 'platform-admin'}`,
      ],
      details: { restored: true },
    })

    return NextResponse.json({ ok: true, restored: true })
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
