'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type BridgeMode = 'ecd' | 'parent'

type BrowserNotificationBridgeProps = {
  mode: BridgeMode
  ecdId?: string
  parentId?: string
  pollMs?: number
}

type NotificationRow = {
  id: string
  title: string
  message: string
  created_at: string
}

function hasNotificationSupport() {
  return typeof window !== 'undefined' && 'Notification' in window && window.isSecureContext
}

export function BrowserNotificationBridge({
  mode,
  ecdId,
  parentId,
  pollMs = 0,
}: BrowserNotificationBridgeProps) {
  const supabase = useMemo(() => createClient(), [])
  const initializedRef = useRef(false)
  const seenRef = useRef<Set<string>>(new Set())
  const [permission, setPermission] = useState<NotificationPermission>(
    hasNotificationSupport() ? Notification.permission : 'denied'
  )
  const [dismissedPrompt, setDismissedPrompt] = useState(false)

  const table = mode === 'ecd' ? 'ecd_notifications' : 'parent_notifications'
  const filterKey = mode === 'ecd' ? ecdId : parentId
  const canRun = Boolean(filterKey)
  const storagePrefix = `cc-browser-notif-${mode}`

  const markSeen = useCallback(
    (id: string) => {
      seenRef.current.add(id)
      try {
        window.sessionStorage.setItem(`${storagePrefix}-${id}`, '1')
      } catch {
        // no-op
      }
    },
    [storagePrefix]
  )

  const hasSeen = useCallback(
    (id: string) => {
      if (seenRef.current.has(id)) return true
      try {
        return window.sessionStorage.getItem(`${storagePrefix}-${id}`) === '1'
      } catch {
        return false
      }
    },
    [storagePrefix]
  )

  const notify = useCallback(
    (row: NotificationRow) => {
      if (!hasNotificationSupport() || permission !== 'granted') return
      if (hasSeen(row.id)) return
      markSeen(row.id)
      new Notification(row.title || 'CentreConnect', {
        body: row.message || 'You have a new notification.',
        tag: `cc-${mode}-${row.id}`,
      })
    },
    [hasSeen, markSeen, mode, permission]
  )

  const baselineLoad = useCallback(
    (rows: NotificationRow[]) => {
      rows.forEach((row) => markSeen(row.id))
      initializedRef.current = true
    },
    [markSeen]
  )

  const fetchLatest = useCallback(async () => {
    if (!canRun) return

    let query = supabase
      .from(table)
      .select('id,title,message,created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    if (mode === 'ecd' && ecdId) {
      query = query.eq('ecd_id', ecdId)
    }
    if (mode === 'parent' && parentId) {
      query = query.eq('parent_id', parentId)
    }

    const { data } = await query
    const rows = (data ?? []) as NotificationRow[]
    if (!initializedRef.current) {
      baselineLoad(rows)
      return
    }
    rows.forEach((row) => notify(row))
  }, [baselineLoad, canRun, ecdId, mode, notify, parentId, supabase, table])

  useEffect(() => {
    if (!canRun) return

    void fetchLatest()
    const interval = pollMs > 0
      ? window.setInterval(() => {
          void fetchLatest()
        }, pollMs)
      : null

    const channelName = `cc-notif-${mode}-${filterKey}`
    const filter =
      mode === 'ecd' && ecdId
        ? `ecd_id=eq.${ecdId}`
        : mode === 'parent' && parentId
          ? `parent_id=eq.${parentId}`
          : undefined

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table,
          filter,
        },
        (payload) => {
          const row = payload.new as NotificationRow
          if (!initializedRef.current) {
            markSeen(row.id)
            initializedRef.current = true
            return
          }
          notify(row)
        }
      )
      .subscribe()

    return () => {
      if (interval !== null) {
        window.clearInterval(interval)
      }
      void supabase.removeChannel(channel)
    }
  }, [canRun, ecdId, fetchLatest, filterKey, markSeen, mode, notify, parentId, pollMs, supabase, table])

  async function requestBrowserPermission() {
    if (!hasNotificationSupport()) return
    const next = await Notification.requestPermission()
    setPermission(next)
  }

  if (!hasNotificationSupport() || permission !== 'default' || dismissedPrompt || !canRun) {
    return null
  }

  return (
    <div className="fixed bottom-24 right-4 z-50 max-w-xs rounded-2xl border border-cyan-200 bg-white p-3 shadow-[var(--shadow-elevation-3)]">
      <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700">Enable Notifications</p>
      <p className="mt-1 text-xs text-slate-600">
        Allow browser alerts to receive new CentreConnect updates immediately.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={requestBrowserPermission}
          className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700"
        >
          Allow
        </button>
        <button
          type="button"
          onClick={() => setDismissedPrompt(true)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Not now
        </button>
      </div>
    </div>
  )
}

