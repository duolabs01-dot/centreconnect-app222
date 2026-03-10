import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  buildAuthCallbackRedirect,
  buildFirstPartyConfirmLink,
  sanitizeGeneratedAccessLink,
} from '@/lib/auth/onboarding-links'
import { createAdminClient } from '@/lib/supabase/admin'
import { deliverTransactionalEmail } from '@/lib/email/delivery'
import { normalizeAppUrl } from '@/lib/auth/onboarding-links'
import { renderParentSignupConfirmationEmail } from '@/lib/email/templates/parent-signup-confirmation'
import { sendPlatformAdminActionNotification } from '@/lib/email/platform-admin-action-notification'

const resendSchema = z.object({
  email: z.string().email(),
  nextPath: z.string().optional(),
})

function sanitizeNextPath(value: string | undefined) {
  if (!value) return '/parent/onboarding'
  if (!value.startsWith('/')) return '/parent/onboarding'
  if (value.startsWith('//')) return '/parent/onboarding'
  if (value.startsWith('/login') || value.startsWith('/register') || value.startsWith('/auth')) return '/parent/onboarding'
  return value
}

function fallbackFirstName(email: string, fullName?: string | null, firstName?: string | null) {
  const fromName = (firstName ?? '').trim() || (fullName ?? '').trim().split(/\s+/)[0] || ''
  if (fromName) return fromName
  return email.split('@')[0]?.replace(/[._-]+/g, ' ').trim() || 'there'
}

async function findUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  let page = 1
  const perPage = 200

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw new Error(error.message || 'Unable to look up auth users.')
    }

    const match = data.users.find((user) => user.email?.trim().toLowerCase() == email)
    if (match) return match
    if (data.users.length < perPage) break
    page += 1
  }

  return null
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null)
  const parsed = resendSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid resend payload', issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  const email = parsed.data.email.trim().toLowerCase()
  const safeNextPath = sanitizeNextPath(parsed.data.nextPath)
  const authUser = await findUserByEmail(admin, email)

  if (!authUser) {
    return NextResponse.json(
      { error: 'No pending parent account was found for this email. Please create the account again.' },
      { status: 404 }
    )
  }

  if (authUser.email_confirmed_at || authUser.confirmed_at) {
    return NextResponse.json(
      { error: 'This email address is already confirmed. Please sign in instead.' },
      { status: 409 }
    )
  }

  const redirectTo = buildAuthCallbackRedirect(safeNextPath)
  const linkResult = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo,
    },
  })

  if (linkResult.error) {
    return NextResponse.json(
      { error: linkResult.error.message || 'Unable to generate a fresh confirmation link right now.' },
      { status: 500 }
    )
  }

  const actionLink = linkResult.data?.properties?.action_link?.trim() ?? ''
  if (!actionLink) {
    return NextResponse.json({ error: 'Unable to generate a confirmation email link.' }, { status: 500 })
  }

  const confirmationLink =
    buildFirstPartyConfirmLink({
      hashedToken: linkResult.data?.properties?.hashed_token ?? null,
      verificationType: linkResult.data?.properties?.verification_type ?? 'magiclink',
      nextPath: safeNextPath,
    }) ??
    sanitizeGeneratedAccessLink({
      actionLink,
      fallbackRedirectTo: redirectTo,
    })

  const metadata = (authUser.user_metadata ?? {}) as Record<string, unknown>
  const firstName = fallbackFirstName(
    email,
    typeof metadata.full_name === 'string' ? metadata.full_name : null,
    typeof metadata.first_name === 'string' ? metadata.first_name : null
  )
  const appBaseUrl = normalizeAppUrl()
  const emailTemplate = renderParentSignupConfirmationEmail({
    recipientName: firstName,
    confirmationLink,
    loginLink: `${appBaseUrl}/login`,
    supportEmail: 'admin@centerconnect.co.za',
    appBaseUrl,
    logoUrl: `${appBaseUrl}/centreconnect-logo-email.png`,
  })

  const delivery = await deliverTransactionalEmail({
    to: email,
    subject: emailTemplate.subject,
    html: emailTemplate.html,
    text: emailTemplate.text,
    requireDirectDelivery: true,
  })

  if (!delivery.directSent) {
    return NextResponse.json(
      { error: `Unable to resend confirmation email. ${delivery.deliveryMessage}` },
      { status: 502 }
    )
  }

  void sendPlatformAdminActionNotification({
    subject: 'Parent confirmation resent',
    heading: `Parent confirmation email resent for ${email}.`,
    lines: [
      `Email: ${email}`,
      `Next path: ${safeNextPath}`,
      'Delivery: direct email sent',
    ],
    details: {
      source: 'parent_resend_confirmation',
      authUserId: authUser.id,
    },
  }).catch((error) => {
    console.error('[resend-parent-confirmation] founder notification failed:', error)
  })

  return NextResponse.json({ success: true })
}
