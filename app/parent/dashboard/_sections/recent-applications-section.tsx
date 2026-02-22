import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/src/components/ui/StatusBadge'
import { formatDate } from '@/lib/utils'

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export async function RecentApplicationsSection() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data } = await supabase
    .from('applications')
    .select('id,application_number,status,submitted_at,child_id,ecd_centres(name,slug),children(first_name,last_name)')
    .eq('parent_id', user?.id ?? '')
    .order('submitted_at', { ascending: false })
    .limit(6)

  const { data: childrenData } = await supabase
    .from('children')
    .select('id,first_name,last_name')
    .eq('parent_id', user?.id ?? '')

  const childNameById = new Map(
    (childrenData ?? []).map((child) => [
      child.id as string,
      `${child.first_name ?? ''} ${child.last_name ?? ''}`.trim() || 'Child profile',
    ])
  )

  const recentApplications =
    (data ?? []).map((application: any) => {
      const centre = normalizeOne(application.ecd_centres)
      const child = normalizeOne(application.children)
      const relationName = child ? `${child.first_name} ${child.last_name}`.trim() : ''
      return {
        id: application.id as string,
        applicationNumber: application.application_number as string,
        status: application.status as string,
        submittedAt: application.submitted_at as string,
        childName: relationName || childNameById.get(application.child_id as string) || 'Child profile',
        centreName: (centre?.name as string | undefined) ?? 'Unknown centre',
        centreSlug: (centre?.slug as string | undefined) ?? null,
      }
    }) ?? []

  return (
    <section id="applications" className="cc-glass-soft rounded-2xl p-4 sm:p-6">
      <h2 className="text-lg font-semibold">Recent applications</h2>
      <p className="mt-1 text-sm text-slate-600">Latest submissions and their current status.</p>
      <div className="mt-4 space-y-3">
        {recentApplications.length === 0 ? (
          <EmptyState title="No applications yet" description="Start by browsing active centres." actionLabel="Browse Centres" actionHref="/directory" />
        ) : (
          recentApplications.map((application) => (
            <div
              key={application.id}
              className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{application.childName}</p>
                <p className="text-xs text-slate-700">{application.centreName}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {application.applicationNumber} - {formatDate(application.submittedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={application.status} />
                {application.centreSlug ? (
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={`/centre/${application.centreSlug}`}>View centre</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
