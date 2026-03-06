import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeAppUrl, sanitizeGeneratedAccessLink } from '@/lib/auth/onboarding-links'

export const dynamic = 'force-dynamic'

function normalizeChannel(value: string | null) {
  return value === 'whatsapp' ? 'whatsapp' : 'email'
}

function isSupabaseAuthPath(pathname: string) {
  return pathname.trim().toLowerCase().startsWith('/auth/v1/')
}

function sanitizeTarget(target: string | null, request: NextRequest) {
  const canonicalLogin = `${normalizeAppUrl()}/ecd/login`
  const fallback = new URL(canonicalLogin)
  if (!target) return fallback

  try {
    const normalizedTarget = sanitizeGeneratedAccessLink({
      actionLink: target,
      fallbackRedirectTo: canonicalLogin,
    })
    const parsed = new URL(normalizedTarget, request.url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return fallback

    const requestHost = new URL(request.url).hostname
    const appHost = new URL(normalizeAppUrl()).hostname

    const isSameHost = parsed.hostname === requestHost || parsed.hostname === appHost
    const isSupabaseAuthHost = parsed.hostname.endsWith('.supabase.co')
    if (!isSameHost && !isSupabaseAuthHost) return fallback
    if (isSupabaseAuthHost && !isSupabaseAuthPath(parsed.pathname)) return fallback

    return parsed
  } catch {
    return fallback
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const eventKey = url.searchParams.get('event_key')?.trim() || ''
  const channel = normalizeChannel(url.searchParams.get('channel'))
  const target = sanitizeTarget(url.searchParams.get('target'), request)

  if (eventKey) {
    const admin = createAdminClient()
    const { error } = await admin
      .from('notification_logs')
      .update({ status: 'clicked', updated_at: new Date().toISOString() })
      .eq('event_key', eventKey)
      .eq('channel', channel)
      .in('status', ['queued', 'sent', 'delivered', 'opened'])

    if (error) {
      console.error('Failed to mark notification as opened:', error.message)
    }

    try {
      const { data: logRow } = await admin
        .from('notification_logs')
        .select('centre_id')
        .eq('event_key', eventKey)
        .eq('channel', channel)
        .maybeSingle()

      if (logRow?.centre_id) {
        await admin.from('ecd_analytics_events').insert({
          ecd_id: logRow.centre_id,
          event_type: 'invite_link_opened',
          actor_role: 'anonymous',
          path: '/api/invites/open',
          metadata: {
            channel,
            event_key: eventKey,
            target_host: target.hostname,
            target_path: target.pathname,
          },
        })
      }
    } catch (trackError) {
      console.error('Failed to append invite_link_opened analytics event:', trackError)
    }
  }

  return NextResponse.redirect(target)
}
