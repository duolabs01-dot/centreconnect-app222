import { NextResponse } from 'next/server'

import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { queueEmail } from '@/lib/communications/emails'
import { renderRoleDowngradeActivationEmail } from '@/lib/email/templates/role-downgrade-activation'
import {
  buildAuthCallbackRedirect,
  buildFirstPartyConfirmLink,
  sanitizeGeneratedAccessLinkWithDiagnostics,
} from '@/lib/auth/onboarding-links'
import { resolveFirstName } from '@/lib/utils/name'
import { writePlatformActivity } from '@/lib/admin/activity-log'

async function resolveUserEmail(admin: ReturnType<typeof createAdminClient>, userId: string, fallback?: string | null) {
  const direct = (fallback ?? '').trim().toLowerCase()
  if (direct) return direct
  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error) return null
  return data?.user?.email?.trim().toLowerCase() ?? null
}

async function generateActivationLink(admin: ReturnType<typeof createAdminClient>, email: string) {
  const nextPath = '/account/activate'
  const redirectTo = buildAuthCallbackRedirect(nextPath)
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

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const platformAdmin = await requirePlatformAdmin(request)
  if (!platformAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: userId } = await context.params
  if (!userId) return NextResponse.json({ error: 'Missing user id' }, { status: 400 })

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('user_profiles')
    .select('id,role,first_name,full_name,account_activation_required')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })
  if (!profile) return NextResponse.json({ error: 'User profile not found.' }, { status: 404 })
  if (!profile.account_activation_required) {
    return NextResponse.json({ error: 'User is already active.' }, { status: 409 })
  }

  const userEmail = await resolveUserEmail(admin, userId, null)
  if (!userEmail) return NextResponse.json({ error: 'Could not resolve user email.' }, { status: 400 })

  // Use inviteUserByEmail for a fresh, formal invitation if requested
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(userEmail, {
    redirectTo: buildAuthCallbackRedirect('/account/activate')
  })

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  const nowIso = new Date().toISOString()
  await admin
    .from('user_role_transitions')
    .update({
      activation_link_sent_at: nowIso,
      updated_at: nowIso,
    })
    .eq('user_id', userId)
    .eq('status', 'pending')

  await writePlatformActivity(admin, {
    actorUserId: platformAdmin.userId,
    actorEmail: platformAdmin.email,
    entityType: 'tenant',
    entityId: userId,
    action: 'resend_user_activation_link',
    summary: 'Resent account activation email',
    details: {
      userId,
      email: userEmail,
    },
  })

  return NextResponse.json({ ok: true })
}

