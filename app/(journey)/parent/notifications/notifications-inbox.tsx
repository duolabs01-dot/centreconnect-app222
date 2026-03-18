'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Bell, BellOff } from 'lucide-react'
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
  if (!value) return { name: 'CentreConnect Team', contactWhatsapp: null as string | null, contactPhone: null as string | null }
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

function getNotificationType(item: NotificationItem): 'action' | 'message' | 'info' {
  const templateKey = (item.template_key ?? '').trim().toLowerCase()
  if (
    templateKey.includes('application') ||
    templateKey.includes('offer') ||
    templateKey.includes('pickup') ||
    templateKey.includes('document')
  ) {
    return 'action'
  }

  if (isDirectMessage(item)) return 'message'
  return 'info'
}

function getActionCta(
  item: NotificationItem,
  centre: ReturnType<typeof normalizeCentre>
): { label: string; href: string } | null {
  const type = getNotificationType(item)
  if (type === 'action') return { label: 'Review', href: '/parent/applications' }
  if (type === 'message' && centre.contactWhatsapp) {
    return {
      label: 'Reply on WhatsApp',
      href: toWhatsappHref(centre.contactWhatsapp, `Hi, following up on: ${item.title}`) ?? '#',
    }
  }
  return null
}

function getDateGroup(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const thisWeekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000)
  
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  if (itemDate.getTime() >= today.getTime()) return 'Today'
  if (itemDate.getTime() >= yesterday.getTime()) return 'Yesterday'
  if (itemDate.getTime() >= thisWeekStart.getTime()) return 'This Week'
  return 'Older'
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
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
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
    let filtered = items
    if (showUnreadOnly) {
      filtered = items.filter((item) => !item.is_read)
    } else if (activeTab !== 'All') {
      filtered = items.filter((item) => {
        const templateKey = (item.template_key ?? '').trim().toLowerCase()
        const title = item.title.trim().toLowerCase()

        const isMessage = getNotificationType(item) === 'message'
        const isAnnouncement =
          templateKey === 'announcement' ||
          templateKey === 'open_day_invite' ||
          templateKey === 'spot_available' ||
          templateKey.endsWith('_notice') ||
          templateKey.endsWith('_invite') ||
          templateKey === 'daily_report_nudge' ||
          templateKey === 'report_card_ready' ||
          title.includes('announcement') ||
          title.includes('open day') ||
          title.includes('invite') ||
          title.includes('spot available')
        const isUpdate = !isMessage && !isAnnouncement

        if (activeTab === 'Messages') return isMessage
        if (activeTab === 'Announcements') return isAnnouncement
        return isUpdate
      })
    }
    
    // Group by date
    const groups: Record<string, NotificationItem[]> = {}
    filtered.forEach((item) => {
      const group = getDateGroup(item.created_at)
      if (!groups[group]) groups[group] = []
      groups[group].push(item)
    })
    return groups
  }, [activeTab, items, showUnreadOnly])

  const unreadCount = useMemo(() => items.filter((item) => !item.is_read).length, [items])
  const groupedItems = filteredItems as Record<string, NotificationItem[]>

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
        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-600">
            {unreadCount} unread notification{unreadCount === 1 ? '' : 's'} {activeTab === 'All' ? 'in inbox' : `in ${activeTab.toLowerCase()}`}
          </p>
          <button
            type="button"
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              showUnreadOnly ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {showUnreadOnly ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
            {showUnreadOnly ? 'Showing unread' : 'Unread only'}
          </button>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={markAllRead}>
          Mark all read
        </Button>
      </div>

      {Object.keys(groupedItems).length === 0 ? (
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
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([group, groupItems]) => (
            <div key={group}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{group}</p>
              <div className="space-y-3">
                {groupItems.map((item) => (
                  <div key={item.id} className={`rounded-lg border p-4 ${item.is_read ? 'border-slate-200 bg-white' : 'border-primary/20 bg-primary/5'}`}>
                    {(() => {
                      const centre = normalizeCentre(item.ecd_centres)
                      const type = getNotificationType(item)
                      const cta = getActionCta(item, centre)
                      return (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                {type === 'action' ? (
                                  <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                    Action needed
                                  </span>
                                ) : null}
                                {type === 'message' ? (
                                  <span className="inline-flex rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                                    Message
                                  </span>
                                ) : null}
                                {!item.is_read && <span className="h-2 w-2 rounded-full bg-cyan-500" />}
                              </div>
                              <p className={`mt-1 text-sm font-semibold text-slate-900 ${!item.is_read ? 'font-bold' : ''}`}>{item.title}</p>
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
                          {cta ? (
                            <div className="mt-2">
                              <a
                                href={cta.href}
                                target={cta.href.startsWith('http') ? '_blank' : undefined}
                                rel={cta.href.startsWith('http') ? 'noreferrer' : undefined}
                                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-teal-700"
                              >
                                {cta.label}
                                <ArrowRight className="h-3 w-3" />
                              </a>
                            </div>
                          ) : null}
                          <div className="mt-3">
                            <Button type="button" size="sm" variant="outline" onClick={() => void copyMessage(item.message)}>
                              Copy message
                            </Button>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

