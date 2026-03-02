import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { EmergencyContactsManager } from '@/components/parent/EmergencyContactsManager'
import { startRoutePerf, logRoutePerf } from '@/lib/perf/server-timing'
import { ArrowLeft, ShieldAlert } from 'lucide-react'

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
      <div className="bg-surface-secondary px-4 pt-4 pb-28 min-h-screen space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600 mb-1 flex items-center gap-2">
              <ShieldAlert className="h-3 w-3" />
              Safety Protocol
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Emergency Hub</h1>
            <p className="mt-1 text-sm text-slate-500 font-medium">Maintain trusted contacts for rapid response.</p>
          </div>
          <Button variant="outline" className="rounded-xl font-bold h-11 self-start sm:self-auto" asChild>
            <Link href="/parent/profile">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
        </header>

        <div className="max-w-4xl">
          <EmergencyContactsManager initialContacts={(data ?? []) as any} />
        </div>
      </div>
    )
  } finally {
    logRoutePerf(perf)
  }
}
