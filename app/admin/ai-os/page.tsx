import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { FounderAdvisorPage } from '@/components/admin/founder-advisor-page'
import type { RecentRun } from '@/components/admin/founder-advisor-page'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Founder Advisor | Platform Admin',
  description: 'AI Chief of Staff — ranked analysis and draft recommendations for your review.',
}

export default async function AdminFounderAdvisorPage() {
  const identity = await requirePlatformAdmin()
  if (!identity) redirect('/login')

  const admin = createAdminClient()

  // Scope history to Founder Advisor runs only (agent_name = 'advisor').
  // Query agent_tasks first to get the run_ids for advisor tasks, then fetch
  // the matching agent_runs. This ensures system/future agent types never appear
  // in the Founder Advisor history even when other agent names are added.
  // Wrapped in try/catch so the page renders even if the migration hasn't been applied yet.
  let recentRuns: RecentRun[] = []

  try {
    const { data: advisorTasks } = await admin
      .from('agent_tasks')
      .select('run_id')
      .eq('agent_name', 'advisor')
      .order('created_at', { ascending: false })
      .limit(10)

    if (advisorTasks && advisorTasks.length > 0) {
      const runIds = advisorTasks.map((t) => t.run_id as string)
      const { data: rawRuns } = await admin
        .from('agent_runs')
        .select('id, status, input, summary, created_at')
        .in('id', runIds)
        .order('created_at', { ascending: false })

      recentRuns = (rawRuns ?? []) as RecentRun[]
    }
  } catch {
    // Agent system tables not yet migrated — render empty history gracefully.
  }

  return <FounderAdvisorPage recentRuns={recentRuns} />
}
