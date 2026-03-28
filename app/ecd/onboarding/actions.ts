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

  // 1. Mark complete + stamp timestamp
  await supabase
    .from('ecd_centres')
    .update({ onboarding_complete: true, onboarding_completed_at: now })
    .eq('id', ecdId)

  // 2. Fire-and-forget: send Day 0 celebration email (do not await — never blocks redirect)
  void sendCelebrationEmail(ecdId, user.email ?? '')

  redirect('/ecd/dashboard?celebrate=1')
}

async function sendCelebrationEmail(ecdId: string, ownerEmail: string) {
  if (!ownerEmail) return

  const admin = createAdminClient()
  const eventKey = `onboarding_day0_celebration:${ecdId}`

  // Idempotence check — never send twice
  const { data: existing } = await admin
    .from('notification_logs')
    .select('id')
    .eq('event_key', eventKey)
    .limit(1)
    .maybeSingle()

  if (existing) return

  const { data: centre } = await admin
    .from('ecd_centres')
    .select('name,slug,suburb')
    .eq('id', ecdId)
    .maybeSingle()

  const centreName = centre?.name ?? 'Your Cr\u00e8che'
  const slug = centre?.slug?.trim() ?? ''
  const appUrl = normalizeAppUrl()
  const publicProfileLink = slug ? `${appUrl}/c/${slug}` : `${appUrl}/ecd/website`
  const dashboardLink = `${appUrl}/ecd/dashboard`

  const html = renderDayZeroCelebrationEmail({
    contactName: 'there',
    centreName,
    publicProfileLink,
    dashboardLink,
    appUrl,
  })

  const result = await deliverTransactionalEmail({
    to: ownerEmail,
    subject: `${centreName} is now discoverable by families`,
    html,
  })

  await upsertNotificationLog(admin, {
    centreId: ecdId,
    eventKey,
    eventType: 'onboarding_day0_celebration',
    channel: 'email',
    recipient: ownerEmail,
    status: result.status,
    provider: result.directSent ? (result.directProvider ?? 'smtp') : 'email_queue',
    providerMessageId: result.directMessageId ?? result.queueMessageId,
    payload: { centreName, publicProfileLink },
    errorMessage: result.status !== 'sent' ? result.deliveryMessage : null,
  })
}
