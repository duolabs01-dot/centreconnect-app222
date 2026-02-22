import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Security & Sign-in Activity | Parent Portal | CentreConnect',
  description: 'Review recent sign-ins and account activity to keep your family profile secure.',
}

export default async function ParentSecurityPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: events } = await supabase
    .from('parent_security_events')
    .select('id,event_type,details,created_at')
    .eq('parent_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Security & Sign-in Activity</h1>
          <p className="mt-1 text-sm text-slate-600">Review recent account events and keep your family profile secure.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/parent/profile">Back</Link>
        </Button>
      </section>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-medium text-slate-900">Last sign in</p>
            <p className="text-xs text-slate-600">{user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Not available'}</p>
          </div>
          {(events ?? []).length === 0 ? (
            <p className="text-sm text-slate-600">No activity events logged yet.</p>
          ) : (
            (events ?? []).map((event: any) => (
              <div key={event.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-sm font-medium text-slate-900">{event.event_type}</p>
                <p className="text-xs text-slate-600">{event.details || 'No details'}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDate(event.created_at)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
