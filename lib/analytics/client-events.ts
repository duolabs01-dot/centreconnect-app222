'use client'

import { track } from '@vercel/analytics'

type ActorRole = 'platform_admin' | 'ecd_admin' | 'ecd_supervisor' | 'ecd_staff' | 'parent_user' | 'anonymous'

type MetadataValue = string | number | boolean | null

export type AnalyticsEventType =
  | 'profile_view'
  | 'whatsapp_click'
  | 'call_click'
  | 'application_submitted'
  | 'page_view'
  | 'page_duration'
  | 'pickup_verified'
  | 'announcement_sent'
  | 'compliance_uploaded'
  | 'parent_invite_sent'
  | 'invoice_paid'
  | 'marketplace_requested'
  | 'referral_used'
  | 'daily_report_published'
  | 'invite_link_opened'
  | 'welcome_pack_viewed'
  | 'welcome_pack_scenario_opened'
  | 'welcome_pack_cta_clicked'
  | 'qr_poster_viewed'
  | 'qr_poster_print_clicked'
  | 'qr_poster_print_completed'
  | 'onboarding_step_viewed'
  | 'onboarding_step_completed'
  | 'onboarding_completed'
  | 'first_value_reached'
  | 'parent_record_created'
  | 'parent_record_updated'
  | 'parent_record_deleted'
  | 'pwa_prompt_shown'
  | 'pwa_install_clicked'
  | 'pwa_install_accepted'
  | 'pwa_install_dismissed'

type TrackAnalyticsEventInput = {
  eventType: AnalyticsEventType
  ecdId?: string | null
  actorRole?: ActorRole
  path?: string
  durationMs?: number
  sessionId?: string
  metadata?: Record<string, MetadataValue>
}

function sanitizeMetadata(metadata?: Record<string, MetadataValue>) {
  if (!metadata) return {}
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined)
  ) as Record<string, MetadataValue>
}

export async function trackAnalyticsEvent(input: TrackAnalyticsEventInput) {
  const metadata = sanitizeMetadata(input.metadata)

  try {
    track(input.eventType, {
      ecdId: input.ecdId ?? null,
      actorRole: input.actorRole ?? 'anonymous',
      path: input.path ?? null,
      ...metadata,
    })
  } catch {
    // Vercel analytics should never block UX.
  }

  if (!input.ecdId) {
    return
  }

  const payload = JSON.stringify({
    ecdId: input.ecdId,
    eventType: input.eventType,
    actorRole: input.actorRole,
    path: input.path,
    durationMs: input.durationMs,
    sessionId: input.sessionId,
    metadata,
  })

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([payload], { type: 'application/json' })
    navigator.sendBeacon('/api/analytics/events', blob)
    return
  }

  try {
    await fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    })
  } catch {
    // Internal analytics should never block UX.
  }
}

