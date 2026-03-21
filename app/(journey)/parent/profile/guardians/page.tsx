import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { GuardiansManager, type GuardianChild } from '@/components/parent/GuardiansManager'
import { startRoutePerf, logRoutePerf } from '@/lib/perf/server-timing'
import { ArrowLeft, Users } from 'lucide-react'

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

    const { data: ownChildren } = await supabase
      .from('children')
      .select('id,first_name,last_name')
      .eq('parent_id', user.id)
      .order('created_at', { ascending: false })

    const { data: linkedGuardianRows } = await supabase
      .from('guardians')
      .select('child_id')
      .eq('linked_user_id', user.id)
      .limit(100)

    const linkedChildIds = Array.from(
      new Set((linkedGuardianRows ?? []).map((row: any) => row.child_id).filter(Boolean))
    )

    let linkedChildren: GuardianChild[] = []
    if (linkedChildIds.length > 0) {
      try {
        const admin = createAdminClient()
        const { data: linkedChildrenRows } = await admin
          .from('children')
          .select('id,first_name,last_name')
          .in('id', linkedChildIds)
        linkedChildren = ((linkedChildrenRows ?? []) as GuardianChild[]).filter(Boolean)
      } catch {
        linkedChildren = []
      }
    }

    const childList = Array.from(
      new Map(
        [...((ownChildren ?? []) as GuardianChild[]), ...linkedChildren].map((child) => [child.id, child])
      ).values()
    )

    return (
      <div className="bg-surface-secondary px-4 pt-4 pb-28 min-h-screen space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600 mb-1 flex items-center gap-2">
              <Users className="h-3 w-3" />
              Family Architecture
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Co-Guardian Access</h1>
            <p className="mt-1 text-sm text-slate-500 font-medium">Invite trusted adults to help manage child profiles.</p>
          </div>
          <Button variant="outline" className="hidden h-11 rounded-2xl font-bold md:inline-flex" asChild>
            <Link href="/parent/profile">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
        </header>

        <div className="max-w-4xl">
          <GuardiansManager childList={childList} />
        </div>
      </div>
    )
  } finally {
    logRoutePerf(perf)
  }
}

