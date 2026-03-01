import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { NotificationsInbox } from './notifications-inbox'
import { startRoutePerf, logRoutePerf } from '@/lib/perf/server-timing'

export const metadata: Metadata = {
  title: 'Family Inbox — Messages, Announcements & Updates',
  description: 'All centre messages, announcements, and application updates in one inbox.',
}

export default async function ParentNotificationsPage() {
  const perf = startRoutePerf('/parent/notifications')
  const supabase = await createClient()
  try {
    const { data } = await supabase
      .from('parent_notifications')
      .select('id,title,message,is_read,created_at,template_key,ecd_centres(name,contact_whatsapp,contact_phone)')
      .order('created_at', { ascending: false })
      .limit(50)

    const items = (data ?? []) as Array<{
      id: string
      title: string
      message: string
      is_read: boolean
      created_at: string
      template_key: string | null
      ecd_centres?:
        | { name: string; contact_whatsapp: string | null; contact_phone: string | null }
        | { name: string; contact_whatsapp: string | null; contact_phone: string | null }[]
        | null
    }>

    return (
      <div className="bg-surface-secondary px-4 pt-4 pb-28 min-h-screen">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Family Inbox</h1>
          <p className="mt-1 text-sm text-slate-600">Messages from centres, announcements, and application updates.</p>
        </header>
        <NotificationsInbox initialItems={items} />
      </div>
    )
  } finally {
    logRoutePerf(perf)
  }
}
