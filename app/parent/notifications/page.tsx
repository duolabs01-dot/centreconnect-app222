import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { NotificationsInbox } from './notifications-inbox'
import { startRoutePerf, logRoutePerf } from '@/lib/perf/server-timing'
import { NextBestActionStrip } from '@/components/parent/next-best-action-strip'

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
      .select('id,title,message,is_read,created_at,ecd_centres(name,contact_whatsapp,contact_phone)')
      .order('created_at', { ascending: false })
      .limit(50)

    const items = (data ?? []) as Array<{
      id: string
      title: string
      message: string
      is_read: boolean
      created_at: string
      ecd_centres?:
        | { name: string; contact_whatsapp: string | null; contact_phone: string | null }
        | { name: string; contact_whatsapp: string | null; contact_phone: string | null }[]
        | null
    }>

    return (
      <div className="cc-page">
        <section>
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Family Inbox</h1>
          <p className="mt-1 text-sm text-slate-600">Messages from centres, announcements, and application updates.</p>
        </section>
        <NextBestActionStrip
          title="Close the loop quickly"
          hint="Responding to updates early improves placement outcomes."
          actions={[
            { label: 'View Applications', href: '/parent/applications' },
            { label: 'Find More Centres', href: '/directory' },
          ]}
        />
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {(['All', 'Messages', 'Announcements', 'Updates'] as const).map((tab) => (
            <button
              key={tab}
              className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-700 data-[active=true]:bg-white data-[active=true]:text-slate-900 data-[active=true]:shadow-sm"
              data-active={tab === 'All' ? 'true' : 'false'}
            >
              {tab}
            </button>
          ))}
        </div>
        <NotificationsInbox initialItems={items} />
      </div>
    )
  } finally {
    logRoutePerf(perf)
  }
}


