'use client'

import Link from 'next/link'
import { Component, type ErrorInfo, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, CheckCheck, Dot } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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

const SPRING_SNAPPY = { type: 'spring' as const, stiffness: 400, damping: 26 }
const SPRING_GENTLE = { type: 'spring' as const, stiffness: 260, damping: 22 }

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

function NotificationSkeleton() {
  return (
    <div className="space-y-2 px-2 py-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl px-2.5 py-2">
          <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200" />
          <div className="mt-1.5 h-2.5 w-full animate-pulse rounded bg-slate-100" />
          <div className="mt-1.5 h-2 w-1/3 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  )
}

function ParentNotificationBellInner({ parentId }: ParentNotificationBellProps) {
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<NotificationRow[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [prevUnreadCount, setPrevUnreadCount] = useState(0)
  const [shouldPulse, setShouldPulse] = useState(false)

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

        const newItems = Array.isArray(payload?.items) ? payload.items : []
        const newUnread = typeof payload?.unreadCount === 'number' ? payload.unreadCount : 0

        setItems(newItems)
        setPrevUnreadCount(unreadCount)
        setUnreadCount(newUnread)

        // Trigger pulse when new notifications arrive
        if (newUnread > unreadCount && unreadCount > 0) {
          setShouldPulse(true)
          setTimeout(() => setShouldPulse(false), 1200)
        }
      } catch (error) {
        if (!options?.silent) {
          console.error('Failed to load parent notification bell data:', error)
          toast.error('Could not load notifications.')
        }
      } finally {
        if (!options?.silent) setIsLoading(false)
      }
    },
    [parentId, unreadCount]
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
          setShouldPulse(true)
          setTimeout(() => setShouldPulse(false), 1200)
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          transition={SPRING_SNAPPY}
          className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 outline-none transition-colors hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
          aria-label="Open notifications"
        >
          <motion.div
            animate={shouldPulse ? { rotate: [0, -12, 12, -8, 8, 0] } : { rotate: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <Bell className="h-4 w-4" />
          </motion.div>

          <AnimatePresence mode="wait">
            {unreadCount > 0 ? (
              <motion.span
                key={`badge-${unreadCount}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={SPRING_SNAPPY}
                className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white shadow-sm"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </motion.button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[340px] rounded-2xl p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm font-black text-slate-900">Notifications</DropdownMenuLabel>
          <motion.button
            type="button"
            onClick={() => void markAllAsRead()}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-40"
            disabled={unreadCount === 0}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </motion.button>
        </div>
        <DropdownMenuSeparator className="my-0" />

        {isLoading ? (
          <NotificationSkeleton />
        ) : items.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <Bell className="mx-auto h-5 w-5 text-slate-300" />
            <p className="mt-2 text-sm text-slate-400">No notifications yet</p>
          </div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto px-1 py-1">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING_GENTLE, delay: index * 0.04 }}
              >
                <Link
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
              </motion.div>
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
