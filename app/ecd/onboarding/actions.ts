'use server'

import { redirect } from 'next/navigation'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { createAdminClient } from '@/lib/supabase/admin'
import { upsertNotificationLog } from '@/lib/admin/notification-logs'
import { deliverTransactionalEmail } from '@/lib/email/delivery'
import { renderDayZeroCelebrationEmail } from '@/lib/email/templates/onboarding-drip'
import { normalizeAppUrl } from '@/lib/auth/onboarding-links'

export async function completeOnboarding() {
  const { supabase, ecdId, user } = await requireEcdPortalSession({ cached: false })
  const now = new Date().toISOString()

  // 1. Mark complete + stamp completion timestamp
  await supabase
    .from('ecd_centres')
    .update({ onboarding_complete: true, onboarding_completed_at: now })
    .eq('id', ecdId)

  // 2. Fire-and-forget: send Day 0 celebration email (non-blocking)
  void sendCelebrationEmail(ecdId, user.email ?? '')

  redirect('/ecd/dashboard?celebrate=1')
}

async function sendCelebrationEmail(ecdId: string, fallbackEmail: string) {
  const admin = createAdminClient()
  const eventKey = `onboarding_day0_celebration:${ecdId}`

  // Idempotence: skip if already sent
  const { data: existing } = await admin
    .from('notification_logs')
    .select('id')
    .eq('event_key', eventKey)
    .maybeSingle()
  if (existing) return

  const { data: centre } = await admin
    .from('ecd_centres')
    .select('name, slug, owner_id')
    .eq('id', ecdId)
    .maybeSingle()
  if (!centre) return

  // Resolve owner email
  let ownerEmail = fallbackEmail
  if (centre.owner_id) {
    const { data: profile } = await admin
      .from('user_profiles')
      .select('email')
      .eq('id', centre.owner_id)
      .maybeSingle()
    if (profile?.email?.trim()) ownerEmail = profile.email.trim()
  }
  if (!ownerEmail) return

  const appUrl = normalizeAppUrl()
  const publicProfileLink = centre.slug
    ? `${appUrl}/c/${centre.slug}`
    : `${appUrl}/ecd/website`

  const html = renderDayZeroCelebrationEmail({
    centreName: centre.name ?? 'Your Cr\u00e8che',
    publicProfileLink,
    dashboardLink: `${appUrl}/ecd/dashboard`,
    appUrl,
  })

  const result = await deliverTransactionalEmail({
    to: ownerEmail,
    subject: `${centre.name ?? 'Your centre'} is now discoverable by families`,
    html,
  })

  await upsertNotificationLog(admin, {
    centreId: ecdId,
    eventKey,
    eventType: 'onboarding_day0_celebration',
    channel: 'email',
    recipient: ownerEmail,
    status: result.status === 'sent' || result.status === 'queued' ? result.status : 'failed',
    provider: result.directProvider ?? 'smtp',
    providerMessageId: result.directMessageId ?? result.queueMessageId,
    payload: { centreName: centre.name },
    errorMessage: result.status === 'failed' ? result.deliveryMessage : null,
  })
}
