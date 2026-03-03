import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'

export async function ActivityFeedSection() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('application_status_history')
    .select(
      `
      id,
      created_at,
      new_status,
      applications!inner (
        parent_id,
        ecd_centres(name,slug),
        children(first_name,last_name)
      )
    `
    )
    .order('created_at', { ascending: false })
    .limit(8)

  const activities =
    (data ?? []).map((activity: any) => {
      const application = Array.isArray(activity.applications)
        ? activity.applications[0]
        : activity.applications
      const centre = Array.isArray(application?.ecd_centres)
        ? application.ecd_centres[0]
        : application?.ecd_centres
      const child = Array.isArray(application?.children)
        ? application.children[0]
        : application?.children

      return {
        id: activity.id as string,
        createdAt: activity.created_at as string,
        newStatus: (activity.new_status as string | null) ?? 'submitted',
        centreName: (centre?.name as string | undefined) ?? 'Unknown crèche',
        centreSlug: (centre?.slug as string | undefined) ?? null,
        childFirstName: (child?.first_name as string | undefined) ?? 'A child',
        childLastName: (child?.last_name as string | undefined) ?? '',
      }
    }) ?? []

  return (
    <section className="glass-card rounded-2xl p-4 sm:p-6">
      <h2 className="text-lg font-semibold">Activity feed</h2>
      <p className="mt-1 text-sm text-slate-600">Recent updates on your applications.</p>
      <div className="mt-4 space-y-4">
        {activities.length === 0 ? (
          <EmptyState title="No recent activity" description="No recent activity yet." />
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex gap-4 rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                {activity.newStatus === 'approved' ? 'OK' : 'UPD'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">
                  {activity.childFirstName}
                  {activity.childLastName ? ` ${activity.childLastName}` : ''}&apos;s application to{' '}
                  {activity.centreSlug ? (
                    <Link
                      href={`/c/${activity.centreSlug}`}
                      className="underline decoration-slate-300 underline-offset-2"
                    >
                      {activity.centreName}
                    </Link>
                  ) : (
                    activity.centreName
                  )}
                </p>
                <p className="text-sm text-slate-600">Status changed to {activity.newStatus}</p>
                <p className="text-xs text-slate-500">{formatDate(activity.createdAt)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}


