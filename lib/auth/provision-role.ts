import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

export type AllowedRole = 'platform_admin' | 'ecd_admin' | 'ecd_staff' | 'ecd_supervisor' | 'parent_user'
export type EcdRole = 'ecd_admin' | 'ecd_staff' | 'ecd_supervisor'
export type ProvisionRoleSource = 'profile' | 'membership' | 'invitation' | 'metadata' | 'fallback'
export type ProvisionRoleSignals = {
  existingProfileRole?: unknown
  membershipRole?: unknown
  invitationRole?: unknown
  metadataRole?: unknown
}

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

export function resolveProvisionRoleFromSignals(signals: ProvisionRoleSignals): {
  role: AllowedRole
  source: ProvisionRoleSource
} {
  const roleFromExisting = parseRole(signals.existingProfileRole)
  if (roleFromExisting === 'platform_admin') {
    return { role: 'platform_admin', source: 'profile' }
  }

  if (roleFromExisting === 'ecd_admin' || roleFromExisting === 'ecd_staff' || roleFromExisting === 'ecd_supervisor') {
    return { role: roleFromExisting, source: 'profile' }
  }

  const roleFromMembership = parseEcdRole(signals.membershipRole)
  if (roleFromMembership) {
    return { role: roleFromMembership, source: 'membership' }
  }

  const roleFromInvitation = parseEcdRole(signals.invitationRole)
  if (roleFromInvitation) {
    return { role: roleFromInvitation, source: 'invitation' }
  }

  const roleFromMetadata = parseRole(signals.metadataRole)
  if (roleFromMetadata) {
    return { role: roleFromMetadata, source: 'metadata' }
  }

  return { role: 'parent_user', source: 'fallback' }
}

export async function resolveProvisionRole(
  input: ResolveProvisionRoleInput
): Promise<ResolveProvisionRoleResult> {
  const normalizedEmail = (input.email ?? '').trim().toLowerCase()
  const roleFromMetadata = parseRole(input.metadataRole)

  // 1. Fetch all necessary signals in parallel
  const [profileResult, membershipResult, inviteByAuthResult, inviteByEmailResult] = await Promise.all([
    // Profile check
    input.existingProfileRole 
      ? Promise.resolve({ data: { role: input.existingProfileRole } })
      : input.adminClient.from('user_profiles').select('role').eq('id', input.userId).maybeSingle(),
    
    // Memberships
    input.adminClient
      .from('ecd_admins')
      .select('ecd_id,role,invited_at')
      .eq('user_id', input.userId)
      .order('invited_at', { ascending: false })
      .limit(20),

    // Invitations by user ID
    input.adminClient
      .from('ecd_admin_invitations')
      .select('ecd_id,role,invited_at')
      .eq('auth_user_id', input.userId)
      .order('invited_at', { ascending: false })
      .limit(20),

    // Invitations by email
    normalizedEmail
      ? input.adminClient
          .from('ecd_admin_invitations')
          .select('ecd_id,role,invited_at')
          .eq('email', normalizedEmail)
          .order('invited_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] })
  ])

  const roleFromExisting = parseRole(profileResult.data?.role)
  
  const membershipRows = membershipResult.data ?? []
  const membershipRole =
    membershipRows
      .map((row) => parseEcdRole(row.role))
      .find((role): role is EcdRole => Boolean(role)) ?? null
  const membershipEcdIds = uniq(membershipRows.map((row) => row.ecd_id))

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

  const invitationRows = [...(inviteByAuthResult.data ?? []), ...(inviteByEmailResult.data ?? [])]
  const invitationRole =
    invitationRows
      .map((row) => parseEcdRole(row.role))
      .find((role): role is EcdRole => Boolean(role)) ?? null
  const invitationEcdIds = uniq(invitationRows.map((row) => row.ecd_id))

  const resolved = resolveProvisionRoleFromSignals({
    existingProfileRole: roleFromExisting,
    membershipRole,
    invitationRole,
    metadataRole: roleFromMetadata,
  })

  if (resolved.source === 'membership') {
    return {
      role: resolved.role,
      source: resolved.source,
      existingProfileRole: roleFromExisting,
      membershipRole,
      invitationRole,
      ecdIds: membershipEcdIds,
    }
  }
  if (resolved.source === 'invitation') {
    return {
      role: resolved.role,
      source: resolved.source,
      existingProfileRole: roleFromExisting,
      membershipRole,
      invitationRole,
      ecdIds: invitationEcdIds,
    }
  }

  return {
    role: resolved.role,
    source: resolved.source,
    existingProfileRole: roleFromExisting,
    membershipRole,
    invitationRole,
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
