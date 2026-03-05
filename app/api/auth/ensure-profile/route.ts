import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { registerSession } from '@/lib/session-guard'
import { enqueueParentWelcomeSequence } from '@/lib/notifications/parent-welcome-sequence'
import { resolveProvisionRole, syncAuthUserMetadataRole } from '@/lib/auth/provision-role'

function fallbackName(email?: string | null) {
  const local = (email ?? '').split('@')[0]?.trim()
  if (!local) return 'New User'
  const clean = local.replace(/[._-]+/g, ' ').trim()
  return clean || 'New User'
}

function generateUsernameFromId(id: string) {
  return `user_${id.split('-')[0].toLowerCase()}`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.access_token) {
      const ip = request.ip || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
      const city = request.headers.get('x-vercel-ip-city')
      const country = request.headers.get('x-vercel-ip-country')
      const region = city && country ? `${city}, ${country}` : country || 'unknown'
      const ua = request.headers.get('user-agent') || 'unknown'

      await registerSession(
        user.id,
        session.access_token,
        ua.slice(0, 100),
        ip,
        region,
        ua
      )
    }

    const fullName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? fallbackName(user.email)
    const phone = user.user_metadata?.phone ?? null
    const username = user.user_metadata?.username ?? generateUsernameFromId(user.id)

    const admin = createAdminClient()

    // 1. Fetch existing profile to preserve role if already set
    const { data: existingProfile } = await admin
      .from('user_profiles')
      .select('id,role,username')
      .eq('id', user.id)
      .maybeSingle()

    const resolvedRole = await resolveProvisionRole({
      adminClient: admin,
      userId: user.id,
      email: user.email ?? null,
      metadataRole: user.user_metadata?.role,
      existingProfileRole: existingProfile?.role,
    })
    const roleToPersist = resolvedRole.role
    const usernameToPersist = existingProfile?.username ?? username

    // 2. Upsert user profile
    const { error: profileError } = await admin.from('user_profiles').upsert(
      {
        id: user.id,
        role: roleToPersist,
        full_name: fullName,
        phone,
        username: usernameToPersist,
      },
      { onConflict: 'id' }
    )

    if (profileError) {
      console.error('[ensure-profile] Profile upsert error:', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    const metadataSync = await syncAuthUserMetadataRole({
      adminClient: admin,
      userId: user.id,
      role: roleToPersist,
    })
    if (!metadataSync.ok) {
      console.warn('[ensure-profile] Failed to sync auth metadata role:', metadataSync.error)
    }

    // 3. Ensure record in parents table if role is parent_user
    if (roleToPersist === 'parent_user') {
      const { error: parentError } = await admin.from('parents').upsert(
        { id: user.id },
        { onConflict: 'id' }
      )

      if (parentError) {
        console.error('[ensure-profile] Parent upsert error:', parentError)
        return NextResponse.json({ error: parentError.message }, { status: 400 })
      }

      const welcomeResult = await enqueueParentWelcomeSequence(admin as any, {
        parentId: user.id,
        parentName: fullName,
      })
      if (!welcomeResult.ok) {
        console.error('[ensure-profile] Parent welcome sequence failed:', welcomeResult.error)
      }
    } else {
      const { error: parentDeleteError } = await admin.from('parents').delete().eq('id', user.id)
      if (parentDeleteError) {
        console.error('[ensure-profile] Parent record cleanup failed:', parentDeleteError)
      }
    }

    // 4. Handle invitations for ECD roles
    if (roleToPersist === 'ecd_admin' || roleToPersist === 'ecd_staff' || roleToPersist === 'ecd_supervisor') {
      const normalizedEmail = (user.email ?? '').trim().toLowerCase()
      const acceptedAt = new Date().toISOString()
      if (resolvedRole.ecdIds.length > 0) {
        const upsertRows = resolvedRole.ecdIds.map((ecdId) => ({
          ecd_id: ecdId,
          user_id: user.id,
          role: roleToPersist,
          accepted_at: acceptedAt,
        }))
        const { error: membershipEnsureError } = await admin
          .from('ecd_admins')
          .upsert(upsertRows, { onConflict: 'ecd_id,user_id' })
        if (membershipEnsureError) {
          console.error('[ensure-profile] Membership ensure error:', membershipEnsureError)
        }
      }

      const { data: memberships } = await admin
        .from('ecd_admins')
        .select('ecd_id')
        .eq('user_id', user.id)

      const ecdIds = (memberships ?? []).map((row) => row.ecd_id).filter(Boolean) as string[]
      
      if (ecdIds.length > 0) {
        await admin
          .from('ecd_admins')
          .update({ accepted_at: acceptedAt })
          .eq('user_id', user.id)
          .in('ecd_id', ecdIds)
          .is('accepted_at', null)

        if (roleToPersist === 'ecd_admin') {
          await admin
            .from('ecd_centres')
            .update({ owner_id: user.id })
            .in('id', ecdIds)
            .is('owner_id', null)
        }

        const updatePayload = {
          auth_user_id: user.id,
          accepted_at: acceptedAt,
        }

        if (normalizedEmail) {
          await admin
            .from('ecd_admin_invitations')
            .update(updatePayload)
            .in('ecd_id', ecdIds)
            .eq('email', normalizedEmail)
            .eq('role', roleToPersist)
            .is('accepted_at', null)

          await admin
            .from('notification_logs')
            .update({ status: 'claimed', updated_at: acceptedAt })
            .eq('event_type', 'admin_access_invite')
            .eq('recipient', normalizedEmail)
            .in('status', ['sent', 'opened'])
        }

        if (roleToPersist === 'ecd_admin') {
          await admin
            .from('notification_logs')
            .update({ status: 'claimed', updated_at: acceptedAt })
            .eq('event_type', 'owner_invite')
            .in('centre_id', ecdIds)
            .in('status', ['sent', 'opened'])
        }
      }
    }

    if (resolvedRole.source !== 'metadata') {
      console.info('[ensure-profile] Role resolved from non-metadata source', {
        userId: user.id,
        source: resolvedRole.source,
        role: roleToPersist,
      })
    }

    return NextResponse.json({ ok: true, role: roleToPersist, username: usernameToPersist })
  } catch (err: any) {
    console.error('[ensure-profile] Unexpected error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
