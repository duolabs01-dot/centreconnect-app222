'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { sendEmail } from '@/lib/email/send'
import { randomBytes } from 'crypto'
import { requireSupabasePublicEnv } from '@/lib/supabase/env'

const schema = z.object({
  guardian_id: z.string().uuid(),
  child_id: z.string().uuid(),
  email: z.string().email('A valid email address is required'),
})

function getAppUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://centreconnect.co.za'
  return url.trim().replace(/\/+$/, '')
}

function buildInviteEmail({
  inviterName,
  childName,
  acceptUrl,
  expiresHours,
}: {
  inviterName: string
  childName: string
  acceptUrl: string
  expiresHours: number
}): { subject: string; html: string } {
  const subject = `${inviterName} invited you to co-manage ${childName}'s profile on CentreConnect`

  const html = `
    <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <div style="background: #0891b2; padding: 20px 24px; border-radius: 12px 12px 0 0;">
        <p style="color: white; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; margin: 0; text-transform: uppercase;">CentreConnect Family</p>
      </div>
      <div style="background: white; border: 1px solid #e2e8f0; border-top: none; padding: 32px 24px; border-radius: 0 0 12px 12px;">
        <h1 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 0 0 12px; line-height: 1.3;">
          You've been invited to co-manage ${childName}'s profile
        </h1>
        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 8px;">
          <strong>${inviterName}</strong> has invited you as a co-parent on CentreConnect.
        </p>
        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          Once you join, you'll be able to see ${childName}'s application status, daily reports, and centre updates — all in one place.
        </p>
        <a href="${acceptUrl}"
          style="display: inline-block; background: #0891b2; color: white; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 10px; text-decoration: none;">
          Accept invitation →
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0;">
          This link expires in ${expiresHours} hours. If you did not expect this, you can safely ignore it.
        </p>
      </div>
    </div>
  `

  return { subject, html }
}

export async function sendCoParentInviteAction(input: unknown): Promise<{
  success?: boolean
  inviteUrl?: string
  error?: string
}> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid data' }
  }

  const cookieStore = await cookies()
  const { supabaseUrl, supabaseAnonKey } = requireSupabasePublicEnv('send-coparent-invite-action')
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to send invites.' }

  // Verify this guardian belongs to a child owned by the current user
  const { data: guardian } = await supabase
    .from('guardians')
    .select('id, full_name, child_id, email, invite_token, linked_user_id, children(first_name, last_name)')
    .eq('id', parsed.data.guardian_id)
    .eq('child_id', parsed.data.child_id)
    .maybeSingle()

  if (!guardian) return { error: 'Guardian not found.' }
  if (guardian.linked_user_id) return { error: 'This person has already joined.' }

  // Verify child ownership
  const { data: child } = await supabase
    .from('children')
    .select('id, first_name, last_name, parent_id')
    .eq('id', parsed.data.child_id)
    .eq('parent_id', user.id)
    .maybeSingle()

  if (!child) return { error: 'Child not found.' }

  // Get inviter name
  const { data: inviterProfile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  const inviterName = inviterProfile?.full_name?.trim() || user.email?.split('@')[0] || 'Your co-parent'
  const childName = `${child.first_name} ${child.last_name}`.trim()

  // Generate a secure token (48 random hex chars = 192 bits)
  const token = randomBytes(24).toString('hex')
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() // 72 hours
  const expiresHours = 72

  // Save token to DB
  const { error: updateError } = await supabase
    .from('guardians')
    .update({
      email: parsed.data.email,
      invite_token: token,
      invite_token_expires_at: expiresAt,
      invite_sent_at: new Date().toISOString(),
    })
    .eq('id', guardian.id)

  if (updateError) return { error: 'Failed to generate invite. Please try again.' }

  const acceptUrl = `${getAppUrl()}/join?token=${token}`
  const { subject, html } = buildInviteEmail({ inviterName, childName, acceptUrl, expiresHours })

  // Send email (fire and forget — we still return the URL even if email fails)
  const emailResult = await sendEmail({ to: parsed.data.email, subject, html })

  return {
    success: true,
    inviteUrl: acceptUrl,
    // If email failed, we still show the link so they can share manually
    error: emailResult.success ? undefined : 'Email could not be sent — use the link below to share manually.',
  }
}
