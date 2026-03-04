import 'server-only'

import { randomUUID } from 'crypto'
import { createWhatsappClickToChatLink } from '@/lib/communications/whatsapp'
import { requireSupabaseAdminEnv } from '@/lib/supabase/env'

export type WhatsappNotificationEventType =
  | 'application_status_change'
  | 'offer_acceptance'
  | 'document_request_from_coparent'
  | 'daily_report_ready'
  | 'pickup_verified'

type DispatchWhatsappEventInput = {
  eventType: WhatsappNotificationEventType
  eventKey?: string | null
  centreId?: string | null
  parentId?: string | null
  applicationId?: string | null
  recipientPhone?: string | null
  recipientName?: string | null
  message: string
  metadata?: Record<string, unknown> | null
}

type DispatchWhatsappEventResult = {
  ok: boolean
  eventKey: string
  whatsappHref: string | null
  error: string | null
}

function buildDefaultEventKey(eventType: WhatsappNotificationEventType, centreId?: string | null) {
  return `whatsapp:${eventType}:${centreId?.trim() || 'global'}:${Date.now()}:${randomUUID()}`
}

function getFunctionUrl() {
  const direct = process.env.WHATSAPP_NOTIFIER_FUNCTION_URL?.trim()
  if (direct) return direct.replace(/\/+$/, '')

  const { supabaseUrl } = requireSupabaseAdminEnv('whatsapp-notifier-dispatch')
  return `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/whatsapp-notifier`
}

type EdgeResponse = {
  ok?: boolean
  event_key?: string
  error?: string
  delivery?: {
    click_to_chat_url?: string | null
  } | null
}

export async function dispatchWhatsappEvent(
  input: DispatchWhatsappEventInput
): Promise<DispatchWhatsappEventResult> {
  const message = input.message.trim()
  const eventKey = input.eventKey?.trim() || buildDefaultEventKey(input.eventType, input.centreId)
  const fallbackHref = createWhatsappClickToChatLink(input.recipientPhone ?? null, message)

  if (!message) {
    return {
      ok: false,
      eventKey,
      whatsappHref: fallbackHref,
      error: 'Message is required for WhatsApp notification dispatch.',
    }
  }

  let serviceRoleKey: string
  let functionUrl: string
  try {
    const env = requireSupabaseAdminEnv('whatsapp-notifier-dispatch')
    serviceRoleKey = env.serviceRoleKey
    functionUrl = getFunctionUrl()
  } catch (error) {
    return {
      ok: false,
      eventKey,
      whatsappHref: fallbackHref,
      error: error instanceof Error ? error.message : 'Supabase admin env is missing for WhatsApp notifier dispatch.',
    }
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
  }

  const secret = process.env.WHATSAPP_NOTIFIER_SECRET?.trim()
  if (secret) {
    headers['x-whatsapp-notifier-secret'] = secret
  }

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event_key: eventKey,
        event_type: input.eventType,
        centre_id: input.centreId ?? null,
        parent_id: input.parentId ?? null,
        application_id: input.applicationId ?? null,
        recipient_phone: input.recipientPhone ?? null,
        recipient_name: input.recipientName ?? null,
        message,
        metadata: input.metadata ?? {},
      }),
      cache: 'no-store',
    })

    const responseText = await response.text()
    const parsed = (responseText ? JSON.parse(responseText) : {}) as EdgeResponse
    const resolvedHref = parsed.delivery?.click_to_chat_url ?? fallbackHref

    if (!response.ok || parsed.ok === false) {
      return {
        ok: false,
        eventKey: parsed.event_key?.trim() || eventKey,
        whatsappHref: resolvedHref,
        error: parsed.error || `WhatsApp notifier failed with status ${response.status}.`,
      }
    }

    return {
      ok: true,
      eventKey: parsed.event_key?.trim() || eventKey,
      whatsappHref: resolvedHref,
      error: null,
    }
  } catch (error) {
    return {
      ok: false,
      eventKey,
      whatsappHref: fallbackHref,
      error: error instanceof Error ? error.message : 'Failed to call WhatsApp notifier edge function.',
    }
  }
}

