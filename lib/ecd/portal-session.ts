import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type EcdPortalRole = 'ecd_admin' | 'ecd_staff' | 'ecd_supervisor'

export type EcdPortalSession = {
  supabase: Awaited<ReturnType<typeof createClient>>
  user: {
    id: string
    email: string | null
  }
  role: EcdPortalRole
  ecdId: string
}

async function getLatestMembership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data: memberships } = await supabase
    .from('ecd_admins')
    .select('ecd_id')
    .eq('user_id', userId)
    .order('invited_at', { ascending: false })
    .limit(10)

  const membershipRows = (memberships ?? []).filter((row) => Boolean(row?.ecd_id))
  if (membershipRows.length === 0) return null

  const candidateIds = Array.from(new Set(membershipRows.map((row) => row.ecd_id)))
  const { data: visibleCentres } = await supabase.from('ecd_centres').select('id').in('id', candidateIds)
  const visibleSet = new Set((visibleCentres ?? []).map((centre) => centre.id))

  const validMembership = membershipRows.find((row) => visibleSet.has(row.ecd_id))
  if (validMembership?.ecd_id) return validMembership.ecd_id

  return null
}

async function tryRepairEcdMembership(input: {
  userId: string
  email: string | null
  role: EcdPortalRole
}): Promise<void> {
  const normalizedEmail = (input.email ?? '').trim().toLowerCase()
  try {
    const admin = createAdminClient()
    let ecdIdToLink: string | null = null
    let membershipRole: EcdPortalRole = input.role

    const { data: invitationByUserId } = await admin
      .from('ecd_admin_invitations')
      .select('ecd_id,role,invited_at')
      .eq('auth_user_id', input.userId)
      .order('invited_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: invitationByEmail } = normalizedEmail
      ? await admin
          .from('ecd_admin_invitations')
          .select('ecd_id,role,invited_at,auth_user_id,accepted_at')
          .eq('email', normalizedEmail)
          .order('invited_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null as null }

    const invitation = invitationByUserId ?? invitationByEmail
    if (invitation?.ecd_id) {
      ecdIdToLink = invitation.ecd_id
      if (invitation.role === 'ecd_admin' || invitation.role === 'ecd_staff' || invitation.role === 'ecd_supervisor') {
        membershipRole = invitation.role
      }
    }

    if (!ecdIdToLink && input.role === 'ecd_admin' && normalizedEmail) {
      const { data: centreByEmail } = await admin
        .from('ecd_centres')
        .select('id')
        .eq('email', normalizedEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      ecdIdToLink = centreByEmail?.id ?? null
    }

    if (!ecdIdToLink && input.role === 'ecd_admin') {
      const { data: centreByOwner } = await admin
        .from('ecd_centres')
        .select('id')
        .eq('owner_id', input.userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      ecdIdToLink = centreByOwner?.id ?? null
    }

    if (!ecdIdToLink) {
      return
    }

    await admin.from('ecd_admins').upsert(
      {
        ecd_id: ecdIdToLink,
        user_id: input.userId,
        role: membershipRole,
        accepted_at: new Date().toISOString(),
      },
      { onConflict: 'ecd_id,user_id' }
    )

    if (membershipRole === 'ecd_admin') {
      await admin
        .from('ecd_centres')
        .update({ owner_id: input.userId })
        .eq('id', ecdIdToLink)
        .is('owner_id', null)
    }

    if (invitationByEmail?.ecd_id === ecdIdToLink && !invitationByEmail.auth_user_id) {
      await admin
        .from('ecd_admin_invitations')
        .update({
          auth_user_id: input.userId,
          accepted_at: invitationByEmail.accepted_at ?? new Date().toISOString(),
        })
        .eq('ecd_id', ecdIdToLink)
        .eq('email', normalizedEmail)
    }
  } catch {
    // If admin fallback is unavailable, we keep normal auth flow without crashing.
  }
}

async function resolveEcdPortalSession(): Promise<EcdPortalSession | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = profile?.role
  if (!role || (role !== 'ecd_admin' && role !== 'ecd_staff' && role !== 'ecd_supervisor')) {
    return null
  }

  let ecdId = await getLatestMembership(supabase, user.id)
  if (!ecdId) {
    await tryRepairEcdMembership({
      userId: user.id,
      email: user.email ?? null,
      role,
    })
    ecdId = await getLatestMembership(supabase, user.id)
  }
  if (!ecdId) return null

  return {
    supabase,
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    role,
    ecdId,
  }
}

const getEcdPortalSessionCached = cache(resolveEcdPortalSession)

type SessionOptions = {
  cached?: boolean
}

export async function getEcdPortalSession(options: SessionOptions = {}): Promise<EcdPortalSession | null> {
  return options.cached === false ? await resolveEcdPortalSession() : await getEcdPortalSessionCached()
}

export async function requireEcdPortalSession(options: SessionOptions = {}): Promise<EcdPortalSession> {
  const session = await getEcdPortalSession(options)
  if (!session) {
    redirect('/ecd/login')
  }
  return session
}
