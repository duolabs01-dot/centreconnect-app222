import { NextResponse } from 'next/server'

import { normalizeAppUrl } from '@/lib/auth/onboarding-links'
import { queueEmail } from '@/lib/communications/emails'
import { renderPasswordSetupConfirmedEmail } from '@/lib/email/templates/pilot-welcome-pack'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { resolveFirstName } from '@/lib/utils/name'

type ProfileRow = {
  role: string | null
  first_name: string | null
  full_name: string | null
  first_password_set_at?: string | null
}

type EcdMembershipRow = {
  ecd_centres:
    | {
        name: string | null
      }
    | Array<{
        name: string | null
      }>
    | null
}

function toRoleLabel(role: string | null | undefined) {
  switch (role) {
    case 'platform_admin':
      return 'Platform Admin'
    case 'ecd_admin':
      return 'ECD Admin'
    case 'ecd_staff':
      return 'ECD Staff'
    case 'ecd_supervisor':
      return 'ECD Supervisor'
    case 'parent_user':
    default:
      return 'Parent'
  }
}

function isEcdRole(role: string | null | undefined) {
  return role === 'ecd_admin' || role === 'ecd_staff' || role === 'ecd_supervisor'
}

function extractCentreName(value: EcdMembershipRow['ecd_centres']) {
  if (!value) return null
  if (Array.isArray(value)) {
    return value[0]?.name?.trim() || null
  }
  return value.name?.trim() || null
}

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const email = user.email?.trim().toLowerCase()
  if (!email) {
    return NextResponse.json({ success: false, error: 'Missing account email' }, { status: 400 })
  }

  const admin = createAdminClient()
  const profileResult = await admin
    .from('user_profiles')
    .select('role,first_name,full_name,first_password_set_at')
    .eq('id', user.id)
    .maybeSingle()

  const fallbackProfileResult = profileResult.error
    ? await admin
        .from('user_profiles')
        .select('role,first_name,full_name')
        .eq('id', user.id)
        .maybeSingle()
    : null

  const profile = (
    profileResult.error ? fallbackProfileResult?.data : profileResult.data
  ) as ProfileRow | null

  const role = profile?.role ?? 'parent_user'
  const loginLink = isEcdRole(role)
    ? `${normalizeAppUrl()}/ecd/login`
    : `${normalizeAppUrl()}/login`

  let centreName: string | null = null
  if (isEcdRole(role)) {
    const membershipResult = await admin
      .from('ecd_admins')
      .select('ecd_centres:ecd_id(name)')
      .eq('user_id', user.id)
      .limit(1)
    const membership = (membershipResult.data as EcdMembershipRow[] | null) ?? null

    const firstMembership = Array.isArray(membership) ? membership[0] : null
    centreName = extractCentreName(firstMembership?.ecd_centres ?? null)
  }

  const firstName = resolveFirstName({
    firstName: profile?.first_name ?? null,
    fullName: profile?.full_name ?? null,
    email,
    fallback: 'Friend',
  })

  const nowIso = new Date().toISOString()
  const canPersistFirstPassword = !profileResult.error
  const shouldMarkFirstPassword = canPersistFirstPassword && !profile?.first_password_set_at

  if (shouldMarkFirstPassword) {
    const updateResult = await admin
      .from('user_profiles')
      .update({ first_password_set_at: nowIso })
      .eq('id', user.id)

    if (updateResult.error) {
      const fallbackRole = profile?.role ?? (isEcdRole(role) ? role : 'parent_user')
      const fallbackName = profile?.full_name ?? firstName
      const fallbackInsert = await admin.from('user_profiles').insert({
        id: user.id,
        role: fallbackRole,
        first_name: profile?.first_name ?? firstName,
        full_name: fallbackName,
        email,
        first_password_set_at: nowIso,
      })
      if (fallbackInsert.error) {
        console.error(
          '[password-setup-confirmed] Unable to set first_password_set_at:',
          fallbackInsert.error.message
        )
      }
    }
  }

  const html = await renderPasswordSetupConfirmedEmail({
    contactName: firstName,
    loginLink,
    roleLabel: toRoleLabel(role),
    centreName,
  })

  const queueResult = await queueEmail(
    email,
    'Your CentreConnect password was changed',
    html
  )

  if (!queueResult.success) {
    return NextResponse.json(
      { success: false, error: queueResult.error ?? 'Failed to queue confirmation email' },
      { status: 502 }
    )
  }

  return NextResponse.json({
    success: true,
    firstPasswordMarked: shouldMarkFirstPassword,
  })
}
