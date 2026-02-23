import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NotificationsInbox } from './notifications-inbox'
import { startRoutePerf, logRoutePerf } from '@/lib/perf/server-timing'
import { NextBestActionStrip } from '@/components/parent/next-best-action-strip'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Message Centre | Parent Portal | CentreConnect',
  description: 'All centre updates, reminders, and important parent alerts in one inbox.',
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
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Message Centre</h1>
          <p className="mt-1 text-sm text-slate-600">See every centre update quickly so you never miss an important response.</p>
        </section>
        <NextBestActionStrip
          title="Close the loop quickly"
          hint="Responding to updates early improves placement outcomes."
          actions={[
            { label: 'View Applications', href: '/parent/applications' },
            { label: 'Find More Centres', href: '/directory' },
          ]}
        />
        <NotificationsInbox initialItems={items} />
        <div className="sticky bottom-20 z-20 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-[var(--shadow-elevation-1)] backdrop-blur md:hidden">
          <Button size="lg" className="h-12 w-full" asChild>
            <Link href="/parent/applications">Go To Applications</Link>
          </Button>
        </div>
      </div>
    )
  } finally {
    logRoutePerf(perf)
  }
}


