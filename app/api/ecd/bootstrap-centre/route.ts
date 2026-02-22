import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48)
}

async function rollbackProvisionedCentre(admin: ReturnType<typeof createAdminClient>, centreId: string, userId: string) {
  await admin.from('ecd_admins').delete().eq('ecd_id', centreId).eq('user_id', userId)
  await admin.from('subscriptions').delete().eq('ecd_id', centreId)
  await admin.from('ecd_centres').delete().eq('id', centreId)
}

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    const { data: existingAssignment } = await admin
      .from('ecd_admins')
      .select('id,ecd_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingAssignment?.ecd_id) {
      return NextResponse.json({ ok: true, created: false })
    }

    const { data: serviceApplication } = await admin
      .from('ecd_service_applications')
      .select(
        'id,status,centre_name,centre_phone,centre_address,centre_suburb,centre_city,centre_province,selected_tier,provisioned_at'
      )
      .or(`user_id.eq.${user.id},applicant_email.eq.${(user.email ?? '').toLowerCase()}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!serviceApplication || serviceApplication.status !== 'approved') {
      return NextResponse.json(
        { error: 'Application pending approval', code: 'APPLICATION_PENDING' },
        { status: 403 }
      )
    }

    const centreName = (serviceApplication.centre_name ?? '').trim() || 'New ECD Centre'
    const centrePhone = (serviceApplication.centre_phone ?? '').trim() || 'Not provided'
    const centreAddress = (serviceApplication.centre_address ?? '').trim() || 'To be updated'
    const centreSuburb = (serviceApplication.centre_suburb ?? '').trim() || 'To be updated'
    const centreCityRaw = (serviceApplication.centre_city ?? '').trim() || 'Johannesburg'
    const centreProvinceRaw = (serviceApplication.centre_province ?? '').trim() || 'Gauteng'

    const baseSlug = slugify(centreName) || `ecd-${user.id.slice(0, 8)}`
    let finalSlug = baseSlug
    let suffix = 1

    while (true) {
      const { data: slugCheck } = await admin
        .from('ecd_centres')
        .select('id')
        .eq('slug', finalSlug)
        .maybeSingle()
      if (!slugCheck) break
      suffix += 1
      finalSlug = `${baseSlug}-${suffix}`
    }

    const { data: centre, error: centreError } = await admin
      .from('ecd_centres')
      .insert({
        slug: finalSlug,
        name: centreName,
        email: user.email ?? `ecd-${user.id}@example.com`,
        phone: centrePhone,
        address: centreAddress,
        suburb: centreSuburb,
        city: centreCityRaw,
        province: centreProvinceRaw,
        is_active: true,
      })
      .select('id')
      .single()

    if (centreError || !centre?.id) {
      return NextResponse.json({ error: centreError?.message || 'Failed to create centre' }, { status: 400 })
    }

    const { error: adminLinkError } = await admin.from('ecd_admins').insert({
      ecd_id: centre.id,
      user_id: user.id,
      role: 'ecd_admin',
    })

    if (adminLinkError) {
      await rollbackProvisionedCentre(admin, centre.id, user.id)
      return NextResponse.json({ error: adminLinkError.message }, { status: 400 })
    }

    const monthlyPriceByTier: Record<string, number> = {
      basic: 199,
      standard: 299,
      premium: 499,
    }

    const { error: subscriptionError } = await admin.from('subscriptions').upsert(
      {
        ecd_id: centre.id,
        tier: serviceApplication.selected_tier ?? 'basic',
        status: 'trial',
        monthly_price: monthlyPriceByTier[serviceApplication.selected_tier ?? 'basic'] ?? 199,
      },
      { onConflict: 'ecd_id' }
    )
    if (subscriptionError) {
      await rollbackProvisionedCentre(admin, centre.id, user.id)
      return NextResponse.json(
        { error: `Failed to create subscription: ${subscriptionError.message}` },
        { status: 500 }
      )
    }

    const { error: applicationUpdateError } = await admin
      .from('ecd_service_applications')
      .update({
        status: 'provisioned',
        provisioned_at: new Date().toISOString(),
      })
      .eq('id', serviceApplication.id)

    if (applicationUpdateError) {
      return NextResponse.json(
        {
          ok: true,
          created: true,
          warning: `Centre was provisioned, but application status was not updated: ${applicationUpdateError.message}`,
        },
        { status: 200 }
      )
    }

    return NextResponse.json({ ok: true, created: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
