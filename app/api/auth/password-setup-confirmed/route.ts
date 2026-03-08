import { NextResponse } from 'next/server'

import { normalizeAppUrl } from '@/lib/auth/onboarding-links'
import { deliverTransactionalEmail } from '@/lib/email/delivery'
import { sendPlatformAdminActionNotification } from '@/lib/email/platform-admin-action-notification'
import {
  renderPasswordSetupConfirmedEmail,
} from '@/lib/email/templates/pilot-welcome-pack'
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
  ecd_id: string
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

async function sendPasswordConfirmationEmail(input: {
  email: string
  firstName: string
  role: string | null
  centreName: string | null
}) {
  const loginLink = isEcdRole(input.role)
    ? `${normalizeAppUrl()}/ecd/login`
    : `${normalizeAppUrl()}/login`

  const html = await renderPasswordSetupConfirmedEmail({
    contactName: input.firstName,
    loginLink,
    roleLabel: toRoleLabel(input.role),
    centreName: input.centreName,
  })

  const subject = 'Your CentreConnect password was changed'
  const deliveryResult = await deliverTransactionalEmail({
    to: input.email,
    subject,
    html,
  })

  if (deliveryResult.status === 'sent') {
    return { sent: true as const, kind: 'password_confirmation' as const, warning: null as string | null }
  }

  return {
    sent: false as const,
    kind: 'password_confirmation' as const,
    warning: deliveryResult.deliveryMessage,
  }
}

async function sendEcdWelcomePackEmail(input: {
  ecdId: string
  email: string
}) {
  try {
    const response = await fetch(`${normalizeAppUrl()}/api/ecd/resend-welcome-pack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ecdId: input.ecdId,
        ownerEmail: input.email,
      }),
    })

    if (!response.ok) {
      const text = (await response.text().catch(() => '')).trim()
      return {
        sent: false as const,
        kind: 'welcome_pack' as const,
        warning: text || `Welcome guide email failed with status ${response.status}.`,
      }
    }

    return { sent: true as const, kind: 'welcome_pack' as const, warning: null as string | null }
  } catch (error) {
    return {
      sent: false as const,
      kind: 'welcome_pack' as const,
      warning: error instanceof Error ? error.message : 'Failed to send welcome guide email.',
    }
  }
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
  const firstName = resolveFirstName({
    firstName: profile?.first_name ?? null,
    fullName: profile?.full_name ?? null,
    email,
    fallback: 'Friend',
  })

  let centreName: string | null = null
  let ecdId: string | null = null

  if (isEcdRole(role)) {
    const membershipResult = await admin
      .from('ecd_admins')
      .select('ecd_id, ecd_centres:ecd_id(name)')
      .eq('user_id', user.id)
      .limit(1)

    const membership = (membershipResult.data as EcdMembershipRow[] | null) ?? null
    const firstMembership = Array.isArray(membership) ? membership[0] : null
    ecdId = firstMembership?.ecd_id ?? null
    centreName = extractCentreName(firstMembership?.ecd_centres ?? null)
  }

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

  let followUpEmail: 'welcome_pack' | 'password_confirmation' | 'none' = 'none'
  let emailWarning: string | null = null

  if (isEcdRole(role) && shouldMarkFirstPassword && ecdId) {
    const welcomePackResult = await sendEcdWelcomePackEmail({
      ecdId,
      email,
    })

    if (welcomePackResult.sent) {
      followUpEmail = 'welcome_pack'
    } else {
      emailWarning = welcomePackResult.warning
      const fallbackResult = await sendPasswordConfirmationEmail({
        email,
        firstName,
        role,
        centreName,
      })
      if (fallbackResult.sent) {
        followUpEmail = 'password_confirmation'
        emailWarning = emailWarning
          ? `${emailWarning} | Sent password confirmation instead.`
          : fallbackResult.warning
      } else if (fallbackResult.warning) {
        emailWarning = emailWarning
          ? `${emailWarning} | ${fallbackResult.warning}`
          : fallbackResult.warning
      }
    }
  } else {
    const confirmationResult = await sendPasswordConfirmationEmail({
      email,
      firstName,
      role,
      centreName,
    })
    if (confirmationResult.sent) {
      followUpEmail = 'password_confirmation'
      emailWarning = confirmationResult.warning
    } else if (confirmationResult.warning) {
      emailWarning = confirmationResult.warning
    }
  }

  if (isEcdRole(role) && shouldMarkFirstPassword) {
    void sendPlatformAdminActionNotification({
      subject: 'ECD owner set first password',
      heading: `${firstName} set a password for ${centreName ?? 'their centre'}.`,
      lines: [
        `Centre: ${centreName ?? 'Unknown centre'}`,
        `Email: ${email}`,
        `Follow-up: ${
          followUpEmail === 'welcome_pack'
            ? 'Welcome guide emailed'
            : followUpEmail === 'password_confirmation'
              ? 'Password confirmation emailed'
              : 'No follow-up email sent'
        }`,
      ],
      details: {
        role,
        userId: user.id,
        centreId: ecdId,
        followUpEmail,
        emailWarning: emailWarning ?? '-',
      },
    }).catch((error) => {
      console.error('[password-setup-confirmed] founder notification failed:', error)
    })
  }

  return NextResponse.json({
    success: true,
    role,
    firstPasswordMarked: shouldMarkFirstPassword,
    followUpEmail,
    emailWarning,
  })
}



