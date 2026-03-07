import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { writePlatformActivity } from '@/lib/admin/activity-log'
import { queueEmail } from '@/lib/communications/emails'
import {
  buildFirstPartyConfirmLink,
  normalizeAppUrl,
  sanitizeGeneratedAccessLinkWithDiagnostics,
} from '@/lib/auth/onboarding-links'
import { resolveFirstName } from '@/lib/utils/name'
import { renderRoleDowngradeActivationEmail } from '@/lib/email/templates/role-downgrade-activation'
import { revokeUserSessionsByUserId } from '@/lib/auth/revoke-user-sessions'

type TenantMembershipRole = 'ecd_admin' | 'ecd_supervisor' | 'ecd_staff'
type TenantUserEffectiveRole = 'owner' | TenantMembershipRole

type TenantUserResponseRow = {
  userId: string
  membershipId: string | null
  role: TenantMembershipRole
  effectiveRole: TenantUserEffectiveRole
  isOwner: boolean
  fullName: string | null
  phone: string | null
  email: string | null
  invitedAt: string | null
  acceptedAt: string | null
}

type TenantPendingInvitationRow = {
  invitationId: string
  email: string
  role: TenantMembershipRole
  invitedAt: string
  acceptedAt: string | null
}

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('set_user_privileges'),
    userId: z.string().uuid(),
    role: z.enum(['owner', 'ecd_admin', 'ecd_supervisor', 'ecd_staff']),
  }),
  z.object({
    action: z.literal('remove_user'),
    userId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('downgrade_to_parent'),
    userId: z.string().uuid(),
    reason: z.string().trim().max(220).optional(),
  }),
  z.object({
    action: z.literal('remove_invitation'),
    invitationId: z.string().uuid(),
  }),
])

function normalizeMembershipRole(value: string | null | undefined): TenantMembershipRole {
  if (value === 'ecd_staff') return 'ecd_staff'
  if (value === 'ecd_supervisor') return 'ecd_supervisor'
  return 'ecd_admin'
}

function normalizeUserRoleForProfile(value: string | null | undefined): 'ecd_admin' | 'ecd_supervisor' | 'ecd_staff' {
  if (value === 'ecd_staff') return 'ecd_staff'
  if (value === 'ecd_supervisor') return 'ecd_supervisor'
  return 'ecd_admin'
}

async function resolveUserEmail(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  fallback: string | null | undefined = null
) {
  const direct = (fallback ?? '').trim().toLowerCase()
  if (direct) return direct
  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error) return null
  return data?.user?.email?.trim().toLowerCase() ?? null
}

async function generateActivationLink(admin: ReturnType<typeof createAdminClient>, email: string) {
  const appUrlRoot = normalizeAppUrl()
  const nextPath = '/account/activate'
  const redirectTo = `${appUrlRoot}/auth/callback?next=${encodeURIComponent(nextPath)}`
  const magicLinkResult = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  })

  const actionLink = magicLinkResult.data?.properties?.action_link?.trim() ?? ''
  if (magicLinkResult.error || !actionLink) {
    return {
      link: '',
      warning: magicLinkResult.error?.message ?? 'Could not generate activation link.',
    }
  }

  const firstPartyConfirmLink = buildFirstPartyConfirmLink({
    hashedToken: magicLinkResult.data?.properties?.hashed_token ?? null,
    verificationType: magicLinkResult.data?.properties?.verification_type ?? 'magiclink',
    nextPath,
  })

  const sanitized = sanitizeGeneratedAccessLinkWithDiagnostics({
    actionLink,
    fallbackRedirectTo: redirectTo,
  })

  return {
    link: firstPartyConfirmLink ?? sanitized.link,
    warning: null as string | null,
    diagnostics: sanitized.diagnostics,
  }
}

async function listTenantUsers(admin: ReturnType<typeof createAdminClient>, centreId: string) {
  const [centreResult, membersResult, invitationsResult] = await Promise.all([
    admin.from('ecd_centres').select('id,name,owner_id').eq('id', centreId).maybeSingle(),
    admin
      .from('ecd_admins')
      .select('id,user_id,role,invited_at,accepted_at,user_profiles!ecd_admins_user_id_fkey(full_name,phone)')
      .eq('ecd_id', centreId)
      .order('invited_at', { ascending: false }),
    admin
      .from('ecd_admin_invitations')
      .select('id,email,role,auth_user_id,invited_at,accepted_at')
      .eq('ecd_id', centreId)
      .order('invited_at', { ascending: false }),
  ])

  if (centreResult.error) {
    return { error: centreResult.error.message as string, status: 400 as const }
  }
  if (!centreResult.data) {
    return { error: 'Centre not found' as string, status: 404 as const }
  }
  if (membersResult.error) {
    return { error: membersResult.error.message as string, status: 400 as const }
  }
  if (invitationsResult.error) {
    return { error: invitationsResult.error.message as string, status: 400 as const }
  }

  const ownerUserId = centreResult.data.owner_id ?? null
  const members = (membersResult.data ?? []) as Array<{
    id: string
    user_id: string
    role: string | null
    invited_at: string
    accepted_at: string | null
    user_profiles:
      | { full_name: string | null; phone: string | null }
      | Array<{ full_name: string | null; phone: string | null }>
      | null
  }>
  const invitations = (invitationsResult.data ?? []) as Array<{
    id: string
    email: string
    role: string | null
    auth_user_id: string | null
    invited_at: string
    accepted_at: string | null
  }>

  const userIds = new Set<string>()
  if (ownerUserId) userIds.add(ownerUserId)
  for (const member of members) {
    userIds.add(member.user_id)
  }
  for (const invitation of invitations) {
    if (invitation.auth_user_id) userIds.add(invitation.auth_user_id)
  }

  const userIdList = Array.from(userIds)
  const profilesResult =
    userIdList.length > 0
      ? await admin.from('user_profiles').select('id,full_name,phone').in('id', userIdList)
      : { data: [], error: null } as const

  const emailById = new Map<string, string | null>()
  if (userIdList.length > 0) {
    await Promise.all(
      userIdList.map(async (userId) => {
        const { data, error } = await admin.auth.admin.getUserById(userId)
        if (!error && data?.user) {
          emailById.set(userId, data.user.email ?? null)
        } else {
          emailById.set(userId, null)
        }
      })
    )
  }

  if (profilesResult.error) {
    return { error: profilesResult.error.message as string, status: 400 as const }
  }

  const profileById = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile] as const)
  )

  const invitationByUserId = new Map<
    string,
    { id: string; email: string; role: TenantMembershipRole; invitedAt: string; acceptedAt: string | null }
  >()
  const pendingInvitations: TenantPendingInvitationRow[] = []

  for (const invitation of invitations) {
    const normalizedRole = normalizeMembershipRole(invitation.role)
    if (invitation.auth_user_id) {
      const existing = invitationByUserId.get(invitation.auth_user_id)
      if (!existing || new Date(invitation.invited_at).getTime() > new Date(existing.invitedAt).getTime()) {
        invitationByUserId.set(invitation.auth_user_id, {
          id: invitation.id,
          email: invitation.email,
          role: normalizedRole,
          invitedAt: invitation.invited_at,
          acceptedAt: invitation.accepted_at,
        })
      }
      continue
    }

    pendingInvitations.push({
      invitationId: invitation.id,
      email: invitation.email,
      role: normalizedRole,
      invitedAt: invitation.invited_at,
      acceptedAt: invitation.accepted_at,
    })
  }

  const usersById = new Map<string, TenantUserResponseRow>()

  for (const member of members) {
    const profileRaw = Array.isArray(member.user_profiles) ? member.user_profiles[0] : member.user_profiles
    const profile = profileById.get(member.user_id)
    const invite = invitationByUserId.get(member.user_id)
    const role = normalizeMembershipRole(member.role)
    const isOwner = ownerUserId === member.user_id
    usersById.set(member.user_id, {
      userId: member.user_id,
      membershipId: member.id,
      role,
      effectiveRole: isOwner ? 'owner' : role,
      isOwner,
      fullName: profile?.full_name ?? profileRaw?.full_name ?? null,
      phone: profile?.phone ?? profileRaw?.phone ?? null,
      email: emailById.get(member.user_id) ?? invite?.email ?? null,
      invitedAt: member.invited_at ?? invite?.invitedAt ?? null,
      acceptedAt: member.accepted_at ?? invite?.acceptedAt ?? null,
    })
  }

  if (ownerUserId && !usersById.has(ownerUserId)) {
    const ownerProfile = profileById.get(ownerUserId)
    const ownerInvite = invitationByUserId.get(ownerUserId)
    usersById.set(ownerUserId, {
      userId: ownerUserId,
      membershipId: null,
      role: 'ecd_admin',
      effectiveRole: 'owner',
      isOwner: true,
      fullName: ownerProfile?.full_name ?? null,
      phone: ownerProfile?.phone ?? null,
      email: emailById.get(ownerUserId) ?? ownerInvite?.email ?? null,
      invitedAt: ownerInvite?.invitedAt ?? null,
      acceptedAt: ownerInvite?.acceptedAt ?? null,
    })
  }

  const users = Array.from(usersById.values()).sort((left, right) => {
    if (left.isOwner && !right.isOwner) return -1
    if (!left.isOwner && right.isOwner) return 1
    const leftName = (left.fullName ?? left.email ?? '').toLowerCase()
    const rightName = (right.fullName ?? right.email ?? '').toLowerCase()
    return leftName.localeCompare(rightName)
  })

  pendingInvitations.sort(
    (left, right) => new Date(right.invitedAt).getTime() - new Date(left.invitedAt).getTime()
  )

  return {
    error: null,
    status: 200 as const,
    centre: {
      id: centreResult.data.id,
      name: centreResult.data.name,
      ownerUserId,
    },
    users,
    pendingInvitations,
  }
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const platformAdmin = await requirePlatformAdmin(request)
  if (!platformAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: centreId } = await context.params
  if (!centreId) return NextResponse.json({ error: 'Missing centre id' }, { status: 400 })

  const admin = createAdminClient()
  const result = await listTenantUsers(admin, centreId)
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    ok: true,
    centre: result.centre,
    users: result.users,
    pendingInvitations: result.pendingInvitations,
  })
}

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

  const { data: centreSnapshot, error: centreSnapshotError } = await admin
    .from('ecd_centres')
    .select('id,name,owner_id')
    .eq('id', centreId)
    .maybeSingle()
  if (centreSnapshotError) return NextResponse.json({ error: centreSnapshotError.message }, { status: 400 })
  if (!centreSnapshot) return NextResponse.json({ error: 'Centre not found' }, { status: 404 })

  if (payload.action === 'set_user_privileges') {
    const targetRole = payload.role === 'owner' ? 'ecd_admin' : payload.role

    const { data: profile, error: profileError } = await admin
      .from('user_profiles')
      .select('id,role')
      .eq('id', payload.userId)
      .maybeSingle()
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })
    if (!profile) return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    if (profile.role === 'platform_admin') {
      return NextResponse.json({ error: 'Platform admin accounts cannot be reassigned here.' }, { status: 409 })
    }

    if (centreSnapshot.owner_id === payload.userId && payload.role !== 'owner') {
      return NextResponse.json(
        { error: 'Transfer ownership first before demoting the current owner.' },
        { status: 409 }
      )
    }

    const nowIso = new Date().toISOString()

    const { error: profileUpdateError } = await admin
      .from('user_profiles')
      .update({
        role: normalizeUserRoleForProfile(targetRole),
        account_activation_required: false,
        activation_reason: null,
        activation_requested_at: null,
        activation_completed_at: nowIso,
      })
      .eq('id', payload.userId)
    if (profileUpdateError) return NextResponse.json({ error: profileUpdateError.message }, { status: 400 })

    const { error: membershipError } = await admin.from('ecd_admins').upsert(
      {
        ecd_id: centreId,
        user_id: payload.userId,
        role: normalizeMembershipRole(targetRole),
        invited_by: platformAdmin.userId,
        accepted_at: nowIso,
      },
      { onConflict: 'ecd_id,user_id' }
    )
    if (membershipError) return NextResponse.json({ error: membershipError.message }, { status: 400 })

    const { error: invitationRoleError } = await admin
      .from('ecd_admin_invitations')
      .update({
        role: normalizeMembershipRole(targetRole),
        accepted_at: nowIso,
      })
      .eq('ecd_id', centreId)
      .eq('auth_user_id', payload.userId)
      .is('accepted_at', null)
    if (invitationRoleError) return NextResponse.json({ error: invitationRoleError.message }, { status: 400 })

    if (payload.role === 'owner') {
      const { error: ownerError } = await admin
        .from('ecd_centres')
        .update({ owner_id: payload.userId })
        .eq('id', centreId)
      if (ownerError) return NextResponse.json({ error: ownerError.message }, { status: 400 })
    }

    await admin
      .from('user_role_transitions')
      .update({
        status: 'superseded',
        updated_at: nowIso,
      })
      .eq('user_id', payload.userId)
      .eq('status', 'pending')

    await writePlatformActivity(admin, {
      actorUserId: platformAdmin.userId,
      actorEmail: platformAdmin.email,
      entityType: 'tenant',
      entityId: centreId,
      action: 'set_tenant_user_privileges',
      summary: `Updated tenant user privileges (${payload.role})`,
      details: {
        userId: payload.userId,
        role: payload.role,
      },
    })

    const result = await listTenantUsers(admin, centreId)
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({
      ok: true,
      users: result.users,
      pendingInvitations: result.pendingInvitations,
      ownerUserId: result.centre?.ownerUserId ?? null,
    })
  }

  if (payload.action === 'remove_user') {
    const warnings: string[] = []

    // If this user is the owner, clear the owner_id from the centre first to allow ownerless state
    if (centreSnapshot.owner_id === payload.userId) {
      const { error: clearOwnerError } = await admin
        .from('ecd_centres')
        .update({ owner_id: null })
        .eq('id', centreId)
      if (clearOwnerError) {
        return NextResponse.json({ error: `Could not clear centre owner association (${clearOwnerError.message})` }, { status: 400 })
      }
    }

    const { count: ownedCentresCount, error: ownedCentresError } = await admin
      .from('ecd_centres')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', payload.userId)
    if (ownedCentresError) {
      return NextResponse.json({ error: ownedCentresError.message }, { status: 400 })
    }
    if ((ownedCentresCount ?? 0) > 0) {
      return NextResponse.json(
        { error: 'Cannot permanently remove a user who still owns other centres. Transfer ownership first.' },
        { status: 409 }
      )
    }

    const { data: profile, error: profileError } = await admin
      .from('user_profiles')
      .select('role,full_name')
      .eq('id', payload.userId)
      .maybeSingle()
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })
    if (profile?.role === 'platform_admin') {
      return NextResponse.json({ error: 'Platform admin accounts cannot be removed here.' }, { status: 409 })
    }

    const userEmail = await resolveUserEmail(admin, payload.userId, null)
    const warnings: string[] = []

    const revokeResult = await revokeUserSessionsByUserId(admin, payload.userId)
    if (!revokeResult.ok && revokeResult.warning) {
      warnings.push(revokeResult.warning)
    }

    const deleteUserResult = await admin.auth.admin.deleteUser(payload.userId)
    if (deleteUserResult.error) {
      return NextResponse.json({ error: deleteUserResult.error.message }, { status: 400 })
    }

    const { error: invitationDeleteByUserError } = await admin
      .from('ecd_admin_invitations')
      .delete()
      .eq('auth_user_id', payload.userId)
    if (invitationDeleteByUserError) {
      warnings.push(`Could not clear all tenant invitations by user (${invitationDeleteByUserError.message}).`)
    }

    if (userEmail) {
      const { error: invitationDeleteByEmailError } = await admin
        .from('ecd_admin_invitations')
        .delete()
        .eq('email', userEmail)
      if (invitationDeleteByEmailError) {
        warnings.push(`Could not clear all tenant invitations by email (${invitationDeleteByEmailError.message}).`)
      }
    }

    const { error: parentDeleteError } = await admin.from('parents').delete().eq('id', payload.userId)
    if (parentDeleteError) {
      warnings.push(`Could not clear parent record (${parentDeleteError.message}).`)
    }

    const { error: profileDeleteError } = await admin.from('user_profiles').delete().eq('id', payload.userId)
    if (profileDeleteError) {
      warnings.push(`Could not clear user profile (${profileDeleteError.message}).`)
    }

    const { error: membershipDeleteError } = await admin.from('ecd_admins').delete().eq('user_id', payload.userId)
    if (membershipDeleteError) {
      warnings.push(`Could not clear all ECD memberships (${membershipDeleteError.message}).`)
    }

    await writePlatformActivity(admin, {
      actorUserId: platformAdmin.userId,
      actorEmail: platformAdmin.email,
      entityType: 'tenant',
      entityId: centreId,
      action: 'delete_tenant_user_account',
      summary: 'Permanently deleted tenant user account',
      details: {
        userId: payload.userId,
        email: userEmail,
        role: profile?.role ?? 'unknown',
        fullName: profile?.full_name ?? null,
        warnings: warnings.length > 0 ? warnings : null,
      },
    })

    const result = await listTenantUsers(admin, centreId)
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({
      ok: true,
      users: result.users,
      pendingInvitations: result.pendingInvitations,
      ownerUserId: result.centre?.ownerUserId ?? null,
      warning: warnings.length > 0 ? warnings.join(' | ') : null,
    })
  }

  if (payload.action === 'downgrade_to_parent') {
    if (centreSnapshot.owner_id === payload.userId) {
      return NextResponse.json(
        { error: 'Cannot downgrade the current owner. Transfer ownership first.' },
        { status: 409 }
      )
    }

    const { count: ownedCentresCount, error: ownedCentresError } = await admin
      .from('ecd_centres')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', payload.userId)
    if (ownedCentresError) return NextResponse.json({ error: ownedCentresError.message }, { status: 400 })
    if ((ownedCentresCount ?? 0) > 0) {
      return NextResponse.json(
        { error: 'User is still an owner of one or more centres. Transfer ownership before downgrade.' },
        { status: 409 }
      )
    }

    const { data: profile, error: profileError } = await admin
      .from('user_profiles')
      .select('id,role,first_name,surname,full_name')
      .eq('id', payload.userId)
      .maybeSingle()
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })
    if (!profile) return NextResponse.json({ error: 'User profile not found.' }, { status: 404 })
    if (profile.role === 'platform_admin') {
      return NextResponse.json({ error: 'Platform admin accounts cannot be downgraded here.' }, { status: 409 })
    }

    const nowIso = new Date().toISOString()
    const activationReason =
      payload.reason?.trim() || `Access role changed by CentreConnect admin on ${new Date(nowIso).toLocaleString('en-ZA')}.`
    const roleBefore = profile.role ?? 'ecd_admin'
    const userEmail = await resolveUserEmail(admin, payload.userId, null)
    if (!userEmail) {
      return NextResponse.json({ error: 'Could not resolve user email for activation message.' }, { status: 400 })
    }

    const warnings: string[] = []

    // If this user was the owner, clear the owner_id from the centre to allow ownerless state
    if (centreSnapshot.owner_id === payload.userId) {
      const { error: clearOwnerError } = await admin
        .from('ecd_centres')
        .update({ owner_id: null })
        .eq('id', centreId)
      if (clearOwnerError) {
        warnings.push(`Could not clear centre owner association (${clearOwnerError.message}).`)
      }
    }

    const { error: membershipsDeleteError } = await admin.from('ecd_admins').delete().eq('user_id', payload.userId)
    if (membershipsDeleteError) {
      return NextResponse.json({ error: membershipsDeleteError.message }, { status: 400 })
    }

    const { error: invitationsDeleteByUserError } = await admin
      .from('ecd_admin_invitations')
      .delete()
      .eq('auth_user_id', payload.userId)
    if (invitationsDeleteByUserError) {
      return NextResponse.json({ error: invitationsDeleteByUserError.message }, { status: 400 })
    }

    const { error: invitationsDeleteByEmailError } = await admin
      .from('ecd_admin_invitations')
      .delete()
      .eq('email', userEmail)
    if (invitationsDeleteByEmailError) {
      warnings.push(`Could not clear all invitations by email (${invitationsDeleteByEmailError.message}).`)
    }

    const { error: parentUpsertError } = await admin.from('parents').upsert({ id: payload.userId }, { onConflict: 'id' })
    if (parentUpsertError) return NextResponse.json({ error: parentUpsertError.message }, { status: 400 })

    const { error: profileUpdateError } = await admin.from('user_profiles').upsert(
      {
        id: payload.userId,
        role: 'parent_user',
        first_name: profile.first_name ?? null,
        surname: profile.surname ?? null,
        full_name: profile.full_name ?? null,
        account_activation_required: true,
        activation_reason: activationReason,
        activation_requested_at: nowIso,
        activation_completed_at: null,
      },
      { onConflict: 'id' }
    )
    if (profileUpdateError) return NextResponse.json({ error: profileUpdateError.message }, { status: 400 })

    const { data: transition, error: transitionError } = await admin
      .from('user_role_transitions')
      .insert({
        user_id: payload.userId,
        from_role: roleBefore,
        to_role: 'parent_user',
        triggered_by: platformAdmin.userId,
        reason: activationReason,
        status: 'pending',
        metadata: {
          centre_id: centreId,
          centre_name: centreSnapshot.name,
          downgraded_by: platformAdmin.email,
        },
      })
      .select('id')
      .maybeSingle()
    if (transitionError) {
      warnings.push(`Transition log failed (${transitionError.message}).`)
    }

    const revokeResult = await revokeUserSessionsByUserId(admin, payload.userId)
    if (!revokeResult.ok && revokeResult.warning) {
      warnings.push(revokeResult.warning)
    }

    const activationLinkResult = await generateActivationLink(admin, userEmail)
    if (activationLinkResult.warning || !activationLinkResult.link) {
      warnings.push(activationLinkResult.warning || 'Activation link generation failed.')
    } else {
      const firstName = resolveFirstName({
        firstName: profile.first_name ?? null,
        fullName: profile.full_name ?? null,
        email: userEmail,
        fallback: 'Friend',
      })
      const loginLink = `${normalizeAppUrl()}/login`
      const template = renderRoleDowngradeActivationEmail({
        firstName,
        activationLink: activationLinkResult.link,
        loginLink,
        supportEmail: process.env.SUPPORT_EMAIL?.trim() || 'admin@centerconnect.co.za',
      })
      const emailResult = await queueEmail(userEmail, template.subject, template.html)
      if (!emailResult.success) {
        warnings.push(`Activation email failed (${emailResult.error || 'queue error'}).`)
      } else if (transition?.id) {
        const { error: transitionUpdateError } = await admin
          .from('user_role_transitions')
          .update({
            activation_link_sent_at: nowIso,
            updated_at: nowIso,
          })
          .eq('id', transition.id)
        if (transitionUpdateError) {
          warnings.push(`Transition update failed (${transitionUpdateError.message}).`)
        }
      }
    }

    await writePlatformActivity(admin, {
      actorUserId: platformAdmin.userId,
      actorEmail: platformAdmin.email,
      entityType: 'tenant',
      entityId: centreId,
      action: 'downgrade_tenant_user_to_parent',
      summary: 'Downgraded tenant user to parent_user with activation lock',
      details: {
        userId: payload.userId,
        email: userEmail,
        fromRole: roleBefore,
        toRole: 'parent_user',
        warnings: warnings.length > 0 ? warnings : null,
      },
    })

    const result = await listTenantUsers(admin, centreId)
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({
      ok: true,
      users: result.users,
      pendingInvitations: result.pendingInvitations,
      ownerUserId: result.centre?.ownerUserId ?? null,
      warning: warnings.length > 0 ? warnings.join(' | ') : null,
    })
  }

  const { error: invitationDeleteError } = await admin
    .from('ecd_admin_invitations')
    .delete()
    .eq('ecd_id', centreId)
    .eq('id', payload.invitationId)
  if (invitationDeleteError) return NextResponse.json({ error: invitationDeleteError.message }, { status: 400 })

  await writePlatformActivity(admin, {
    actorUserId: platformAdmin.userId,
    actorEmail: platformAdmin.email,
    entityType: 'tenant',
    entityId: centreId,
    action: 'remove_tenant_invitation',
    summary: 'Removed pending tenant invitation',
    details: {
      invitationId: payload.invitationId,
    },
  })

  const result = await listTenantUsers(admin, centreId)
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({
    ok: true,
    users: result.users,
    pendingInvitations: result.pendingInvitations,
    ownerUserId: result.centre?.ownerUserId ?? null,
  })
}
