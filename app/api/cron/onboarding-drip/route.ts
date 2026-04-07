import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deliverTransactionalEmail } from '@/lib/email/delivery'
import {
  renderDripDay1ResumeEmail,
  renderDripDay3Email,
  renderDripDay7Email,
  renderDripDay14FeaturesEmail,
} from '@/lib/email/templates/onboarding-drip'
import { normalizeAppUrl } from '@/lib/auth/onboarding-links'
import { upsertNotificationLog } from '@/lib/admin/notification-logs'

/**
 * POST /api/cron/onboarding-drip
 *
 * Daily cron job — runs once per day via Vercel Cron (see vercel.json).
 * Sends targeted nudge emails to ECD centres that have stalled in onboarding:
 *
 *   Day 3  — centre has 0 children added
 *   Day 7  — centre has not published their profile (no logo or no cover image)
 *   Day 2+ — welcome pack email was never opened (48h fallback)
 *
 * Protected by CRON_SECRET header — Vercel sets this automatically when configured.
 * To test manually: POST with Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const authHeader = request.headers.get('authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (token !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const admin = createAdminClient()
  const appUrl = normalizeAppUrl()
  const now = new Date()

  const results = {
    day1Sent: 0,
    day1Skipped: 0,
    day3Sent: 0,
    day3Skipped: 0,
    day7Sent: 0,
    day7Skipped: 0,
    day14Sent: 0,
    day14Skipped: 0,
    fallbackSent: 0,
    fallbackSkipped: 0,
    errors: [] as string[],
  }

  // -------------------------------------------------------------------
  // 1. Fetch all provisioned centres created in the last 30 days
  // -------------------------------------------------------------------
  const cutoff30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: centres, error: centresError } = await admin
    .from('ecd_centres')
    .select('id,name,slug,email,logo_url,cover_image_url,owner_id,created_at,onboarding_complete,onboarding_completed_at,is_deleted')
    .eq('is_deleted', false)
    .gte('created_at', cutoff30)
    .order('created_at', { ascending: true })

  if (centresError || !centres?.length) {
    return NextResponse.json({ ok: true, ...results, note: centresError?.message ?? 'No centres to process' })
  }

  // -------------------------------------------------------------------
  // 2. Fetch notification_logs to avoid re-sending already-sent drip emails
  // -------------------------------------------------------------------
  const centreIds = centres.map((c) => c.id)
  const { data: existingLogs } = await admin
    .from('notification_logs')
    .select('centre_id,event_type')
    .in('centre_id', centreIds)
    .in('event_type', ['onboarding_day1_resume', 'onboarding_day3', 'onboarding_day7', 'onboarding_day14_features', 'welcome_pack_fallback'])

  const sentMap = new Set<string>()
  for (const log of existingLogs ?? []) {
    sentMap.add(`${log.centre_id}:${log.event_type}`)
  }

  // -------------------------------------------------------------------
  // 3. Fetch children counts for all centres in one query
  // -------------------------------------------------------------------
  const { data: childrenRows } = await admin
    .from('children')
    .select('ecd_id')
    .in('ecd_id', centreIds)

  const childrenCountMap: Record<string, number> = {}
  for (const row of childrenRows ?? []) {
    childrenCountMap[row.ecd_id] = (childrenCountMap[row.ecd_id] ?? 0) + 1
  }

  // -------------------------------------------------------------------
  // 4. Fetch welcome_pack notification_logs (for fallback logic)
  // -------------------------------------------------------------------
  const { data: welcomeLogs } = await admin
    .from('notification_logs')
    .select('centre_id,created_at,status')
    .in('centre_id', centreIds)
    .eq('event_type', 'welcome_pack')
    .order('created_at', { ascending: false })

  const welcomeLogMap: Record<string, { sentAt: Date; status: string }> = {}
  for (const log of welcomeLogs ?? []) {
    if (!welcomeLogMap[log.centre_id]) {
      welcomeLogMap[log.centre_id] = {
        sentAt: new Date(log.created_at),
        status: log.status,
      }
    }
  }

  // -------------------------------------------------------------------
  // 5. Fetch owner emails (from user_profiles via owner_id)
  // -------------------------------------------------------------------
  const ownerIds = centres.map((c) => c.owner_id).filter(Boolean) as string[]
  const { data: profiles } = await admin
    .from('user_profiles')
    .select('id,full_name,first_name,email')
    .in('id', ownerIds)

  type ProfileRow = { id: string; full_name: string | null; first_name: string | null; email: string | null }
  const profileMap: Record<string, ProfileRow> = {}
  for (const p of (profiles ?? []) as ProfileRow[]) {
    profileMap[p.id] = p
  }

  // -------------------------------------------------------------------
  // 6. Fetch subscription tiers for all centres (for Day 14 tier-aware email)
  // -------------------------------------------------------------------
  const { data: subscriptionRows } = await admin
    .from('subscriptions')
    .select('ecd_id,tier')
    .in('ecd_id', centreIds)
    .in('status', ['trial', 'active'])
    .order('created_at', { ascending: false })

  const tierMap: Record<string, string> = {}
  for (const row of subscriptionRows ?? []) {
    if (!tierMap[row.ecd_id]) tierMap[row.ecd_id] = row.tier ?? 'basic'
  }

  // -------------------------------------------------------------------
  // 7. Process each centre
  // -------------------------------------------------------------------
  for (const centre of centres) {
    const ageMs = now.getTime() - new Date(centre.created_at).getTime()
    const ageDays = ageMs / (24 * 60 * 60 * 1000)

    const profile = centre.owner_id ? profileMap[centre.owner_id] : null
    const ownerEmail = profile?.email?.trim() ?? centre.email?.trim()
    if (!ownerEmail) continue

    const contactName =
      profile?.first_name?.trim() ||
      profile?.full_name?.trim().split(' ')[0] ||
      'there'

    // ---- Day 1 resume: onboarding not complete, 1–3 days old --------
    if (ageDays >= 1 && ageDays < 3 && !centre.onboarding_complete) {
      const key = `${centre.id}:onboarding_day1_resume`
      if (!sentMap.has(key)) {
        try {
          const html = renderDripDay1ResumeEmail({
            contactName,
            centreName: centre.name,
            onboardingLink: `${appUrl.replace(/\/$/, '')}/ecd/onboarding`,
            appUrl,
          })
          const result = await deliverTransactionalEmail({
            to: ownerEmail,
            subject: `${centre.name} \u2014 finish your setup (5 min)`,
            html,
          })
          await upsertNotificationLog(admin, {
            centreId: centre.id,
            eventKey: `onboarding_day1_resume:${centre.id}`,
            eventType: 'onboarding_day1_resume',
            channel: 'email',
            recipient: ownerEmail,
            status: result.status,
            provider: result.directSent ? result.directProvider ?? 'smtp' : 'email_queue',
            providerMessageId: result.directMessageId ?? result.queueMessageId,
            payload: { centreName: centre.name, ageDays: Math.round(ageDays) },
            errorMessage: result.status !== 'sent' ? result.deliveryMessage : null,
          })
          if (result.status === 'sent' || result.status === 'queued') {
            results.day1Sent++
            sentMap.add(key)
          } else {
            results.errors.push(`day1 ${centre.id}: ${result.deliveryMessage}`)
          }
        } catch (err) {
          results.errors.push(`day1 ${centre.id}: ${err instanceof Error ? err.message : String(err)}`)
        }
      } else {
        results.day1Skipped++
      }
    }

    // ---- Day 3 nudge: 0 children, 3–8 days old -----------------------
    if (ageDays >= 3 && ageDays < 8) {
      const key = `${centre.id}:onboarding_day3`
      const hasChildren = (childrenCountMap[centre.id] ?? 0) > 0
      if (!hasChildren && !sentMap.has(key)) {
        try {
          const html = renderDripDay3Email({
            contactName,
            centreName: centre.name,
            addChildrenLink: `${appUrl.replace(/\/$/, '')}/ecd/children/new`,
            appUrl,
          })
          const result = await deliverTransactionalEmail({
            to: ownerEmail,
            subject: `${centre.name} \u2014 have you added your children yet?`,
            html,
          })
          await upsertNotificationLog(admin, {
            centreId: centre.id,
            eventKey: `onboarding_day3:${centre.id}`,
            eventType: 'onboarding_day3',
            channel: 'email',
            recipient: ownerEmail,
            status: result.status,
            provider: result.directSent ? result.directProvider ?? 'smtp' : 'email_queue',
            providerMessageId: result.directMessageId ?? result.queueMessageId,
            payload: { centreName: centre.name, ageDays: Math.round(ageDays) },
            errorMessage: result.status !== 'sent' ? result.deliveryMessage : null,
          })
          if (result.status === 'sent' || result.status === 'queued') {
            results.day3Sent++
            sentMap.add(key)
          } else {
            results.errors.push(`day3 ${centre.id}: ${result.deliveryMessage}`)
          }
        } catch (err) {
          results.errors.push(`day3 ${centre.id}: ${err instanceof Error ? err.message : String(err)}`)
        }
      } else {
        results.day3Skipped++
      }
    }

    // ---- Day 7 nudge: no logo/cover, 7–14 days old -------------------
    if (ageDays >= 7 && ageDays < 14) {
      const key = `${centre.id}:onboarding_day7`
      const isProfileIncomplete = !centre.logo_url || !centre.cover_image_url
      if (isProfileIncomplete && !sentMap.has(key)) {
        try {
          const slug = centre.slug?.trim() ?? ''
          const html = renderDripDay7Email({
            contactName,
            centreName: centre.name,
            centreSlug: slug,
            websiteLink: `${appUrl.replace(/\/$/, '')}/ecd/website`,
            publicProfileLink: slug
              ? `${appUrl.replace(/\/$/, '')}/c/${slug}`
              : `${appUrl.replace(/\/$/, '')}/ecd/website`,
            appUrl,
          })
          const result = await deliverTransactionalEmail({
            to: ownerEmail,
            subject: `${centre.name} is live \u2014 share it with families`,
            html,
          })
          await upsertNotificationLog(admin, {
            centreId: centre.id,
            eventKey: `onboarding_day7:${centre.id}`,
            eventType: 'onboarding_day7',
            channel: 'email',
            recipient: ownerEmail,
            status: result.status,
            provider: result.directSent ? result.directProvider ?? 'smtp' : 'email_queue',
            providerMessageId: result.directMessageId ?? result.queueMessageId,
            payload: { centreName: centre.name, ageDays: Math.round(ageDays) },
            errorMessage: result.status !== 'sent' ? result.deliveryMessage : null,
          })
          if (result.status === 'sent' || result.status === 'queued') {
            results.day7Sent++
            sentMap.add(key)
          } else {
            results.errors.push(`day7 ${centre.id}: ${result.deliveryMessage}`)
          }
        } catch (err) {
          results.errors.push(`day7 ${centre.id}: ${err instanceof Error ? err.message : String(err)}`)
        }
      } else {
        results.day7Skipped++
      }
    }

    // ---- Day 14 features: 14–18 days after onboarding completed ------
    if (centre.onboarding_complete && centre.onboarding_completed_at) {
      const completionAgeMs = now.getTime() - new Date(centre.onboarding_completed_at).getTime()
      const completionAgeDays = completionAgeMs / (24 * 60 * 60 * 1000)
      if (completionAgeDays >= 14 && completionAgeDays < 18) {
        const key = `${centre.id}:onboarding_day14_features`
        if (!sentMap.has(key)) {
          try {
            const tier = (tierMap[centre.id] ?? 'basic') as import('@/lib/billing/plans').InternalTier
            const slug = centre.slug?.trim() ?? ''
            const html = renderDripDay14FeaturesEmail({
              contactName,
              centreName: centre.name,
              tier,
              publicProfileLink: slug
                ? `${appUrl.replace(/\/$/, '')}/c/${slug}`
                : `${appUrl.replace(/\/$/, '')}/ecd/website`,
              dashboardLink: `${appUrl.replace(/\/$/, '')}/ecd/dashboard`,
              billingLink: `${appUrl.replace(/\/$/, '')}/ecd/billing`,
              appUrl,
            })
            const result = await deliverTransactionalEmail({
              to: ownerEmail,
              subject: `2 weeks in \u2014 here\u2019s what\u2019s next for ${centre.name}`,
              html,
            })
            await upsertNotificationLog(admin, {
              centreId: centre.id,
              eventKey: `onboarding_day14_features:${centre.id}`,
              eventType: 'onboarding_day14_features',
              channel: 'email',
              recipient: ownerEmail,
              status: result.status,
              provider: result.directSent ? result.directProvider ?? 'smtp' : 'email_queue',
              providerMessageId: result.directMessageId ?? result.queueMessageId,
              payload: { centreName: centre.name, tier, completionAgeDays: Math.round(completionAgeDays) },
              errorMessage: result.status !== 'sent' ? result.deliveryMessage : null,
            })
            if (result.status === 'sent' || result.status === 'queued') {
              results.day14Sent++
              sentMap.add(key)
            } else {
              results.errors.push(`day14 ${centre.id}: ${result.deliveryMessage}`)
            }
          } catch (err) {
            results.errors.push(`day14 ${centre.id}: ${err instanceof Error ? err.message : String(err)}`)
          }
        } else {
          results.day14Skipped++
        }
      }
    }

    // ---- 48h fallback: welcome pack sent >48h ago, owner hasn\u2019t logged in ----
    {
      const key = `${centre.id}:welcome_pack_fallback`
      const welcomeLog = welcomeLogMap[centre.id]
      if (welcomeLog && !sentMap.has(key)) {
        const welcomeAgeMs = now.getTime() - welcomeLog.sentAt.getTime()
        const welcomeAgeHours = welcomeAgeMs / (60 * 60 * 1000)
        if (welcomeAgeHours >= 48 && welcomeAgeHours < 96) {
          // Check if owner has signed in since the welcome email was sent
          let ownerLoggedInSince = false
          if (centre.owner_id) {
            const { data: authUser } = await admin.auth.admin.getUserById(centre.owner_id)
            const lastSignIn = authUser?.user?.last_sign_in_at
            if (lastSignIn && new Date(lastSignIn) > welcomeLog.sentAt) {
              ownerLoggedInSince = true
            }
          }
          if (!ownerLoggedInSince) {
            try {
              const dashLink = `${appUrl.replace(/\/$/, '')}/ecd/dashboard`
              const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:40px auto;padding:20px;color:#334155;">
<h2 style="color:#0F172A;">Hi ${contactName} &mdash; did our welcome email reach you?</h2>
<p>We sent the CentreConnect welcome guide for <strong>${centre.name}</strong> a couple of days ago,
but it looks like you may not have had a chance to open it yet.</p>
<p>Here&rsquo;s a fresh link to get started:</p>
<p><a href="${dashLink}" style="display:inline-block;background:#0F766E;color:#fff;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:800;">Open my dashboard &rarr;</a></p>
<p style="color:#64748B;font-size:13px;">If the email landed in spam, please mark it as safe so you don&rsquo;t miss future updates from us.</p>
<p>Warm regards,<br><strong>Mandla</strong><br><span style="font-size:12px;color:#64748B;">Founder, CentreConnect</span></p>
</body></html>`
              const result = await deliverTransactionalEmail({
                to: ownerEmail,
                subject: `Did our welcome email reach you? \u2014 ${centre.name}`,
                html,
              })
              await upsertNotificationLog(admin, {
                centreId: centre.id,
                eventKey: `welcome_pack_fallback:${centre.id}`,
                eventType: 'welcome_pack_fallback',
                channel: 'email',
                recipient: ownerEmail,
                status: result.status,
                provider: result.directSent ? result.directProvider ?? 'smtp' : 'email_queue',
                providerMessageId: result.directMessageId ?? result.queueMessageId,
                payload: { centreName: centre.name, welcomeAgeHours: Math.round(welcomeAgeHours) },
                errorMessage: result.status !== 'sent' ? result.deliveryMessage : null,
              })
              if (result.status === 'sent' || result.status === 'queued') {
                results.fallbackSent++
                sentMap.add(key)
              } else {
                results.errors.push(`fallback ${centre.id}: ${result.deliveryMessage}`)
              }
            } catch (err) {
              results.errors.push(`fallback ${centre.id}: ${err instanceof Error ? err.message : String(err)}`)
            }
          } else {
            results.fallbackSkipped++
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true, ...results })
}

export async function GET(request: Request) {
  return POST(request)
}
