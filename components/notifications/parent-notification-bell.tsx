'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Bell, CheckCheck, Dot } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type ParentNotificationBellProps = {
  parentId: string
}

type NotificationRow = {
  id: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export function ParentNotificationBell({ parentId }: ParentNotificationBellProps) {
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<NotificationRow[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!parentId) return

    let mounted = true

    async function loadInitial() {
      const [itemsResult, unreadResult] = await Promise.all([
        supabase
          .from('parent_notifications')
          .select('id,title,message,is_read,created_at')
          .eq('parent_id', parentId)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('parent_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('parent_id', parentId)
          .eq('is_read', false),
      ])

      if (!mounted) return

      setItems((itemsResult.data ?? []) as NotificationRow[])
      setUnreadCount(unreadResult.count ?? 0)
    }

    void loadInitial()

    const channel = supabase
      .channel(`parent-notification-bell-${parentId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'parent_notifications', filter: `parent_id=eq.${parentId}` },
        (payload) => {
          const incoming = payload.new as NotificationRow
          if (!incoming?.id) return
          setItems((current) => [incoming, ...current.filter((item) => item.id !== incoming.id)].slice(0, 8))
          if (!incoming.is_read) {
            setUnreadCount((count) => count + 1)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'parent_notifications', filter: `parent_id=eq.${parentId}` },
        (payload) => {
          const incoming = payload.new as NotificationRow
          const previous = payload.old as NotificationRow
          if (!incoming?.id) return

          setItems((current) => current.map((item) => (item.id === incoming.id ? { ...item, is_read: incoming.is_read } : item)))

          if (previous?.is_read === false && incoming.is_read === true) {
            setUnreadCount((count) => Math.max(0, count - 1))
          }
          if (previous?.is_read === true && incoming.is_read === false) {
            setUnreadCount((count) => count + 1)
          }
        }
      )
      .subscribe()

    return () => {
      mounted = false
      void supabase.removeChannel(channel)
    }
  }, [parentId, supabase])

  async function markAsRead(id: string) {
    const target = items.find((item) => item.id === id)
    if (!target || target.is_read) return

    setItems((current) => current.map((item) => (item.id === id ? { ...item, is_read: true } : item)))
    setUnreadCount((count) => Math.max(0, count - 1))

    const { error } = await supabase.from('parent_notifications').update({ is_read: true }).eq('id', id).eq('parent_id', parentId)
    if (error) {
      setItems((current) => current.map((item) => (item.id === id ? { ...item, is_read: false } : item)))
      setUnreadCount((count) => count + 1)
    }
  }

  async function markAllAsRead() {
    if (unreadCount === 0) return

    const unreadIds = items.filter((item) => !item.is_read).map((item) => item.id)
    setItems((current) => current.map((item) => ({ ...item, is_read: true })))
    setUnreadCount(0)

    const { error } = await supabase
      .from('parent_notifications')
      .update({ is_read: true })
      .eq('parent_id', parentId)
      .eq('is_read', false)

    if (error) {
      setItems((current) =>
        current.map((item) => (unreadIds.includes(item.id) ? { ...item, is_read: false } : item))
      )
      const { count } = await supabase
        .from('parent_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', parentId)
        .eq('is_read', false)
      setUnreadCount(count ?? unreadIds.length)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="relative h-10 w-10 rounded-2xl border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
          aria-label="Open notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[340px] rounded-2xl p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm font-black text-slate-900">Notifications</DropdownMenuLabel>
          <button
            type="button"
            onClick={() => void markAllAsRead()}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        </div>
        <DropdownMenuSeparator className="my-0" />

        {items.length === 0 ? (
          <div className="px-3 py-5 text-center text-sm text-slate-500">No notifications yet.</div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto px-1 py-1">
            {items.map((item) => (
              <Link
                key={item.id}
                href="/parent/notifications"
                onClick={() => void markAsRead(item.id)}
                className={cn(
                  'block rounded-xl px-2.5 py-2 transition-colors hover:bg-slate-50',
                  item.is_read ? 'bg-white' : 'bg-cyan-50/70'
                )}
              >
                <p className="line-clamp-1 text-xs font-bold text-slate-900">
                  {!item.is_read ? <Dot className="mr-0.5 inline h-4 w-4 text-cyan-500" /> : null}
                  {item.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-600">{item.message}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {formatDate(item.created_at)}
                </p>
              </Link>
            ))}
          </div>
        )}

        <DropdownMenuSeparator className="my-0" />
        <div className="p-2">
          <Button asChild variant="outline" size="sm" className="h-9 w-full rounded-xl border-slate-200">
            <Link href="/parent/notifications">Open full inbox</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
