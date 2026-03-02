import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { writePlatformActivity } from '@/lib/admin/activity-log'
import { queueEmail } from '@/lib/communications/emails'
import { APP_URL } from '@/lib/config'
import { randomBytes } from 'crypto'

const createCentreSchema = z.object({
  slug: z.string().min(2).max(80),
  name: z.string().min(2).max(160),
  primaryContactName: z.string().min(2).max(160),
  email: z.string().email(),
  phone: z.string().min(5).max(40),
  address: z.string().min(3).max(255),
  suburb: z.string().min(2).max(120),
  city: z.string().min(2).max(120).default('Johannesburg'),
  province: z.string().min(2).max(120).default('Gauteng'),
  postalCode: z.string().max(20).optional(),
  monthlyPrice: z.number().min(0).default(0),
  tier: z.enum(['pilot', 'basic', 'standard', 'premium']).default('basic'),
  contractSigned: z.boolean(),
  onboardingFeePaid: z.boolean(),
})

export async function POST(request: Request) {
  const platformAdmin = await requirePlatformAdmin(request)
  if (!platformAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const payload = await request.json().catch(() => null)
  const parsed = createCentreSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const adminClient = createAdminClient()
  const data = parsed.data
  const isPilotPlan = data.tier === 'pilot'
  const normalizedTier = isPilotPlan ? 'basic' : data.tier
  const normalizedMonthlyPrice = isPilotPlan ? 0 : data.monthlyPrice

  const { data: centre, error: centreError } = await adminClient
    .from('ecd_centres')
    .insert({
      slug: data.slug,
      name: data.name,
      primary_contact_name: data.primaryContactName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      suburb: data.suburb,
      city: data.city,
      province: data.province,
      postal_code: data.postalCode ?? null,
      contract_signed: data.contractSigned,
      onboarding_fee_paid: data.onboardingFeePaid,
      is_active: false,
    })
    .select('id,slug,name,city,province')
    .single()

  if (centreError) {
    return NextResponse.json({ error: centreError.message }, { status: 400 })
  }

  const tempPassword = `Cc!${randomBytes(16).toString('base64url')}a1`

  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email: data.email,
    password: tempPassword,
    email_confirm: true,
  })

  if (authError) {
    await adminClient.from('ecd_centres').delete().eq('id', centre.id)
    return NextResponse.json(
      { error: `Failed to create primary admin user: ${authError.message}` },
      { status: 500 }
    )
  }

  const { error: profileError } = await adminClient.from('user_profiles').insert({
    id: authUser.user.id,
    full_name: data.primaryContactName,
    email: data.email,
    phone: data.phone,
    role: 'ecd_admin',
  })

  if (profileError) {
    await adminClient.auth.admin.deleteUser(authUser.user.id)
    await adminClient.from('ecd_centres').delete().eq('id', centre.id)
    return NextResponse.json(
      { error: `Failed to create primary admin profile: ${profileError.message}` },
      { status: 500 }
    )
  }

  const { error: ecdAdminError } = await adminClient.from('ecd_admins').insert({
    ecd_id: centre.id,
    user_id: authUser.user.id,
    role: 'ecd_admin',
  })

  if (ecdAdminError) {
    await adminClient.auth.admin.deleteUser(authUser.user.id)
    await adminClient.from('user_profiles').delete().eq('id', authUser.user.id)
    await adminClient.from('ecd_centres').delete().eq('id', centre.id)
    return NextResponse.json(
      { error: `Failed to link ECD admin to centre: ${ecdAdminError.message}` },
      { status: 500 }
    )
  }

  const { error: subscriptionError } = await adminClient.from('subscriptions').insert({
    ecd_id: centre.id,
    tier: normalizedTier,
    status: 'trial',
    monthly_price: normalizedMonthlyPrice,
  })

  if (subscriptionError) {
    await adminClient.from('ecd_admins').delete().eq('ecd_id', centre.id).eq('user_id', authUser.user.id)
    await adminClient.from('user_profiles').delete().eq('id', authUser.user.id)
    await adminClient.auth.admin.deleteUser(authUser.user.id)
    await adminClient.from('ecd_centres').delete().eq('id', centre.id)
    return NextResponse.json(
      {
        error: 'Failed to create subscription and rolled back tenant provisioning',
        details: subscriptionError.message,
      },
      { status: 500 }
    )
  }

  await writePlatformActivity(adminClient, {
    actorUserId: platformAdmin.userId,
    actorEmail: platformAdmin.email,
    entityType: 'tenant',
    entityId: centre.id,
    action: 'create_tenant',
    summary: `Created tenant ${centre.name}`,
    details: {
      slug: centre.slug,
      requestedPlan: data.tier,
      tier: normalizedTier,
      monthlyPrice: normalizedMonthlyPrice,
      primaryContactEmail: data.email,
      isPilotPlan,
    },
  })

  const paymentLink = `${APP_URL}/onboarding/pay?centre=${centre.slug}`
  const emailSubject = isPilotPlan
    ? 'Welcome to CentreConnect Pilot - Your trial is live'
    : 'Welcome to CentreConnect - Set up your account'
  const emailBody = isPilotPlan
    ? `Dear ${data.primaryContactName},

Welcome to CentreConnect Pilot! Your ECD Centre, ${data.name}, has been set up in trial mode.

No card details are needed right now. You can sign in and begin enrollment immediately.

Best regards,
The CentreConnect Team`
    : `Dear ${data.primaryContactName},

Welcome to CentreConnect! Your ECD Centre, ${data.name}, has been set up.

To activate your account and set up your payment details, please visit:
${paymentLink}

We look forward to helping you manage and grow your Early Childhood Development centre.

Best regards,
The CentreConnect Team`

  await queueEmail(data.email, emailSubject, emailBody)

  const { error: taskError } = await adminClient.from('admin_tasks').insert({
    type: 'activate_tenant',
    title: `Activate ${centre.name}`,
    description: isPilotPlan
      ? 'Pilot tenant created. Activate workspace and monitor onboarding.'
      : 'Onboarding fee confirmed. One-click activation ready.',
    ecd_id: centre.id,
    status: 'pending',
    created_by: platformAdmin.userId,
  })

  if (taskError) {
    console.error(`Failed to create admin task for centre ${centre.id}: ${taskError.message}`)
  }

  return NextResponse.json(
    {
      centre,
      createdBy: platformAdmin.userId,
      pilot: isPilotPlan,
    },
    { status: 201 }
  )
}
