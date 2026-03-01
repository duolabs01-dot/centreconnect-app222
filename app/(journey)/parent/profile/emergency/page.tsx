import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { EmergencyContactsManager } from '@/components/parent/EmergencyContactsManager'
import { startRoutePerf, logRoutePerf } from '@/lib/perf/server-timing'

export const metadata: Metadata = {
  title: 'Emergency Contacts | Parent Portal | CentreConnect',
  description: 'Manage emergency contacts used across your children and applications.',
}

export default async function ParentEmergencyContactsPage() {
  const perf = startRoutePerf('/parent/profile/emergency')
  const supabase = await createClient()
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data } = await supabase
      .from('parent_emergency_contacts')
      .select('id,full_name,phone,relationship,is_primary')
      .eq('parent_id', user.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false })

    return (
      <div className="space-y-6">
        <section className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Emergency Contact Hub</h1>
            <p className="mt-1 text-sm text-slate-600">Maintain trusted emergency contacts for quick, safe response when needed.</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/parent/profile">Back</Link>
          </Button>
        </section>
        <EmergencyContactsManager initialContacts={(data ?? []) as any} />
      </div>
    )
  } finally {
    logRoutePerf(perf)
  }
}
