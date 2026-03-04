import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_LIMIT = 8
const MAX_LIMIT = 30

type BellNotificationRow = {
  id: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

function parseLimit(raw: string | null) {
  const parsed = Number(raw ?? DEFAULT_LIMIT)
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT
  const normalized = Math.floor(parsed)
  if (normalized < 1) return DEFAULT_LIMIT
  return Math.min(normalized, MAX_LIMIT)
}

async function getAuthedUserId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabase, userId: user?.id ?? null }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, userId } = await getAuthedUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limit = parseLimit(request.nextUrl.searchParams.get('limit'))

    const [itemsResult, unreadResult] = await Promise.all([
      supabase
        .from('parent_notifications')
        .select('id,title,message,is_read,created_at')
        .eq('parent_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('parent_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', userId)
        .eq('is_read', false),
    ])

    if (itemsResult.error) {
      return NextResponse.json({ error: itemsResult.error.message }, { status: 400 })
    }
    if (unreadResult.error) {
      return NextResponse.json({ error: unreadResult.error.message }, { status: 400 })
    }

    return NextResponse.json(
      {
        items: (itemsResult.data ?? []) as BellNotificationRow[],
        unreadCount: unreadResult.count ?? 0,
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, userId } = await getAuthedUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = (await request.json().catch(() => null)) as
      | {
          id?: string | null
          markAll?: boolean
        }
      | null

    if (!payload) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    if (payload.markAll === true) {
      const { error } = await supabase
        .from('parent_notifications')
        .update({ is_read: true })
        .eq('parent_id', userId)
        .eq('is_read', false)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    } else {
      const id = String(payload.id ?? '').trim()
      if (!id) {
        return NextResponse.json({ error: 'Notification id is required.' }, { status: 400 })
      }

      const { error } = await supabase
        .from('parent_notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('parent_id', userId)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    const unreadResult = await supabase
      .from('parent_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', userId)
      .eq('is_read', false)

    if (unreadResult.error) {
      return NextResponse.json({ error: unreadResult.error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, unreadCount: unreadResult.count ?? 0 }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

