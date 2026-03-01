import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { GuardiansManager, type GuardianChild } from '@/components/parent/GuardiansManager'
import { startRoutePerf, logRoutePerf } from '@/lib/perf/server-timing'

export const metadata: Metadata = {
  title: 'Co-Guardians | Parent Portal | CentreConnect',
  description: 'Invite and manage co-parents or guardians with controlled permissions.',
}

export default async function ParentGuardiansPage() {
  const perf = startRoutePerf('/parent/profile/guardians')
  const supabase = await createClient()
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: children } = await supabase
      .from('children')
      .select('id,first_name,last_name')
      .eq('parent_id', user.id)
      .order('created_at', { ascending: false })

    return (
      <div className="space-y-6">
        <section className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Co-Guardian Access</h1>
            <p className="mt-1 text-sm text-slate-600">Add reliable adults who can view updates and pick up your child.</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/parent/profile">Back</Link>
          </Button>
        </section>
        <GuardiansManager childList={(children ?? []) as GuardianChild[]} />
      </div>
    )
  } finally {
    logRoutePerf(perf)
  }
}
