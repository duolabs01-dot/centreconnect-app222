import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { writePlatformActivity } from '@/lib/admin/activity-log'

const TIER_PRICES: Record<'basic' | 'standard' | 'premium', number> = {
  basic: 19900,
  standard: 29900,
  premium: 49900,
}

function normalizeTier(value: string | undefined): 'basic' | 'standard' | 'premium' {
  if (value === 'basic') return 'basic'
  if (value === 'standard') return 'standard'
  return 'premium'
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const identity = await requirePlatformAdmin(request)
  if (!identity) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const centreId = (await context.params).id
  if (!centreId) {
    return NextResponse.json({ error: 'Missing centre id' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({})) as { tier?: string }
  const tier = normalizeTier(body.tier)
  const monthlyPrice = TIER_PRICES[tier]

  const admin = createAdminClient()
  const { data: centre, error: centreError } = await admin
    .from('ecd_centres')
    .select('id,name')
    .eq('id', centreId)
    .maybeSingle()

  if (centreError) {
    return NextResponse.json({ error: centreError.message }, { status: 400 })
  }

  if (!centre) {
    return NextResponse.json({ error: 'Centre not found' }, { status: 404 })
  }

  const { error: subscriptionError } = await admin.from('subscriptions').upsert(
    {
      ecd_id: centreId,
      tier,
      status: 'active',
      monthly_price: monthlyPrice,
    },
    { onConflict: 'ecd_id' }
  )

  if (subscriptionError) {
    return NextResponse.json({ error: subscriptionError.message }, { status: 500 })
  }

  const { error: centreUpdateError } = await admin.from('ecd_centres').update({ is_active: true }).eq('id', centreId)
  if (centreUpdateError) {
    return NextResponse.json({ error: centreUpdateError.message }, { status: 500 })
  }

  await writePlatformActivity(admin, {
    actorUserId: identity.userId,
    actorEmail: identity.email,
    entityType: 'tenant',
    entityId: centreId,
    action: 'upgrade_tenant',
    summary: `Upgraded tenant ${centre.name ?? centreId}`,
    details: {
      tier,
      monthlyPrice,
    },
  })

  return NextResponse.json({ ok: true, tier })
}
