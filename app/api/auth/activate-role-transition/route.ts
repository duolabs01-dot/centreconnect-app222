import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type UserRole = 'platform_admin' | 'ecd_admin' | 'ecd_staff' | 'ecd_supervisor' | 'parent_user'

function toDashboardPath(role: UserRole | string | null | undefined) {
  if (role === 'platform_admin') return '/admin/command'
  if (role === 'ecd_admin' || role === 'ecd_staff' || role === 'ecd_supervisor') return '/ecd/dashboard'
  return '/parent/dashboard'
}

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('user_profiles')
    .select('role,account_activation_required')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json({ ok: false, error: profileError.message }, { status: 400 })
  }
  if (!profile) {
    return NextResponse.json({ ok: false, error: 'Profile not found.' }, { status: 404 })
  }

  const role = (profile.role as UserRole | null) ?? 'parent_user'
  if (!profile.account_activation_required) {
    return NextResponse.json({
      ok: true,
      alreadyActive: true,
      redirectTo: toDashboardPath(role),
    })
  }

  const nowIso = new Date().toISOString()

  const { error: profileUpdateError } = await admin
    .from('user_profiles')
    .update({
      account_activation_required: false,
      activation_reason: null,
      activation_requested_at: null,
      activation_completed_at: nowIso,
    })
    .eq('id', user.id)

  if (profileUpdateError) {
    return NextResponse.json({ ok: false, error: profileUpdateError.message }, { status: 400 })
  }

  await admin
    .from('user_role_transitions')
    .update({
      status: 'activated',
      activated_at: nowIso,
      updated_at: nowIso,
    })
    .eq('user_id', user.id)
    .eq('status', 'pending')

  return NextResponse.json({
    ok: true,
    redirectTo: toDashboardPath(role),
  })
}
