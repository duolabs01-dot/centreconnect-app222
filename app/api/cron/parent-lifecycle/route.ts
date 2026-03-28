import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deliverTransactionalEmail } from '@/lib/email/delivery'
import {
  renderParentNoChildDay1Email,
  renderParentChildNoEnrollmentDay3Email,
  renderParentPostEnrollmentFeedbackEmail,
} from '@/lib/email/templates/parent-lifecycle'
import { normalizeAppUrl } from '@/lib/auth/onboarding-links'
import { upsertNotificationLog } from '@/lib/admin/notification-logs'
import {
  hasEnrolledChildStatus,
  isEnrolledApplicationStatus,
  hasPendingParentApplicationStatus,
} from '@/lib/parent/home-state'

/**
 * POST /api/cron/parent-lifecycle
 *
 * Daily cron job — runs once per day via Vercel Cron at 08:00 SAST (see vercel.json).
 * Sends targeted lifecycle emails to parents based on their current state:
 *
 *   Day 1  — parent registered but has no child added yet
 *   Day 3  — parent has a child but no enrollment (state-aware: pending vs discover)
 *   Day 7  — post-enrollment feedback email (real child name + centre name)
 *
 * Protected by CRON_SECRET header — Vercel sets this automatically when configured.
 * To test manually: POST with Authorization: Bearer <CRON_SECRET>
 * All emails are idempotent via notification_logs event_key uniqueness.
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
  const DAY_MS = 24 * 60 * 60 * 1000

  const results = {
    noChildDay1Sent: 0,
    noChildDay1Skipped: 0,
    childNoEnrollmentDay3Sent: 0,
    childNoEnrollmentDay3Skipped: 0,
    postEnrollmentFeedbackSent: 0,
    postEnrollmentFeedbackSkipped: 0,
    errors: [] as string[],
  }

  // -------------------------------------------------------------------
  // Step 1: Fetch parents registered in the last 90 days
  // Branch 1 fires ~day 1–3 after signup, but Branch 2 fires 3–7 days after the
  // parent *added their first child* (which may happen weeks after signup), and
  // Branch 3 fires 7–21 days after *enrollment* — so we need a generous window.
  // -------------------------------------------------------------------
  const cutoff90 = new Date(now.getTime() - 90 * DAY_MS).toISOString()
  const { data: parents } = await admin
    .from('user_profiles')
    .select('id,full_name,email,created_at')
    .eq('role', 'parent_user')
    .gte('created_at', cutoff90)
    .not('email', 'is', null)
    .order('created_at', { ascending: true })

  if (!parents?.length) {
    return NextResponse.json({ ok: true, ...results, note: 'No parents to process' })
  }

  // -------------------------------------------------------------------
  // Step 2: Fetch existing notification logs for idempotence
  // -------------------------------------------------------------------
  const parentIds = parents.map((p: any) => p.id as string)
  const { data: existingLogs } = await admin
    .from('notification_logs')
    .select('event_key')
    .in('event_type', [
      'parent_no_child_day1',
      'parent_child_no_enrollment_day3',
      'parent_post_enrollment_feedback_day7',
    ])

  const sentKeys = new Set((existingLogs ?? []).map((l: any) => l.event_key as string))

  // -------------------------------------------------------------------
  // Step 3: Bulk fetch children for all parents
  // ecd_id lets us fall back to the child record when there is no enrolled application.
  // created_at lets us anchor Branch 2 to when the child was added, not account age.
  // -------------------------------------------------------------------
  const { data: allChildren } = await admin
    .from('children')
    .select('id,parent_id,ecd_id,first_name,enrollment_status,created_at')
    .in('parent_id', parentIds)

  // -------------------------------------------------------------------
  // Step 4: Bulk fetch applications for all parents
  // updated_at lets us anchor Branch 3 to when enrollment happened, not account age.
  // -------------------------------------------------------------------
  const { data: allApplications } = await admin
    .from('applications')
    .select('id,parent_id,ecd_id,status,updated_at')
    .in('parent_id', parentIds)

  // -------------------------------------------------------------------
  // Step 5: Fetch centre names for enrolled applications + enrolled child records
  // Build the lookup from both sources so we handle the case where the child
  // record shows enrolled but no matching application row exists.
  // -------------------------------------------------------------------
  const enrolledEcdIdsFromApps = (allApplications ?? [])
    .filter((a: any) => isEnrolledApplicationStatus(a.status))
    .map((a: any) => a.ecd_id as string)
    .filter(Boolean)

  const enrolledEcdIdsFromChildren = (allChildren ?? [])
    .filter((c: any) => hasEnrolledChildStatus(c.enrollment_status) && c.ecd_id)
    .map((c: any) => c.ecd_id as string)

  const enrolledEcdIds = [...new Set([...enrolledEcdIdsFromApps, ...enrolledEcdIdsFromChildren])]

  const centreNameMap: Record<string, string> = {}
  if (enrolledEcdIds.length > 0) {
    const { data: centreRows } = await admin.from('ecd_centres').select('id,name').in('id', enrolledEcdIds)
    for (const row of centreRows ?? []) {
      centreNameMap[(row as any).id] = (row as any).name ?? 'your cr\u00e8che'
    }
  }

  // -------------------------------------------------------------------
  // Step 6: Group by parent_id
  // -------------------------------------------------------------------
  const childrenByParent: Record<string, typeof allChildren> = {}
  for (const child of allChildren ?? []) {
    if (!childrenByParent[(child as any).parent_id]) childrenByParent[(child as any).parent_id] = []
    childrenByParent[(child as any).parent_id]!.push(child)
  }

  const applicationsByParent: Record<string, typeof allApplications> = {}
  for (const app of allApplications ?? []) {
    if (!applicationsByParent[(app as any).parent_id]) applicationsByParent[(app as any).parent_id] = []
    applicationsByParent[(app as any).parent_id]!.push(app)
  }

  // -------------------------------------------------------------------
  // Step 7: Per-parent processing loop
  // -------------------------------------------------------------------
  for (const parent of parents) {
    const email = (parent as any).email?.trim()
    if (!email) continue

    const fullName: string | null = (parent as any).full_name ?? null
    const contactName = fullName?.trim().split(' ')[0] || 'there'
    const ageDays = (now.getTime() - new Date((parent as any).created_at).getTime()) / DAY_MS

    const parentChildren = childrenByParent[(parent as any).id] ?? []
    const parentApplications = applicationsByParent[(parent as any).id] ?? []
    const childrenCount = parentChildren.length

    const hasEnrolledChild =
      (parentChildren as any[]).some((c) => hasEnrolledChildStatus(c.enrollment_status)) ||
      (parentApplications as any[]).some((a) => isEnrolledApplicationStatus(a.status))

    const hasPendingApplications = (parentApplications as any[]).some((a) =>
      hasPendingParentApplicationStatus(a.status)
    )

    // ---- Branch 1: No child yet — Day 1 ----------------------------------
    if (ageDays >= 1 && ageDays < 3 && childrenCount === 0 && !hasEnrolledChild) {
      const eventKey = `parent_no_child_day1:${(parent as any).id}`
      if (!sentKeys.has(eventKey)) {
        try {
          const html = renderParentNoChildDay1Email({ contactName, appUrl })
          const result = await deliverTransactionalEmail({
            to: email,
            subject: 'Add your child to get started \u2014 CentreConnect',
            html,
          })
          await upsertNotificationLog(admin, {
            centreId: null,
            eventKey,
            eventType: 'parent_no_child_day1',
            channel: 'email',
            recipient: email,
            status: result.status,
            provider: result.directSent ? result.directProvider ?? 'smtp' : 'email_queue',
            providerMessageId: result.directMessageId ?? result.queueMessageId,
            payload: { ageDays: Math.round(ageDays) },
            errorMessage: result.status !== 'sent' ? result.deliveryMessage : null,
          })
          if (result.status === 'sent' || result.status === 'queued') {
            results.noChildDay1Sent++
            sentKeys.add(eventKey)
          } else {
            results.errors.push(`noChildDay1 ${(parent as any).id}: ${result.deliveryMessage}`)
          }
        } catch (err) {
          results.errors.push(
            `noChildDay1 ${(parent as any).id}: ${err instanceof Error ? err.message : String(err)}`
          )
        }
      } else {
        results.noChildDay1Skipped++
      }
    }

    // ---- Branch 2: Has child, not enrolled — 3–7 days since first child added ----
    // Anchored to when the parent first added a child, NOT account age.
    // This fires even if the parent signed up weeks ago but only just added a child.
    const firstChildCreatedAt = (parentChildren as any[])
      .map((c) => new Date((c as any).created_at).getTime())
      .filter((t) => !Number.isNaN(t))
      .sort((a, b) => a - b)[0]
    const firstChildAgeDays =
      firstChildCreatedAt != null ? (now.getTime() - firstChildCreatedAt) / DAY_MS : null

    if (
      firstChildAgeDays != null &&
      firstChildAgeDays >= 3 &&
      firstChildAgeDays < 7 &&
      childrenCount > 0 &&
      !hasEnrolledChild
    ) {
      const state: 'pending' | 'discover' = hasPendingApplications ? 'pending' : 'discover'
      const eventKey = `parent_child_no_enrollment_day3:${(parent as any).id}`
      if (!sentKeys.has(eventKey)) {
        try {
          const html = renderParentChildNoEnrollmentDay3Email({ contactName, state, appUrl })
          const subject =
            state === 'pending'
              ? 'Your cr\u00e8che applications \u2014 latest status'
              : 'Find the right cr\u00e8che for your child \u2014 CentreConnect'
          const result = await deliverTransactionalEmail({ to: email, subject, html })
          await upsertNotificationLog(admin, {
            centreId: null,
            eventKey,
            eventType: 'parent_child_no_enrollment_day3',
            channel: 'email',
            recipient: email,
            status: result.status,
            provider: result.directSent ? result.directProvider ?? 'smtp' : 'email_queue',
            providerMessageId: result.directMessageId ?? result.queueMessageId,
            payload: { ageDays: Math.round(ageDays), state },
            errorMessage: result.status !== 'sent' ? result.deliveryMessage : null,
          })
          if (result.status === 'sent' || result.status === 'queued') {
            results.childNoEnrollmentDay3Sent++
            sentKeys.add(eventKey)
          } else {
            results.errors.push(
              `childNoEnrollmentDay3 ${(parent as any).id}: ${result.deliveryMessage}`
            )
          }
        } catch (err) {
          results.errors.push(
            `childNoEnrollmentDay3 ${(parent as any).id}: ${err instanceof Error ? err.message : String(err)}`
          )
        }
      } else {
        results.childNoEnrollmentDay3Skipped++
      }
    }

    // ---- Branch 3: Post-enrollment feedback — 7–21 days since enrollment --------
    // Anchored to when enrollment happened (application.updated_at when status →
    // enrolled), NOT account age. Falls back to child record's ecd_id when no
    // enrolled application row exists.
    if (hasEnrolledChild) {
      const enrolledApp = (parentApplications as any[])
        .filter((a) => isEnrolledApplicationStatus(a.status) && a.updated_at)
        .sort((a, b) => new Date((b as any).updated_at).getTime() - new Date((a as any).updated_at).getTime())[0]

      const enrolledChild = (parentChildren as any[]).find((c) =>
        hasEnrolledChildStatus(c.enrollment_status)
      )

      const enrollmentTs = enrolledApp?.updated_at
        ? new Date(enrolledApp.updated_at).getTime()
        : null
      const enrollmentAgeDays = enrollmentTs != null ? (now.getTime() - enrollmentTs) / DAY_MS : null

      // Only fire in the 7–21 day window after enrollment; skip if we can't determine timing
      if (enrollmentAgeDays == null || enrollmentAgeDays < 7 || enrollmentAgeDays >= 21) {
        results.postEnrollmentFeedbackSkipped++
        continue
      }

      // Resolve centre: prefer enrolled application ecd_id, fall back to child.ecd_id
      const centreId: string | null = enrolledApp?.ecd_id ?? enrolledChild?.ecd_id ?? null
      const childName: string = enrolledChild?.first_name ?? 'your child'
      const centreName: string = centreId ? (centreNameMap[centreId] ?? 'their cr\u00e8che') : 'their cr\u00e8che'
      const dashboardLink = `${appUrl.replace(/\/$/, '')}/parent/dashboard`

      const eventKey = `parent_post_enrollment_feedback_day7:${(parent as any).id}:${enrolledChild?.id ?? 'nochild'}:${centreId ?? 'nocentre'}`
      if (!sentKeys.has(eventKey)) {
        try {
          const html = renderParentPostEnrollmentFeedbackEmail({
            contactName,
            childName,
            centreName,
            dashboardLink,
            appUrl,
          })
          const result = await deliverTransactionalEmail({
            to: email,
            subject: `How has ${childName}\u2019s first week been? \u2014 CentreConnect`,
            html,
          })
          await upsertNotificationLog(admin, {
            centreId,
            eventKey,
            eventType: 'parent_post_enrollment_feedback_day7',
            channel: 'email',
            recipient: email,
            status: result.status,
            provider: result.directSent ? result.directProvider ?? 'smtp' : 'email_queue',
            providerMessageId: result.directMessageId ?? result.queueMessageId,
            payload: { enrollmentAgeDays: Math.round(enrollmentAgeDays), childName, centreName },
            errorMessage: result.status !== 'sent' ? result.deliveryMessage : null,
          })
          if (result.status === 'sent' || result.status === 'queued') {
            results.postEnrollmentFeedbackSent++
            sentKeys.add(eventKey)
          } else {
            results.errors.push(
              `postEnrollmentFeedback ${(parent as any).id}: ${result.deliveryMessage}`
            )
          }
        } catch (err) {
          results.errors.push(
            `postEnrollmentFeedback ${(parent as any).id}: ${err instanceof Error ? err.message : String(err)}`
          )
        }
      } else {
        results.postEnrollmentFeedbackSkipped++
      }
    }
  }

  return NextResponse.json({ ok: true, ...results })
}
