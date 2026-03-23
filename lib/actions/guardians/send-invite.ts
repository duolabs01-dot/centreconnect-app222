'use server'

import { randomBytes } from 'crypto'
import { z } from 'zod'
import { sendEmail } from '@/lib/email/send'
import { createClient } from '@/lib/supabase/server'
import {
  sendEcdInAppAndEmailNotification,
  sendParentInAppAndWhatsappNotification,
} from '@/lib/notifications/multi-channel'

const schema = z.object({
  guardian_id: z.string().uuid(),
  email: z
    .string()
    .email('A valid email address is required')
    .optional()
    .nullable(),
})

function getAppUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://centerconnect.co.za'
  return url.trim().replace(/\/+$/, '')
}

function normalizePhoneForWhatsapp(rawPhone: string | null | undefined) {
  if (!rawPhone) return null
  const digits = rawPhone.replace(/[^\d+]/g, '')
  const withoutPlus = digits.replace(/\+/g, '')
  if (!withoutPlus) return null
  if (withoutPlus.startsWith('0')) return `27${withoutPlus.slice(1)}`
  if (withoutPlus.startsWith('27')) return withoutPlus
  return withoutPlus
}

function toWhatsappShareUrl(message: string, phone?: string | null) {
  const digits = normalizePhoneForWhatsapp(phone)
  if (!digits) return `https://wa.me/?text=${encodeURIComponent(message)}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

function buildInviteEmail({
  inviterName,
  childLabel,
  acceptUrl,
  expiresHours,
}: {
  inviterName: string
  childLabel: string
  acceptUrl: string
  expiresHours: number
}): { subject: string; html: string } {
  const subject = `${inviterName} invited you to co-manage ${childLabel} on CentreConnect`

  const html = `
    <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <div style="background: #0891b2; padding: 20px 24px; border-radius: 12px 12px 0 0;">
        <p style="color: white; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; margin: 0; text-transform: uppercase;">CentreConnect Family</p>
      </div>
      <div style="background: white; border: 1px solid #e2e8f0; border-top: none; padding: 32px 24px; border-radius: 0 0 12px 12px;">
        <h1 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 0 0 12px; line-height: 1.3;">
          You've been invited to co-manage ${childLabel}
        </h1>
        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 8px;">
          <strong>${inviterName}</strong> has invited you as a co-parent on CentreConnect.
        </p>
        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          Once you join, you'll be able to see applications, daily reports, and centre updates for ${childLabel}.
        </p>
        <a href="${acceptUrl}"
          style="display: inline-block; background: #0891b2; color: white; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 10px; text-decoration: none;">
          Accept invitation ->
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0;">
          This link expires in ${expiresHours} hours. If you did not expect this, you can safely ignore it.
        </p>
      </div>
    </div>
  `

  return { subject, html }
}

type PendingGuardianRow = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  linked_user_id: string | null
  child_id: string
  children:
    | {
        first_name: string
        last_name: string
      }
    | Array<{
        first_name: string
        last_name: string
      }>
    | null
}

export async function sendCoParentInviteAction(input: unknown): Promise<{
  success?: boolean
  inviteUrl?: string
  whatsappShareUrl?: string
  shareText?: string
  childNames?: string[]
  error?: string
}> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid data' }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to send invites.' }

  const { data: guardian } = await supabase
    .from('guardians')
    .select('id, full_name, child_id, parent_id, email, phone, linked_user_id, children(first_name, last_name, parent_id)')
    .eq('id', parsed.data.guardian_id)
    .maybeSingle()

  if (!guardian) return { error: 'Guardian not found.' }
  const rawGuardianChild = guardian.children
  const guardianChild = Array.isArray(rawGuardianChild) ? rawGuardianChild[0] : rawGuardianChild
  if (!guardianChild || guardianChild.parent_id !== user.id || guardian.parent_id !== user.id) {
    return { error: 'Child not found.' }
  }
  if (guardian.linked_user_id) return { error: 'This person has already joined.' }

  const { data: inviterProfile } = await supabase
    .from('user_profiles')
    .select('full_name,phone')
    .eq('id', user.id)
    .maybeSingle()

  const inviterName = inviterProfile?.full_name?.trim() || user.email?.split('@')[0] || 'Your co-parent'
  const normalizedEmail = parsed.data.email?.trim().toLowerCase() || guardian.email?.trim().toLowerCase() || null
  const normalizedPhone = normalizePhoneForWhatsapp(guardian.phone) || guardian.phone?.trim() || null

  if (!normalizedEmail && !normalizedPhone) {
    return { error: 'Add an email or phone number before sending the invite.' }
  }

  const { data: pendingGuardians } = await supabase
    .from('guardians')
    .select('id,full_name,email,phone,linked_user_id,child_id,children(first_name,last_name)')
    .eq('parent_id', user.id)
    .is('linked_user_id', null)

  const inviteTargets = ((pendingGuardians ?? []) as PendingGuardianRow[]).filter((row: any) => {
    const rowEmail = row.email?.trim().toLowerCase() || null
    const rowPhone = normalizePhoneForWhatsapp(row.phone) || row.phone?.trim() || null
    if (normalizedEmail && rowEmail === normalizedEmail) return true
    if (normalizedPhone && rowPhone === normalizedPhone) return true
    return row.id === guardian.id
  })

  const uniqueTargets = Array.from(new Map(inviteTargets.map((row: any) => [row.id, row])).values())
  if (uniqueTargets.length === 0) {
    return { error: 'No matching pending co-parent records were found for this contact.' }
  }

  const token = randomBytes(24).toString('hex')
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
  const expiresHours = 72

  const inviteSentAt = new Date().toISOString()
  const targetIds = uniqueTargets.map((row: any) => row.id)
  const lifecycleAwareUpdate = await supabase
    .from('guardians')
    .update({
      email: normalizedEmail,
      invite_token: token,
      invite_token_expires_at: expiresAt,
      invite_sent_at: inviteSentAt,
      invite_accepted_at: null,
      invite_link_viewed_at: null,
      invite_link_clicked_at: null,
      invite_registered_at: null,
      invite_claimed_at: null,
    })
    .in('id', targetIds)

  if (lifecycleAwareUpdate.error) {
    const fallbackUpdate = await supabase
      .from('guardians')
      .update({
        email: normalizedEmail,
        invite_token: token,
        invite_token_expires_at: expiresAt,
        invite_sent_at: inviteSentAt,
        invite_accepted_at: null,
      })
      .in('id', targetIds)

    if (fallbackUpdate.error) {
      return { error: 'Failed to generate invite. Please try again.' }
    }
  }

  const acceptUrl = `${getAppUrl()}/join?token=${token}`
  const childNames = Array.from(
    new Set(
      uniqueTargets
        .map((row: any) => {
          const rawChild = row.children
          const child = Array.isArray(rawChild) ? rawChild[0] : rawChild
          if (!child) return null
          return `${child.first_name} ${child.last_name}`.trim()
        })
        .filter((name): name is string => Boolean(name))
    )
  )
  const childLabel = childNames.length <= 1 ? (childNames[0] ?? 'your child') : `${childNames.length} children`
  const { subject, html } = buildInviteEmail({ inviterName, childLabel, acceptUrl, expiresHours })

  const shareText = [
    `Hi! ${inviterName} invited you to co-manage ${childLabel} on CentreConnect.`,
    `Use this secure link to join: ${acceptUrl}`,
    `This invite expires in ${expiresHours} hours.`,
  ].join('\n')

  const emailResult = normalizedEmail
    ? await sendEmail({ to: normalizedEmail, subject, html })
    : { success: false as const }

  const childIds = Array.from(new Set(uniqueTargets.map((row: any) => row.child_id)))
  const { data: relatedApplications } = await supabase
    .from('applications')
    .select('id,child_id,ecd_id')
    .in('child_id', childIds)
    .order('submitted_at', { ascending: false })
    .limit(10)

  const primaryApplication = (relatedApplications ?? [])[0]
  if (primaryApplication?.ecd_id) {
    await sendParentInAppAndWhatsappNotification(supabase as any, {
      parent_id: user.id,
      ecd_id: primaryApplication.ecd_id,
      application_id: primaryApplication.id,
      template_key: 'co_parent_invite',
      title: 'Co-parent invite sent',
      message: `Invite sent for ${childLabel}. Share via WhatsApp if needed.`,
      parent_phone: inviterProfile?.phone ?? null,
      is_read: false,
    }).catch(() => {
      // Silently fail - notification is best-effort
    })

    const { data: centre } = await supabase
      .from('ecd_centres')
      .select('name,email')
      .eq('id', primaryApplication.ecd_id)
      .maybeSingle()
    const centreName = centre?.name ?? 'your centre'
    await sendEcdInAppAndEmailNotification(supabase as any, {
      ecd_id: primaryApplication.ecd_id,
      application_id: primaryApplication.id,
      title: 'Co-parent invite sent',
      message: `${inviterName} sent a co-parent invite for ${childLabel}.`,
      metadata: {
        kind: 'co_parent_invite',
        inviter_id: user.id,
        child_ids: childIds,
      },
      email_recipient: centre?.email ?? null,
      email_subject: `[CentreConnect] Co-parent invite sent`,
      email_body: `<p>${inviterName} sent a co-parent invite for <strong>${childLabel}</strong> at ${centreName}.</p>`,
      is_read: false,
    }).catch(() => {
      // Silently fail - notification is best-effort
    })
  }

  return {
    success: true,
    inviteUrl: acceptUrl,
    shareText,
    childNames,
    whatsappShareUrl: toWhatsappShareUrl(shareText, normalizedPhone),
    error:
      normalizedEmail && !emailResult.success
        ? 'Email could not be sent - use WhatsApp or copy link below.'
        : undefined,
  }
}
