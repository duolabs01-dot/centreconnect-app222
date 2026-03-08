import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { writePlatformActivity } from '@/lib/admin/activity-log'
import { writeInviteLog } from '@/lib/admin/invite-logs'
import { queueEmail } from '@/lib/communications/emails'
import {
  renderEcdPasswordSetupEmail,
  renderParentToEcdAdminMigrationEmail,
  renderPilotWelcomePackEmail,
} from '@/lib/email/templates/pilot-welcome-pack'
import { randomBytes } from 'crypto'
import { combineName, resolveFirstName } from '@/lib/utils/name'
import {
  buildAuthCallbackRedirect,
  buildFirstPartyConfirmLink,
  buildLockedResetPasswordRedirect,
  normalizeAppUrl,
  sanitizeGeneratedAccessLink,
} from '@/lib/auth/onboarding-links'
import { syncAuthUserMetadataRole } from '@/lib/auth/provision-role'
import { revokeUserSessionsByUserId } from '@/lib/auth/revoke-user-sessions'

const APP_BASE_URL = normalizeAppUrl()

const createCentreSchema = z.object({
  slug: z.string().min(2).max(80),
  name: z.string().min(2).max(160),
  primaryContactFirstName: z.string().min(1).max(120),
  primaryContactSurname: z.string().max(120).optional().default(''),
  primaryContactName: z.string().min(2).max(160).optional(),
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
  return buildLockedResetPasswordRedirect(email)
}

async function createPasswordSetupLink(adminClient: ReturnType<typeof createAdminClient>, email: string) {
  const resetPath = `/reset-password?locked_email=${encodeURIComponent(email)}`
  const fallbackRedirect = toLockedResetUrl(email)
  const result = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: fallbackRedirect,
    },
  })

  const actionLink = result.data?.properties?.action_link?.trim() ?? ''
  if (!result.error && actionLink.length > 0) {
    const firstPartyConfirmLink = buildFirstPartyConfirmLink({
      hashedToken: result.data?.properties?.hashed_token ?? null,
      verificationType: result.data?.properties?.verification_type ?? 'recovery',
      nextPath: resetPath,
    })

    return {
      link:
        firstPartyConfirmLink ??
        sanitizeGeneratedAccessLink({
          actionLink,
          fallbackRedirectTo: fallbackRedirect,
        }),
      error: null as string | null,
    }
  }

  const fallback = `${APP_BASE_URL}/forgot-password`
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

async function removeParentRecord(adminClient: ReturnType<typeof createAdminClient>, userId: string) {
  const { error } = await adminClient.from('parents').delete().eq('id', userId)
  if (error) {
    return error.message
  }
  return null
}

function normalizeSlug(slug: string) {
  return slug.trim().toLowerCase()
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
  const normalizedSlug = normalizeSlug(data.slug)
  const normalizedEmail = data.email.trim().toLowerCase()
  const contactFirstName = data.primaryContactFirstName.trim()
  const contactSurname = data.primaryContactSurname?.trim() ?? ''
  const contactFullName =
    combineName(contactFirstName, contactSurname) ||
    data.primaryContactName?.trim() ||
    contactFirstName
  const contactFirstNameForComms = resolveFirstName({
    firstName: contactFirstName,
    fullName: contactFullName,
    email: normalizedEmail,
    fallback: 'Friend',
  })
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

  const [existingBySlugResult, existingByEmailResult] = await Promise.all([
    adminClient
      .from('ecd_centres')
      .select('id,slug,name,owner_id')
      .eq('slug', normalizedSlug)
      .maybeSingle(),
    adminClient
      .from('ecd_centres')
      .select('id,slug,name,owner_id')
      .eq('email', normalizedEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (existingBySlugResult.error) {
    return NextResponse.json({ error: existingBySlugResult.error.message }, { status: 400 })
  }
  if (existingByEmailResult.error) {
    return NextResponse.json({ error: existingByEmailResult.error.message }, { status: 400 })
  }

  const existingBySlug = existingBySlugResult.data
  const existingByEmail = existingByEmailResult.data
  const existingClaimedSlug = Boolean(
    existingBySlug?.owner_id && String(existingBySlug.owner_id).trim().length > 0
  )
  if (existingClaimedSlug) {
    return NextResponse.json(
      {
        error: `Centre slug "${normalizedSlug}" is already claimed and cannot be re-linked. Use a different slug or manage the existing tenant.`,
      },
      { status: 409 }
    )
  }

  const existingUnclaimedByEmail =
    existingByEmail && (!existingByEmail.owner_id || String(existingByEmail.owner_id).trim().length === 0)
      ? existingByEmail
      : null

  if (
    existingByEmail &&
    existingByEmail.id !== existingBySlug?.id &&
    existingByEmail.owner_id &&
    String(existingByEmail.owner_id).trim().length > 0
  ) {
    return NextResponse.json(
      {
        error: `A claimed centre already uses ${normalizedEmail}. Update the existing tenant instead of creating a new one.`,
      },
      { status: 409 }
    )
  }

  const linkableCentre = existingBySlug ?? existingUnclaimedByEmail
  const linkingExistingUnclaimedCentre = Boolean(linkableCentre)
  let createdNewCentre = false

  const centreWritePayload = {
    slug: normalizedSlug,
    name: data.name,
    primary_contact_name: contactFullName,
    primary_contact_first_name: contactFirstName,
    primary_contact_surname: contactSurname || null,
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
  }

  const centreResult = linkableCentre
    ? await adminClient
        .from('ecd_centres')
        .update(centreWritePayload)
        .eq('id', linkableCentre.id)
        .is('owner_id', null)
        .select('id,slug,name,city,province')
        .maybeSingle()
    : await adminClient
        .from('ecd_centres')
        .insert(centreWritePayload)
        .select('id,slug,name,city,province')
        .single()

  const centre = centreResult.data
  const centreError = centreResult.error

  if (centreError) {
    return NextResponse.json({ error: centreError.message }, { status: 400 })
  }

  if (!centre) {
    return NextResponse.json(
      { error: 'Existing centre listing is no longer claimable. Refresh and try again.' },
      { status: 409 }
    )
  }

  if (!linkingExistingUnclaimedCentre) {
    createdNewCentre = true
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
          if (createdNewCentre) {
            await adminClient.from('ecd_centres').delete().eq('id', centre.id)
          }
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
        if (createdNewCentre) {
          await adminClient.from('ecd_centres').delete().eq('id', centre.id)
        }
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
    if (createdNewCentre) {
      await adminClient.from('ecd_centres').delete().eq('id', centre.id)
    }
    return NextResponse.json(
      { error: 'Failed to resolve primary admin account for tenant provisioning.' },
      { status: 500 }
    )
  }

  const { error: profileError } = await adminClient.from('user_profiles').upsert({
    id: adminUserId,
    first_name: contactFirstName,
    surname: contactSurname || null,
    full_name: contactFullName,
    phone: data.phone,
    role: 'ecd_admin',
  }, { onConflict: 'id' })

  if (profileError) {
    if (createdNewAuthUser) {
      await adminClient.auth.admin.deleteUser(adminUserId)
    }
    if (createdNewCentre) {
      await adminClient.from('ecd_centres').delete().eq('id', centre.id)
    }
    return NextResponse.json(
      { error: `Failed to create primary admin profile: ${profileError.message}` },
      { status: 500 }
    )
  }

  const metadataSync = await syncAuthUserMetadataRole({
    adminClient,
    userId: adminUserId,
    role: 'ecd_admin',
  })
  if (!metadataSync.ok) {
    console.warn('[admin/centres] Failed to sync auth metadata role:', metadataSync.error)
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
    if (createdNewCentre) {
      await adminClient.from('ecd_centres').delete().eq('id', centre.id)
    }
    return NextResponse.json(
      { error: `Failed to link ECD admin to centre: ${ecdAdminError.message}` },
      { status: 500 }
    )
  }

  const { error: ownerAssignError } = await adminClient
    .from('ecd_centres')
    .update({ owner_id: adminUserId })
    .eq('id', centre.id)
    .is('owner_id', null)

  if (ownerAssignError) {
    if (createdNewAuthUser) {
      await adminClient.auth.admin.deleteUser(adminUserId)
      await adminClient.from('user_profiles').delete().eq('id', adminUserId)
    }
    await adminClient.from('ecd_admins').delete().eq('ecd_id', centre.id).eq('user_id', adminUserId)
    if (createdNewCentre) {
      await adminClient.from('ecd_centres').delete().eq('id', centre.id)
    }
    return NextResponse.json(
      { error: `Failed to assign centre owner: ${ownerAssignError.message}` },
      { status: 500 }
    )
  }

  const { error: subscriptionError } = await adminClient.from('subscriptions').upsert(
    {
      ecd_id: centre.id,
      tier: normalizedTier,
      status: 'trial',
      monthly_price: normalizedMonthlyPrice,
    },
    { onConflict: 'ecd_id' }
  )

  if (subscriptionError) {
    await adminClient.from('ecd_admins').delete().eq('ecd_id', centre.id).eq('user_id', adminUserId)
    if (createdNewAuthUser) {
      await adminClient.from('user_profiles').delete().eq('id', adminUserId)
      await adminClient.auth.admin.deleteUser(adminUserId)
    }
    if (createdNewCentre) {
      await adminClient.from('ecd_centres').delete().eq('id', centre.id)
    }
    return NextResponse.json(
      {
        error: 'Failed to create subscription and rolled back tenant provisioning',
        details: subscriptionError.message,
      },
      { status: 500 }
    )
  }

  const emailWarnings: string[] = []
  let parentAccessRevoked = false
  let parentAccessRevocationError: string | null = null

  if (reusedExistingUser) {
    const revokeSessionsResult = await revokeUserSessionsByUserId(adminClient, adminUserId)
    if (!revokeSessionsResult.ok && revokeSessionsResult.warning) {
      emailWarnings.push(revokeSessionsResult.warning)
    }
  }

  if (reusedExistingUser && resolvedExistingRole === 'parent_user') {
    parentAccessRevocationError = await removeParentRecord(adminClient, adminUserId)
    if (parentAccessRevocationError) {
      emailWarnings.push(
        'Failed to remove the parent profile record for this user. They may still hit the parent workspace until the cleanup is rerun.'
      )
    } else {
      parentAccessRevoked = true
    }
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
      parentAccessRevoked,
      parentAccessRevocationError,
      linkedExistingUnclaimedListing: linkingExistingUnclaimedCentre,
    },
  })
  const setupLinkResult = await createPasswordSetupLink(adminClient, normalizedEmail)
  if (setupLinkResult.error) {
    emailWarnings.push(setupLinkResult.error)
  }
  const appBaseUrl = APP_BASE_URL
  const onboardingLocation = [data.suburb, data.city].filter(Boolean).join(', ')
  const welcomePackQuery = new URLSearchParams({
    onboarding: '1',
    name: contactFirstNameForComms,
    centre: data.name,
    location: onboardingLocation || 'your area',
    slug: centre.slug,
  }).toString()
  const welcomePackPath = `/ecd/welcome?${welcomePackQuery}`
  const welcomePackGuideLink = `${appBaseUrl}${welcomePackPath}`
  const welcomePackAuthRedirect = buildAuthCallbackRedirect(welcomePackPath)
  const welcomePackGetStartedLink = setupLinkResult.link || welcomePackAuthRedirect
  const qrPosterLink = `${appBaseUrl}/centre/${centre.slug}/poster`

  const setupEmailHtml = await renderEcdPasswordSetupEmail({
    centreName: data.name,
    contactName: contactFirstNameForComms,
    lockedEmail: normalizedEmail,
    setupLink: setupLinkResult.link || welcomePackAuthRedirect,
    loginLink: `${appBaseUrl}/ecd/login`,
  })
  const setupEmailResult = await queueEmail(
    normalizedEmail,
    `Set your CentreConnect password for ${data.name}`,
    setupEmailHtml
  )
  if (!setupEmailResult.success) {
    emailWarnings.push(setupEmailResult.error ?? 'Failed to queue password setup email.')
  } else {
    await writeInviteLog(adminClient, {
      centreId: centre.id,
      ownerEmail: normalizedEmail,
      ownerPhone: data.phone,
      inviteType: 'email',
      status: 'sent',
      notes: 'ECD admin password setup invite.',
    })
  }

  if (reusedExistingUser && resolvedExistingRole === 'parent_user') {
    const migrationEmailHtml = await renderParentToEcdAdminMigrationEmail({
      centreName: data.name,
      contactName: contactFirstNameForComms,
      dashboardLink: `${appBaseUrl}/ecd/dashboard`,
      websiteBuilderLink: `${appBaseUrl}/ecd/website`,
      applicationsLink: `${appBaseUrl}/ecd/applications`,
    })
    const migrationEmailResult = await queueEmail(
      normalizedEmail,
      `Access updated: You are now ECD Admin for ${data.name}`,
      migrationEmailHtml
    )
    if (!migrationEmailResult.success) {
      emailWarnings.push(migrationEmailResult.error ?? 'Failed to queue ECD admin migration email.')
    } else {
      await writeInviteLog(adminClient, {
        centreId: centre.id,
        ownerEmail: normalizedEmail,
        ownerPhone: data.phone,
        inviteType: 'email',
        status: 'sent',
        notes: 'Parent access revoked and migrated to ECD Admin.',
      })
    }
  }

  if (isPilotPlan) {
    const welcomePackHtml = await renderPilotWelcomePackEmail({
      centreName: data.name,
      contactName: contactFirstNameForComms,
      dashboardLink: welcomePackGetStartedLink,
      websiteBuilderLink: `${appBaseUrl}/ecd/website`,
      attendanceLink: `${appBaseUrl}/ecd/attendance`,
      pickupLink: `${appBaseUrl}/ecd/pickup`,
      qrPosterLink,
      supportWhatsApp: '+27685356430',
      supportEmail: 'admin@centerconnect.co.za',
      supportLink: `${appBaseUrl}/ecd/support`,
      welcomeGuideLink: welcomePackGuideLink,
      quickSteps: [
        { label: 'Upload your centre logo', href: `${appBaseUrl}/ecd/website`, done: false, whereItShows: 'Welcome pack + centre cards' },
        { label: 'Add your hero cover photo', href: `${appBaseUrl}/ecd/website`, done: false, whereItShows: 'Welcome pack header' },
        { label: 'Add your first five children', href: `${appBaseUrl}/ecd/children/new`, done: false, whereItShows: 'Attendance + reports' },
        { label: 'Take attendance once', href: `${appBaseUrl}/ecd/attendance`, done: false, whereItShows: 'Parent daily updates' },
        { label: 'Turn on safe pickup', href: `${appBaseUrl}/ecd/pickup`, done: false, whereItShows: 'Gate-time verification' },
        { label: 'Print parent QR poster for your gate', href: qrPosterLink, done: false, whereItShows: 'Parent onboarding and gate pickup' },
      ],
    })
    const welcomePackResult = await queueEmail(
      normalizedEmail,
      `Pilot Welcome Pack | ${data.name}`,
      welcomePackHtml
    )
    if (!welcomePackResult.success) {
      emailWarnings.push(welcomePackResult.error ?? 'Failed to queue pilot welcome pack email.')
    } else {
      await writeInviteLog(adminClient, {
        centreId: centre.id,
        ownerEmail: normalizedEmail,
        ownerPhone: data.phone,
        inviteType: 'welcome_pack',
        status: 'sent',
        notes: 'Pilot welcome pack on tenant creation.',
      })
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
      linkedExistingUnclaimedListing: linkingExistingUnclaimedCentre,
      pilot: isPilotPlan,
      migratedExistingUser: reusedExistingUser,
      previousRole: resolvedExistingRole,
      warnings: emailWarnings.length > 0 ? emailWarnings : undefined,
    },
    { status: createdNewCentre ? 201 : 200 }
  )
}
