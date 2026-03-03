'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

type NotificationItem = {
  id: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  template_key?: string | null
  ecd_centres?:
    | { name: string; contact_whatsapp: string | null; contact_phone: string | null }
    | { name: string; contact_whatsapp: string | null; contact_phone: string | null }[]
    | null
}

type InboxTab = 'All' | 'Messages' | 'Announcements' | 'Updates'

function normalizeCentre(value: NotificationItem['ecd_centres']) {
  if (!value) return { name: 'Crèche update', contactWhatsapp: null as string | null, contactPhone: null as string | null }
  const centre = Array.isArray(value) ? value[0] : value
  return {
    name: centre?.name ?? 'Crèche update',
    contactWhatsapp: centre?.contact_whatsapp ?? null,
    contactPhone: centre?.contact_phone ?? null,
  }
}

function toWhatsappHref(phone: string | null, message: string) {
  if (!message.trim()) return null
  const digits = (phone ?? '').replace(/[^\d]/g, '')
  if (!digits) return `https://wa.me/?text=${encodeURIComponent(message)}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

function isDirectMessage(item: NotificationItem) {
  const templateKey = (item.template_key ?? '').trim().toLowerCase()
  const title = item.title.trim().toLowerCase()
  return (
    templateKey === 'parent_message' ||
    title.startsWith('message from ') ||
    title.startsWith('direct message')
  )
}

export function NotificationsInbox({
  initialItems,
  parentId,
}: {
  initialItems: NotificationItem[]
  parentId: string
}) {
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState(initialItems)
  const [activeTab, setActiveTab] = useState<InboxTab>('All')
  const seenRealtimeIdsRef = useRef(new Set(initialItems.map((item) => item.id)))

  useEffect(() => {
    seenRealtimeIdsRef.current = new Set(items.map((item) => item.id))
  }, [items])

  useEffect(() => {
    if (!parentId) return

    const channel = supabase
      .channel(`parent-notifications-live-${parentId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'parent_notifications', filter: `parent_id=eq.${parentId}` },
        (payload) => {
          const next = payload.new as {
            id?: string
            title?: string
            message?: string
            is_read?: boolean
            created_at?: string
            template_key?: string | null
          }
          if (!next.id || seenRealtimeIdsRef.current.has(next.id)) return

          const nextItem: NotificationItem = {
            id: next.id,
            title: next.title ?? 'New update',
            message: next.message ?? 'Your crèche shared a new update.',
            is_read: Boolean(next.is_read),
            created_at: next.created_at ?? new Date().toISOString(),
            template_key: next.template_key ?? null,
            ecd_centres: null,
          }

          setItems((current) => [nextItem, ...current].slice(0, 100))
          toast(nextItem.title, {
            description: `${nextItem.message} 😊`,
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'parent_notifications', filter: `parent_id=eq.${parentId}` },
        (payload) => {
          const next = payload.new as { id?: string; is_read?: boolean }
          if (!next.id) return
          setItems((current) =>
            current.map((item) => (item.id === next.id ? { ...item, is_read: Boolean(next.is_read) } : item))
          )
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [parentId, supabase])

  const filteredItems = useMemo(() => {
    if (activeTab === 'All') return items
    return items.filter((item) => {
      const templateKey = (item.template_key ?? '').trim().toLowerCase()
      const title = item.title.trim().toLowerCase()

      const isMessage =
        templateKey === 'parent_message' ||
        title.startsWith('message to ') ||
        title.startsWith('message from ') ||
        title.startsWith('direct message')
      const isAnnouncement =
        templateKey === 'announcement' ||
        templateKey === 'open_day_invite' ||
        templateKey === 'spot_available' ||
        title.includes('announcement') ||
        title.includes('open day') ||
        title.includes('invite') ||
        title.includes('spot available')
      const isUpdate = !isMessage && !isAnnouncement

      if (activeTab === 'Messages') return isMessage
      if (activeTab === 'Announcements') return isAnnouncement
      return isUpdate
    })
  }, [activeTab, items])

  const unreadCount = useMemo(() => filteredItems.filter((item) => !item.is_read).length, [filteredItems])

  async function markRead(notificationId: string) {
    const { error } = await supabase
      .from('parent_notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    if (error) {
      toast.error(error.message || 'Failed to mark as read')
      return
    }

    setItems((current) => current.map((item) => (item.id === notificationId ? { ...item, is_read: true } : item)))
  }

  async function markAllRead() {
    const unreadIds = items.filter((item) => !item.is_read).map((item) => item.id)
    if (unreadIds.length === 0) return

    const { error } = await supabase.from('parent_notifications').update({ is_read: true }).in('id', unreadIds)

    if (error) {
      toast.error(error.message || 'Failed to mark all as read')
      return
    }

    setItems((current) => current.map((item) => ({ ...item, is_read: true })))
    toast.success('All notifications marked as read')
  }

  async function copyMessage(text: string) {
    await navigator.clipboard.writeText(text)
    toast.success('Message copied')
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {(['All', 'Messages', 'Announcements', 'Updates'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className="flex-1 rounded-2xl px-3 py-2 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-700 data-[active=true]:bg-white data-[active=true]:text-slate-900 data-[active=true]:shadow-sm"
            data-active={activeTab === tab ? 'true' : 'false'}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          {unreadCount} unread notification{unreadCount === 1 ? '' : 's'} {activeTab === 'All' ? 'in inbox' : `in ${activeTab.toLowerCase()}`}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={markAllRead}>
          Mark all read
        </Button>
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">No {activeTab === 'All' ? 'updates' : activeTab.toLowerCase()} yet</p>
          <p className="mt-1 text-sm text-slate-600">Apply to crèches and switch on preferences to get proactive updates here.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link href="/directory">Browse Crèches</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/parent/preferences">Set Preferences</Link>
            </Button>
          </div>
        </div>
      ) : (
        filteredItems.map((item) => (
          <div key={item.id} className={`rounded-lg border p-4 ${item.is_read ? 'border-slate-200 bg-white' : 'border-blue-200 bg-blue-50/40'}`}>
            {(() => {
              const centre = normalizeCentre(item.ecd_centres)
              const whatsappHref = toWhatsappHref(centre.contactWhatsapp ?? centre.contactPhone, item.message)
              const direct = isDirectMessage(item)
              return (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.title}
                        {direct ? (
                          <span className="ml-2 inline-flex rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-700">
                            Direct
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {centre.name} | {formatDate(item.created_at)}
                      </p>
                    </div>
                    {!item.is_read ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => void markRead(item.id)}>
                        Mark read
                      </Button>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm text-slate-700">{item.message}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => void copyMessage(item.message)}>
                      Copy message
                    </Button>
                    <Button type="button" size="sm" variant="outline" asChild>
                      <a
                        href={whatsappHref ?? '#'}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => {
                          if (!whatsappHref) {
                            event.preventDefault()
                            toast('WhatsApp link unavailable')
                          }
                        }}
                      >
                        {direct ? 'Reply on WhatsApp' : 'Open WhatsApp Link'}
                      </a>
                    </Button>
                  </div>
                </>
              )
            })()}
          </div>
        ))
      )}
    </div>
  )
}

