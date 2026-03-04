import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { writePlatformActivity } from '@/lib/admin/activity-log'

type TenantMembershipRole = 'ecd_admin' | 'ecd_staff'
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
    role: z.enum(['owner', 'ecd_admin', 'ecd_staff']),
  }),
  z.object({
    action: z.literal('remove_user'),
    userId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('remove_invitation'),
    invitationId: z.string().uuid(),
  }),
])

function normalizeMembershipRole(value: string | null | undefined): TenantMembershipRole {
  return value === 'ecd_staff' ? 'ecd_staff' : 'ecd_admin'
}

function normalizeUserRoleForProfile(value: string | null | undefined): 'ecd_admin' | 'ecd_staff' {
  return value === 'ecd_staff' ? 'ecd_staff' : 'ecd_admin'
}

async function listTenantUsers(admin: ReturnType<typeof createAdminClient>, centreId: string) {
  const [centreResult, membersResult, invitationsResult] = await Promise.all([
    admin.from('ecd_centres').select('id,name,owner_id').eq('id', centreId).maybeSingle(),
    admin
      .from('ecd_admins')
      .select('id,user_id,role,invited_at,accepted_at,user_profiles(full_name,phone)')
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
  const [profilesResult, authUsersResult] = await Promise.all([
    userIdList.length > 0
      ? admin.from('user_profiles').select('id,full_name,phone').in('id', userIdList)
      : Promise.resolve({ data: [], error: null } as const),
    userIdList.length > 0
      ? admin.schema('auth').from('users').select('id,email').in('id', userIdList)
      : Promise.resolve({ data: [], error: null } as const),
  ])

  if (profilesResult.error) {
    return { error: profilesResult.error.message as string, status: 400 as const }
  }
  if (authUsersResult.error) {
    return { error: authUsersResult.error.message as string, status: 400 as const }
  }

  const profileById = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile] as const)
  )
  const emailById = new Map(
    (authUsersResult.data ?? []).map((authUser) => [authUser.id, authUser.email ?? null] as const)
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
      .update({ role: normalizeUserRoleForProfile(targetRole) })
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
    if (centreSnapshot.owner_id === payload.userId) {
      return NextResponse.json(
        { error: 'Cannot remove the current owner. Transfer ownership first.' },
        { status: 409 }
      )
    }

    const { error: memberDeleteError } = await admin
      .from('ecd_admins')
      .delete()
      .eq('ecd_id', centreId)
      .eq('user_id', payload.userId)
    if (memberDeleteError) return NextResponse.json({ error: memberDeleteError.message }, { status: 400 })

    const { error: invitationDeleteError } = await admin
      .from('ecd_admin_invitations')
      .delete()
      .eq('ecd_id', centreId)
      .eq('auth_user_id', payload.userId)
    if (invitationDeleteError) return NextResponse.json({ error: invitationDeleteError.message }, { status: 400 })

    const { count: remainingMemberships, error: remainingMembershipsError } = await admin
      .from('ecd_admins')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', payload.userId)
    if (remainingMembershipsError) {
      return NextResponse.json({ error: remainingMembershipsError.message }, { status: 400 })
    }
    if ((remainingMemberships ?? 0) === 0) {
      const { data: profile, error: profileError } = await admin
        .from('user_profiles')
        .select('role')
        .eq('id', payload.userId)
        .maybeSingle()
      if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })
      if (profile && (profile.role === 'ecd_admin' || profile.role === 'ecd_staff' || profile.role === 'ecd_supervisor')) {
        const { error: downgradeError } = await admin
          .from('user_profiles')
          .update({ role: 'parent_user' })
          .eq('id', payload.userId)
        if (downgradeError) return NextResponse.json({ error: downgradeError.message }, { status: 400 })
      }
    }

    await writePlatformActivity(admin, {
      actorUserId: platformAdmin.userId,
      actorEmail: platformAdmin.email,
      entityType: 'tenant',
      entityId: centreId,
      action: 'remove_tenant_user',
      summary: 'Removed tenant user access',
      details: {
        userId: payload.userId,
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
