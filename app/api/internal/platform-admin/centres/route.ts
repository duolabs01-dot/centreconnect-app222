import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { writePlatformActivity } from '@/lib/admin/activity-log'
import { queueEmail } from '@/lib/communications/emails'
import { APP_URL } from '@/lib/config'
import {
  renderEcdPasswordSetupEmail,
  renderPilotWelcomePackEmail,
} from '@/lib/email/templates/pilot-welcome-pack'
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
  allowExistingEmailMigration: z.boolean().optional().default(false),
  confirmAdminRoleMigration: z.boolean().optional().default(false),
  confirmParentAccessRevocation: z.boolean().optional().default(false),
})

function toLockedResetUrl(email: string) {
  try {
    const url = new URL('/reset-password', APP_URL)
    url.searchParams.set('locked_email', email)
    return url.toString()
  } catch {
    return `${APP_URL.replace(/\/$/, '')}/reset-password?locked_email=${encodeURIComponent(email)}`
  }
}

async function createPasswordSetupLink(adminClient: ReturnType<typeof createAdminClient>, email: string) {
  const result = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: toLockedResetUrl(email),
    },
  })

  const actionLink = result.data?.properties?.action_link?.trim() ?? ''
  if (!result.error && actionLink.length > 0) {
    return { link: actionLink, error: null as string | null }
  }

  const fallback = `${APP_URL.replace(/\/$/, '')}/forgot-password`
  return { link: fallback, error: result.error?.message ?? 'Password setup link generation failed.' }
}

function isEmailAlreadyRegisteredError(message?: string | null) {
  const value = (message ?? '').toLowerCase()
  return value.includes('already been registered') || value.includes('already registered') || value.includes('already exists')
}

async function findAuthUserIdByEmail(adminClient: ReturnType<typeof createAdminClient>, email: string) {
  const { data, error } = await adminClient
    .schema('auth')
    .from('users')
    .select('id,email')
    .ilike('email', email)
    .limit(1)
    .maybeSingle()

  if (error) return null
  return data?.id ?? null
}

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
  const normalizedEmail = data.email.trim().toLowerCase()
  const isPilotPlan = data.tier === 'pilot'
  const normalizedTier = isPilotPlan ? 'basic' : data.tier
  const normalizedMonthlyPrice = isPilotPlan ? 0 : data.monthlyPrice
  const existingAuthUserId = await findAuthUserIdByEmail(adminClient, normalizedEmail)

  const { data: existingProfile } = existingAuthUserId
    ? await adminClient
        .from('user_profiles')
        .select('id,role')
        .eq('id', existingAuthUserId)
        .maybeSingle()
    : { data: null as { id: string; role: string | null } | null }

  const existingRole = typeof existingProfile?.role === 'string' ? existingProfile.role : null
  let resolvedExistingRole = existingRole
  let reusedExistingUser = Boolean(existingAuthUserId)
  const migrationConfirmed =
    data.allowExistingEmailMigration && data.confirmAdminRoleMigration && data.confirmParentAccessRevocation

  if (existingAuthUserId && !migrationConfirmed) {
    return NextResponse.json(
      {
        error:
          'This email is already registered. Confirm migration to continue. This will force the user role to ECD Admin and revoke parent access.',
        code: 'existing_user_confirmation_required',
        conflict: {
          email: normalizedEmail,
          existingRole,
          existingUserId: existingAuthUserId,
          willSetRole: 'ecd_admin',
          parentAccessWillBeRevoked: existingRole === 'parent_user',
        },
      },
      { status: 409 }
    )
  }

  const { data: centre, error: centreError } = await adminClient
    .from('ecd_centres')
    .insert({
      slug: data.slug,
      name: data.name,
      primary_contact_name: data.primaryContactName,
      email: normalizedEmail,
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

  let adminUserId: string | null = existingAuthUserId
  let createdNewAuthUser = false

  if (!adminUserId) {
    const tempPassword = `Cc!${randomBytes(16).toString('base64url')}a1`

    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
    })

    if (authError) {
      if (isEmailAlreadyRegisteredError(authError.message)) {
        const fallbackExistingUserId = await findAuthUserIdByEmail(adminClient, normalizedEmail)
        const { data: fallbackExistingProfile } = fallbackExistingUserId
          ? await adminClient
              .from('user_profiles')
              .select('id,role')
              .eq('id', fallbackExistingUserId)
              .maybeSingle()
          : { data: null as { id: string; role: string | null } | null }

        const fallbackRole = typeof fallbackExistingProfile?.role === 'string'
          ? fallbackExistingProfile.role
          : resolvedExistingRole
        resolvedExistingRole = fallbackRole
        if (fallbackExistingUserId && migrationConfirmed) {
          adminUserId = fallbackExistingUserId
          reusedExistingUser = true
        } else {
          await adminClient.from('ecd_centres').delete().eq('id', centre.id)
          return NextResponse.json(
            {
              error:
                'This email is already registered. Confirm migration to continue. This will force the user role to ECD Admin and revoke parent access.',
              code: 'existing_user_confirmation_required',
              conflict: {
                email: normalizedEmail,
                existingRole: fallbackRole,
                existingUserId: fallbackExistingUserId ?? null,
                willSetRole: 'ecd_admin',
                parentAccessWillBeRevoked: fallbackRole === 'parent_user',
              },
            },
            { status: 409 }
          )
        }
      } else {
        await adminClient.from('ecd_centres').delete().eq('id', centre.id)
        return NextResponse.json(
          { error: `Failed to create primary admin user: ${authError.message}` },
          { status: 500 }
        )
      }
    } else {
      adminUserId = authUser.user.id
      createdNewAuthUser = true
    }
  }

  if (!adminUserId) {
    await adminClient.from('ecd_centres').delete().eq('id', centre.id)
    return NextResponse.json(
      { error: 'Failed to resolve primary admin account for tenant provisioning.' },
      { status: 500 }
    )
  }

  const { error: profileError } = await adminClient.from('user_profiles').upsert({
    id: adminUserId,
    full_name: data.primaryContactName,
    email: normalizedEmail,
    phone: data.phone,
    role: 'ecd_admin',
  }, { onConflict: 'id' })

  if (profileError) {
    if (createdNewAuthUser) {
      await adminClient.auth.admin.deleteUser(adminUserId)
    }
    await adminClient.from('ecd_centres').delete().eq('id', centre.id)
    return NextResponse.json(
      { error: `Failed to create primary admin profile: ${profileError.message}` },
      { status: 500 }
    )
  }

  const { error: ecdAdminError } = await adminClient.from('ecd_admins').upsert({
    ecd_id: centre.id,
    user_id: adminUserId,
    role: 'ecd_admin',
    accepted_at: new Date().toISOString(),
  }, { onConflict: 'ecd_id,user_id' })

  if (ecdAdminError) {
    if (createdNewAuthUser) {
      await adminClient.auth.admin.deleteUser(adminUserId)
      await adminClient.from('user_profiles').delete().eq('id', adminUserId)
    }
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
    await adminClient.from('ecd_admins').delete().eq('ecd_id', centre.id).eq('user_id', adminUserId)
    if (createdNewAuthUser) {
      await adminClient.from('user_profiles').delete().eq('id', adminUserId)
      await adminClient.auth.admin.deleteUser(adminUserId)
    }
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
      primaryContactEmail: normalizedEmail,
      isPilotPlan,
      migratedExistingUser: reusedExistingUser,
      previousRole: resolvedExistingRole,
      roleForcedTo: 'ecd_admin',
      parentAccessRevoked: reusedExistingUser && resolvedExistingRole === 'parent_user',
    },
  })
  const emailWarnings: string[] = []
  const setupLinkResult = await createPasswordSetupLink(adminClient, normalizedEmail)
  if (setupLinkResult.error) {
    emailWarnings.push(setupLinkResult.error)
  }

  const setupEmailHtml = await renderEcdPasswordSetupEmail({
    centreName: data.name,
    contactName: data.primaryContactName,
    lockedEmail: normalizedEmail,
    setupLink: setupLinkResult.link,
    loginLink: `${APP_URL.replace(/\/$/, '')}/ecd/login`,
  })
  const setupEmailResult = await queueEmail(
    normalizedEmail,
    `Set your CentreConnect password for ${data.name}`,
    setupEmailHtml
  )
  if (!setupEmailResult.success) {
    emailWarnings.push(setupEmailResult.error ?? 'Failed to queue password setup email.')
  }

  if (isPilotPlan) {
    const welcomePackHtml = await renderPilotWelcomePackEmail({
      centreName: data.name,
      contactName: data.primaryContactName,
      dashboardLink: `${APP_URL.replace(/\/$/, '')}/ecd/dashboard`,
      websiteBuilderLink: `${APP_URL.replace(/\/$/, '')}/ecd/website`,
      supportLink: `${APP_URL.replace(/\/$/, '')}/ecd/support`,
    })
    const welcomePackResult = await queueEmail(
      normalizedEmail,
      `Pilot Welcome Pack | ${data.name}`,
      welcomePackHtml
    )
    if (!welcomePackResult.success) {
      emailWarnings.push(welcomePackResult.error ?? 'Failed to queue pilot welcome pack email.')
    }
  }

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
      migratedExistingUser: reusedExistingUser,
      previousRole: resolvedExistingRole,
      warnings: emailWarnings.length > 0 ? emailWarnings : undefined,
    },
    { status: 201 }
  )
}
