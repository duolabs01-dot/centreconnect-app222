import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type AllowedRole = 'platform_admin' | 'ecd_admin' | 'ecd_staff' | 'parent_user'

function sanitizeRole(role: unknown): AllowedRole {
  if (role === 'platform_admin' || role === 'ecd_admin' || role === 'ecd_staff' || role === 'parent_user') {
    return role
  }
  return 'parent_user'
}

function fallbackName(email?: string | null) {
  const local = (email ?? '').split('@')[0]?.trim()
  if (!local) return 'New User'
  const clean = local.replace(/[._-]+/g, ' ').trim()
  return clean || 'New User'
}

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const desiredRole = sanitizeRole(user.user_metadata?.role)
    const fullName = user.user_metadata?.full_name ?? fallbackName(user.email)
    const phone = user.user_metadata?.phone ?? null

    const admin = createAdminClient()

    const { data: existingProfile } = await admin
      .from('user_profiles')
      .select('id,role')
      .eq('id', user.id)
      .maybeSingle()

    const roleToPersist = sanitizeRole(existingProfile?.role ?? desiredRole)

    const { error: profileError } = await admin.from('user_profiles').upsert(
      {
        id: user.id,
        role: roleToPersist,
        full_name: fullName,
        phone,
      },
      { onConflict: 'id' }
    )

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    if (roleToPersist === 'parent_user') {
      const { error: parentError } = await admin.from('parents').upsert(
        {
          id: user.id,
        },
        { onConflict: 'id' }
      )

      if (parentError) {
        return NextResponse.json({ error: parentError.message }, { status: 400 })
      }
    }

    if (roleToPersist === 'ecd_admin' || roleToPersist === 'ecd_staff') {
      const normalizedEmail = (user.email ?? '').trim().toLowerCase()
      const { data: memberships } = await admin
        .from('ecd_admins')
        .select('ecd_id')
        .eq('user_id', user.id)

      const ecdIds = (memberships ?? []).map((row) => row.ecd_id).filter(Boolean) as string[]
      if (ecdIds.length > 0) {
        const updatePayload = {
          auth_user_id: user.id,
          accepted_at: new Date().toISOString(),
        }

        if (normalizedEmail) {
          await admin
            .from('ecd_admin_invitations')
            .update(updatePayload)
            .in('ecd_id', ecdIds)
            .eq('email', normalizedEmail)
            .eq('role', roleToPersist)
            .is('accepted_at', null)
        }

        await admin
          .from('ecd_admin_invitations')
          .update(updatePayload)
          .in('ecd_id', ecdIds)
          .eq('auth_user_id', user.id)
          .eq('role', roleToPersist)
          .is('accepted_at', null)
      }
    }

    return NextResponse.json({ ok: true, role: roleToPersist })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
