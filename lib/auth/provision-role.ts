import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

export type AllowedRole = 'platform_admin' | 'ecd_admin' | 'ecd_staff' | 'ecd_supervisor' | 'parent_user'
export type EcdRole = 'ecd_admin' | 'ecd_staff' | 'ecd_supervisor'
export type ProvisionRoleSource = 'profile' | 'membership' | 'invitation' | 'metadata' | 'fallback'

type ResolveProvisionRoleInput = {
  adminClient: ReturnType<typeof createAdminClient>
  userId: string
  email?: string | null
  metadataRole?: unknown
  existingProfileRole?: unknown
}

type ResolveProvisionRoleResult = {
  role: AllowedRole
  source: ProvisionRoleSource
  existingProfileRole: AllowedRole | null
  membershipRole: EcdRole | null
  invitationRole: EcdRole | null
  ecdIds: string[]
}

function parseRole(value: unknown): AllowedRole | null {
  return value === 'platform_admin' ||
    value === 'ecd_admin' ||
    value === 'ecd_staff' ||
    value === 'ecd_supervisor' ||
    value === 'parent_user'
    ? value
    : null
}

function parseEcdRole(value: unknown): EcdRole | null {
  return value === 'ecd_admin' || value === 'ecd_staff' || value === 'ecd_supervisor' ? value : null
}

function uniq(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim()))))
}

export function sanitizeAllowedRole(value: unknown): AllowedRole {
  return parseRole(value) ?? 'parent_user'
}

export async function resolveProvisionRole(
  input: ResolveProvisionRoleInput
): Promise<ResolveProvisionRoleResult> {
  const normalizedEmail = (input.email ?? '').trim().toLowerCase()
  const roleFromMetadata = parseRole(input.metadataRole)
  const roleFromExisting =
    parseRole(input.existingProfileRole) ??
    (await (async () => {
      const { data } = await input.adminClient
        .from('user_profiles')
        .select('role')
        .eq('id', input.userId)
        .maybeSingle()
      return parseRole(data?.role)
    })())

  if (roleFromExisting === 'platform_admin') {
    return {
      role: 'platform_admin',
      source: 'profile',
      existingProfileRole: roleFromExisting,
      membershipRole: null,
      invitationRole: null,
      ecdIds: [],
    }
  }

  if (roleFromExisting === 'ecd_admin' || roleFromExisting === 'ecd_staff' || roleFromExisting === 'ecd_supervisor') {
    return {
      role: roleFromExisting,
      source: 'profile',
      existingProfileRole: roleFromExisting,
      membershipRole: roleFromExisting,
      invitationRole: null,
      ecdIds: [],
    }
  }

  const { data: membershipRows } = await input.adminClient
    .from('ecd_admins')
    .select('ecd_id,role,invited_at')
    .eq('user_id', input.userId)
    .order('invited_at', { ascending: false })
    .limit(20)

  const membershipRole =
    (membershipRows ?? [])
      .map((row) => parseEcdRole(row.role))
      .find((role): role is EcdRole => Boolean(role)) ?? null
  const membershipEcdIds = uniq((membershipRows ?? []).map((row) => row.ecd_id))

  if (membershipRole) {
    return {
      role: membershipRole,
      source: 'membership',
      existingProfileRole: roleFromExisting,
      membershipRole,
      invitationRole: null,
      ecdIds: membershipEcdIds,
    }
  }

  const { data: invitationByAuthUser } = await input.adminClient
    .from('ecd_admin_invitations')
    .select('ecd_id,role,invited_at')
    .eq('auth_user_id', input.userId)
    .order('invited_at', { ascending: false })
    .limit(20)

  const { data: invitationByEmail } = normalizedEmail
    ? await input.adminClient
        .from('ecd_admin_invitations')
        .select('ecd_id,role,invited_at')
        .eq('email', normalizedEmail)
        .order('invited_at', { ascending: false })
        .limit(20)
    : { data: [] as Array<{ ecd_id: string | null; role: string | null; invited_at: string | null }> }

  const invitationRows = [...(invitationByAuthUser ?? []), ...(invitationByEmail ?? [])]
  const invitationRole =
    invitationRows
      .map((row) => parseEcdRole(row.role))
      .find((role): role is EcdRole => Boolean(role)) ?? null
  const invitationEcdIds = uniq(invitationRows.map((row) => row.ecd_id))

  if (invitationRole) {
    return {
      role: invitationRole,
      source: 'invitation',
      existingProfileRole: roleFromExisting,
      membershipRole: null,
      invitationRole,
      ecdIds: invitationEcdIds,
    }
  }

  if (roleFromMetadata) {
    return {
      role: roleFromMetadata,
      source: 'metadata',
      existingProfileRole: roleFromExisting,
      membershipRole: null,
      invitationRole: null,
      ecdIds: [],
    }
  }

  return {
    role: 'parent_user',
    source: 'fallback',
    existingProfileRole: roleFromExisting,
    membershipRole: null,
    invitationRole: null,
    ecdIds: [],
  }
}

export async function syncAuthUserMetadataRole(input: {
  adminClient: ReturnType<typeof createAdminClient>
  userId: string
  role: AllowedRole
}) {
  const { data: userResult, error: fetchError } = await input.adminClient.auth.admin.getUserById(input.userId)
  if (fetchError) return { ok: false as const, error: fetchError.message }

  const currentMetadata = (userResult.user?.user_metadata ?? {}) as Record<string, unknown>
  if (currentMetadata.role === input.role) {
    return { ok: true as const, changed: false as const }
  }

  const { error: updateError } = await input.adminClient.auth.admin.updateUserById(input.userId, {
    user_metadata: {
      ...currentMetadata,
      role: input.role,
    },
  })
  if (updateError) return { ok: false as const, error: updateError.message }

  return { ok: true as const, changed: true as const }
}
