'use client'

import Link from 'next/link'
import { Component, type ErrorInfo, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, CheckCheck, Dot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatDate } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

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

type NotificationBellBoundaryProps = {
  children: ReactNode
}

type NotificationBellBoundaryState = {
  hasError: boolean
}

class NotificationBellBoundary extends Component<NotificationBellBoundaryProps, NotificationBellBoundaryState> {
  state: NotificationBellBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Parent notification bell crashed; falling back to direct inbox link.', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Button
          asChild
          type="button"
          variant="outline"
          size="icon"
          className="relative h-10 w-10 rounded-2xl border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
          aria-label="Open notifications"
        >
          <Link href="/parent/notifications">
            <Bell className="h-4 w-4" />
          </Link>
        </Button>
      )
    }

    return this.props.children
  }
}

function BellFallbackButton() {
  return (
    <Button
      asChild
      type="button"
      variant="outline"
      size="icon"
      className="relative h-10 w-10 rounded-2xl border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
      aria-label="Open notifications"
    >
      <Link href="/parent/notifications">
        <Bell className="h-4 w-4" />
      </Link>
    </Button>
  )
}

function ParentNotificationBellInner({ parentId }: ParentNotificationBellProps) {
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<NotificationRow[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const unreadIds = useMemo(() => items.filter((item) => !item.is_read).map((item) => item.id), [items])

  const loadNotifications = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!parentId) return
      if (!options?.silent) setIsLoading(true)

      try {
        const response = await fetch('/api/parent/notifications?limit=8', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        })
        const payload = (await response.json().catch(() => null)) as
          | {
              items?: NotificationRow[]
              unreadCount?: number
              error?: string
            }
          | null

        if (!response.ok) {
          if (!options?.silent) {
            toast.error(payload?.error || 'Could not load notifications.')
          }
          return
        }

        setItems(Array.isArray(payload?.items) ? payload.items : [])
        setUnreadCount(typeof payload?.unreadCount === 'number' ? payload.unreadCount : 0)
      } catch (error) {
        if (!options?.silent) {
          console.error('Failed to load parent notification bell data:', error)
          toast.error('Could not load notifications.')
        }
      } finally {
        if (!options?.silent) setIsLoading(false)
      }
    },
    [parentId]
  )

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  useEffect(() => {
    if (!open) return
    void loadNotifications({ silent: true })
  }, [open, loadNotifications])

  useEffect(() => {
    if (!parentId) return

    const channel = supabase
      .channel(`parent-notification-bell-live-${parentId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'parent_notifications', filter: `parent_id=eq.${parentId}` },
        () => {
          void loadNotifications({ silent: true })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'parent_notifications', filter: `parent_id=eq.${parentId}` },
        () => {
          void loadNotifications({ silent: true })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadNotifications, parentId, supabase])

  async function markAsRead(id: string) {
    const target = items.find((item) => item.id === id)
    if (!target || target.is_read) return

    setItems((current) => current.map((item) => (item.id === id ? { ...item, is_read: true } : item)))
    setUnreadCount((count) => Math.max(0, count - 1))

    try {
      const response = await fetch('/api/parent/notifications', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      })

      const payload = (await response.json().catch(() => null)) as { unreadCount?: number; error?: string } | null
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not mark notification as read.')
      }

      if (typeof payload?.unreadCount === 'number') {
        setUnreadCount(payload.unreadCount)
      }
    } catch (error) {
      setItems((current) => current.map((item) => (item.id === id ? { ...item, is_read: false } : item)))
      setUnreadCount((count) => count + 1)
      toast.error(error instanceof Error ? error.message : 'Could not mark notification as read.')
    }
  }

  async function markAllAsRead() {
    if (unreadIds.length === 0) return

    setItems((current) => current.map((item) => ({ ...item, is_read: true })))
    setUnreadCount(0)

    try {
      const response = await fetch('/api/parent/notifications', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markAll: true }),
      })
      const payload = (await response.json().catch(() => null)) as { unreadCount?: number; error?: string } | null
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not mark all notifications as read.')
      }

      if (typeof payload?.unreadCount === 'number') {
        setUnreadCount(payload.unreadCount)
      }
    } catch (error) {
      setItems((current) =>
        current.map((item) => (unreadIds.includes(item.id) ? { ...item, is_read: false } : item))
      )
      setUnreadCount(unreadIds.length)
      toast.error(error instanceof Error ? error.message : 'Could not mark all notifications as read.')
    }
  }

  if (!parentId) {
    return <BellFallbackButton />
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
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
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-40"
            disabled={unreadCount === 0}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        </div>
        <DropdownMenuSeparator className="my-0" />

        {isLoading ? (
          <div className="px-3 py-5 text-center text-sm text-slate-500">Loading notifications...</div>
        ) : items.length === 0 ? (
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

export function ParentNotificationBell(props: ParentNotificationBellProps) {
  return (
    <NotificationBellBoundary>
      <ParentNotificationBellInner {...props} />
    </NotificationBellBoundary>
  )
}
