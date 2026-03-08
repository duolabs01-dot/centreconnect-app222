import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  buildAuthCallbackRedirect,
  buildFirstPartyConfirmLink,
  normalizeAppUrl,
  sanitizeGeneratedAccessLink,
} from '@/lib/auth/onboarding-links'
import { queueEmail } from '@/lib/communications/emails'
import { sendEmail, shouldAttemptDirectEmailForRecipient } from '@/lib/email/send'
import { sendPlatformAdminActionNotification } from '@/lib/email/platform-admin-action-notification'
import { renderParentSignupConfirmationEmail } from '@/lib/email/templates/parent-signup-confirmation'
import { createAdminClient } from '@/lib/supabase/admin'

const TERMS_VERSION_MAX_LENGTH = 40

const registerParentSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(120),
  surname: z.string().max(120).optional().nullable(),
  fullName: z.string().min(1).max(160).optional(),
  phone: z.string().min(5).max(40),
  nextPath: z.string().optional(),
  termsVersion: z.string().min(1).max(TERMS_VERSION_MAX_LENGTH),
})

function sanitizeNextPath(value: string | undefined) {
  if (!value) return '/parent/onboarding'
  if (!value.startsWith('/')) return '/parent/onboarding'
  if (value.startsWith('//')) return '/parent/onboarding'
  if (value.startsWith('/login') || value.startsWith('/register') || value.startsWith('/auth')) return '/parent/onboarding'
  return value
}

function isAlreadyRegisteredError(message?: string | null) {
  const value = (message ?? '').toLowerCase()
  return value.includes('already been registered') || value.includes('already registered') || value.includes('already exists')
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null)
  const parsed = registerParentSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid registration payload', issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  const data = parsed.data
  const normalizedEmail = data.email.trim().toLowerCase()
  const firstName = data.firstName.trim()
  const surname = data.surname?.trim() || null
  const fullName =
    data.fullName?.trim() ||
    [firstName, surname].filter(Boolean).join(' ').trim() ||
    firstName
  const safeNextPath = sanitizeNextPath(data.nextPath)
  const redirectTo = buildAuthCallbackRedirect(safeNextPath)

  const signupResult = await admin.auth.admin.generateLink({
    type: 'signup',
    email: normalizedEmail,
    password: data.password,
    options: {
      redirectTo,
      data: {
        role: 'parent_user',
        first_name: firstName,
        surname,
        full_name: fullName,
        phone: data.phone.trim(),
        accepted_terms_at: new Date().toISOString(),
        terms_version: data.termsVersion,
      },
    },
  })

  if (signupResult.error) {
    if (isAlreadyRegisteredError(signupResult.error.message)) {
      return NextResponse.json({ error: 'An account with this email already exists. Please sign in.' }, { status: 409 })
    }
    return NextResponse.json(
      { error: signupResult.error.message || 'Unable to register account right now.' },
      { status: 500 }
    )
  }

  const actionLink = signupResult.data?.properties?.action_link?.trim() ?? ''
  if (!actionLink) {
    return NextResponse.json({ error: 'Unable to generate confirmation link.' }, { status: 500 })
  }

  const confirmationLink =
    buildFirstPartyConfirmLink({
      hashedToken: signupResult.data?.properties?.hashed_token ?? null,
      verificationType: signupResult.data?.properties?.verification_type ?? 'signup',
      nextPath: safeNextPath,
    }) ??
    sanitizeGeneratedAccessLink({
      actionLink,
      fallbackRedirectTo: redirectTo,
    })

  const appBaseUrl = normalizeAppUrl()
  const emailTemplate = renderParentSignupConfirmationEmail({
    recipientName: firstName,
    confirmationLink,
    loginLink: `${appBaseUrl}/login`,
    supportEmail: 'admin@centerconnect.co.za',
    appBaseUrl,
    logoUrl: `${appBaseUrl}/centreconnect-logo-email.png`,
  })

  let delivered = false
  let deliveryError: string | null = null

  const directEligibility = shouldAttemptDirectEmailForRecipient(normalizedEmail)
  if (directEligibility.allowed) {
    const directResult = await sendEmail({
      to: normalizedEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    })
    delivered = directResult.success
    if (!directResult.success) {
      deliveryError = directResult.error ?? 'SMTP delivery failed.'
    }
  } else if (directEligibility.reason) {
    deliveryError = directEligibility.reason
  }

  if (!delivered) {
    const queued = await queueEmail(normalizedEmail, emailTemplate.subject, emailTemplate.html)
    if (!queued.success) {
      const signupUserId = signupResult.data?.user?.id
      if (signupUserId) {
        await admin.auth.admin.deleteUser(signupUserId)
      }
      return NextResponse.json(
        {
          error: `Unable to send confirmation email. ${deliveryError ? `${deliveryError} | ` : ''}${queued.error ?? 'Queue unavailable.'}`,
        },
        { status: 502 }
      )
    }
  }

  void sendPlatformAdminActionNotification({
    subject: 'Parent signup started',
    heading: `${firstName} started parent signup.`,
    lines: [
      `Email: ${normalizedEmail}`,
      `Next path: ${safeNextPath}`,
      `Delivery: ${delivered ? 'direct email sent' : 'email queued'}`,
    ],
    details: {
      fullName,
      phone: data.phone.trim(),
      confirmationType: signupResult.data?.properties?.verification_type ?? 'signup',
      deliveryError: deliveryError ?? '-',
    },
  }).catch((error) => {
    console.error('[register-parent] founder notification failed:', error)
  })

  return NextResponse.json({
    success: true,
    requiresEmailConfirmation: true,
  })
}





