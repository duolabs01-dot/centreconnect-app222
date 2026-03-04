import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeInviteLog } from '@/lib/admin/invite-logs'

const inviteSchema = z.object({
  ecdId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['ecd_admin', 'ecd_staff']).default('ecd_admin'),
  fullName: z.string().min(2).max(160).optional(),
  redirectTo: z.string().url().optional(),
})

function fallbackFullName(email: string): string {
  const base = email.split('@')[0] || 'ECD Admin'
  return base.replace(/[._-]+/g, ' ').trim() || 'ECD Admin'
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

async function resolveExistingAuthUserId(adminClient: ReturnType<typeof createAdminClient>, email: string) {
  const directMatch = await findAuthUserIdByEmail(adminClient, email)
  if (directMatch) return directMatch

  const magicLinkResult = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  const fromMagicLink = magicLinkResult.data?.user?.id ?? null
  if (!magicLinkResult.error && fromMagicLink) return fromMagicLink

  const usersResult = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (!usersResult.error) {
    const match = usersResult.data.users.find(
      (user) => String(user.email ?? '').trim().toLowerCase() === email
    )
    if (match?.id) return match.id
  }

  return null
}

export async function POST(request: Request) {
  const platformAdmin = await requirePlatformAdmin(request)
  if (!platformAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const payload = await request.json().catch(() => null)
  const parsed = inviteSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const adminClient = createAdminClient()
  const data = parsed.data
  const normalizedEmail = data.email.trim().toLowerCase()

  const { data: centre, error: centreError } = await adminClient
    .from('ecd_centres')
    .select('id,name')
    .eq('id', data.ecdId)
    .maybeSingle()

  if (centreError) {
    return NextResponse.json({ error: centreError.message }, { status: 400 })
  }

  if (!centre) {
    return NextResponse.json({ error: 'ECD centre not found' }, { status: 404 })
  }

  const nowIso = new Date().toISOString()
  const redirectTo = data.redirectTo ?? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/login`
  const inviteResult = await adminClient.auth.admin.inviteUserByEmail(
    normalizedEmail,
    {
      redirectTo: redirectTo || undefined,
      data: {
        role: data.role,
        ecd_id: data.ecdId,
      },
    }
  )

  let invitedUserId = inviteResult.data.user?.id ?? null
  let linkedExistingUser = false
  let pendingLinkOnNextLogin = false

  if (inviteResult.error) {
    if (!isEmailAlreadyRegisteredError(inviteResult.error.message)) {
      return NextResponse.json({ error: inviteResult.error.message }, { status: 400 })
    }

    invitedUserId = await resolveExistingAuthUserId(adminClient, normalizedEmail)
    if (!invitedUserId) {
      pendingLinkOnNextLogin = true
    } else {
      linkedExistingUser = true
    }
  }

  const { data: existingProfile } = invitedUserId
    ? await adminClient
        .from('user_profiles')
        .select('id,role,full_name,phone')
        .eq('id', invitedUserId)
        .maybeSingle()
    : { data: null as { id: string; role: string | null; full_name?: string | null; phone?: string | null } | null }

  if (existingProfile?.role === 'platform_admin') {
    return NextResponse.json(
      { error: 'Platform admin accounts cannot be reassigned via staff invite flow.' },
      { status: 409 }
    )
  }

  const fullName =
    data.fullName?.trim() ||
    (typeof existingProfile?.full_name === 'string' ? existingProfile.full_name.trim() : '') ||
    fallbackFullName(normalizedEmail)
  const previousRole = typeof existingProfile?.role === 'string' ? existingProfile.role : null
  const parentAccessRevoked = previousRole === 'parent_user'

  if (invitedUserId) {
    const { error: profileError } = await adminClient.from('user_profiles').upsert(
      {
        id: invitedUserId,
        role: data.role,
        full_name: fullName,
        email: normalizedEmail,
        phone: existingProfile?.phone ?? null,
      },
      { onConflict: 'id' }
    )
    if (profileError) {
      return NextResponse.json({ error: `Failed to create profile: ${profileError.message}` }, { status: 500 })
    }

    const { error: adminLinkError } = await adminClient.from('ecd_admins').upsert(
      {
        ecd_id: data.ecdId,
        user_id: invitedUserId,
        role: data.role,
        invited_by: platformAdmin.userId,
        invited_at: nowIso,
        ...(linkedExistingUser ? { accepted_at: nowIso } : {}),
      },
      { onConflict: 'ecd_id,user_id' }
    )
    if (adminLinkError) {
      return NextResponse.json(
        { error: `Failed to link admin to centre: ${adminLinkError.message}` },
        { status: 500 }
      )
    }
  }

  const { error: invitationLogError } = await adminClient.from('ecd_admin_invitations').upsert(
    {
      ecd_id: data.ecdId,
      email: normalizedEmail,
      role: data.role,
      invited_by: platformAdmin.userId,
      auth_user_id: invitedUserId,
      invited_at: nowIso,
      ...(linkedExistingUser ? { accepted_at: nowIso } : {}),
    },
    { onConflict: 'ecd_id,email' }
  )
  if (invitationLogError) {
    return NextResponse.json(
      { error: `Failed to record invitation: ${invitationLogError.message}` },
      { status: 500 }
    )
  }

  await writeInviteLog(adminClient, {
    centreId: data.ecdId,
    ownerEmail: normalizedEmail,
    inviteType: 'email',
    status: linkedExistingUser ? 'claimed' : 'sent',
    notes: linkedExistingUser
      ? `Linked existing account to ECD access (${data.role})`
      : pendingLinkOnNextLogin
        ? `Existing email invite recorded (${data.role}); link will finalize on next login`
        : `ECD access invite (${data.role})`,
  })

  return NextResponse.json({
    invitedEmail: normalizedEmail,
    role: data.role,
    ecdId: data.ecdId,
    userId: invitedUserId,
    linkedExistingUser,
    pendingLinkOnNextLogin,
    previousRole,
    parentAccessRevoked,
  })
}
