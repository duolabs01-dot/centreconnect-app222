'use client'

import { useMemo, useState } from 'react'
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
  ecd_centres?:
    | { name: string; contact_whatsapp: string | null; contact_phone: string | null }
    | { name: string; contact_whatsapp: string | null; contact_phone: string | null }[]
    | null
}

function normalizeCentre(value: NotificationItem['ecd_centres']) {
  if (!value) return { name: 'Centre update', contactWhatsapp: null as string | null, contactPhone: null as string | null }
  const centre = Array.isArray(value) ? value[0] : value
  return {
    name: centre?.name ?? 'Centre update',
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

export function NotificationsInbox({ initialItems }: { initialItems: NotificationItem[] }) {
  const supabase = createClient()
  const [items, setItems] = useState(initialItems)

  const unreadCount = useMemo(() => items.filter((item) => !item.is_read).length, [items])

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
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={markAllRead}>
          Mark all read
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">No updates yet</p>
          <p className="mt-1 text-sm text-slate-600">Apply to centres and switch on preferences to get proactive updates here.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link href="/directory">Browse Centres</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/parent/preferences">Set Preferences</Link>
            </Button>
          </div>
        </div>
      ) : (
        items.map((item) => (
          <div key={item.id} className={`rounded-lg border p-4 ${item.is_read ? 'border-slate-200 bg-white' : 'border-blue-200 bg-blue-50/40'}`}>
            {(() => {
              const centre = normalizeCentre(item.ecd_centres)
              const whatsappHref = toWhatsappHref(centre.contactWhatsapp ?? centre.contactPhone, item.message)
              return (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
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
                        Open WhatsApp Link
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
