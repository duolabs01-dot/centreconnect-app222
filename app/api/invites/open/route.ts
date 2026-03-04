import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function normalizeChannel(value: string | null) {
  return value === 'whatsapp' ? 'whatsapp' : 'email'
}

function sanitizeTarget(target: string | null, request: NextRequest) {
  const fallback = new URL('/ecd/login', request.url)
  if (!target) return fallback

  try {
    const parsed = new URL(target, request.url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return fallback

    const requestHost = new URL(request.url).hostname
    const appHost = process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
      : requestHost

    const isSameHost = parsed.hostname === requestHost || parsed.hostname === appHost
    const isSupabaseAuthHost = parsed.hostname.endsWith('.supabase.co')
    if (!isSameHost && !isSupabaseAuthHost) return fallback

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
      .update({ status: 'opened', updated_at: new Date().toISOString() })
      .eq('event_key', eventKey)
      .eq('channel', channel)
      .in('status', ['sent'])

    if (error) {
      console.error('Failed to mark notification as opened:', error.message)
    }
  }

  return NextResponse.redirect(target)
}
