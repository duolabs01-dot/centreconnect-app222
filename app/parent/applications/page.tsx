import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ApplicationsList } from './applications-list'
import { startRoutePerf, logRoutePerf } from '@/lib/perf/server-timing'
import { NextBestActionStrip } from '@/components/parent/next-best-action-strip'
import { cn } from '@/lib/utils'

type ParentApplicationsPageProps = {
  searchParams?: {
    childId?: string
  }
}

export const metadata: Metadata = {
  title: 'Application Journey | Parent Portal | CentreConnect',
  description: 'Track every child application, status update, and next step in one premium parent timeline.',
}

type ApplicationRow = {
  id: string
  child_id: string | null
  application_number: string
  status: string
  offer_made_at: string | null
  offer_accepted_at: string | null
  priority: number | null
  submitted_at: string
  ecd_centres:
    | {
        name: string
        slug: string
      }
    | Array<{
        name: string
        slug: string
      }>
    | null
  children:
    | {
        first_name: string
        last_name: string
      }
    | Array<{
        first_name: string
        last_name: string
      }>
    | null
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export default async function ParentApplicationsPage({ searchParams }: ParentApplicationsPageProps) {
  const perf = startRoutePerf('/parent/applications')
  const supabase = await createClient()
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const [applicationsResult, childrenResult] = await Promise.all([
      supabase
        .from('applications')
        .select('id,child_id,application_number,status,offer_made_at,offer_accepted_at,priority,submitted_at,ecd_centres(name,slug),children(first_name,last_name)')
        .eq('parent_id', user?.id ?? '')
        .order('submitted_at', { ascending: false })
        .limit(100),
      supabase
        .from('children')
        .select('id,first_name,last_name')
        .eq('parent_id', user?.id ?? ''),
    ])
    const data = applicationsResult.data
    const childrenData = childrenResult.data

    const hasChildren = (childrenData ?? []).length > 0;
    const hasApplications = (data ?? []).length > 0;

    const childNameById = new Map(
      (childrenData ?? []).map((child) => [
        child.id as string,
        `${child.first_name ?? ''} ${child.last_name ?? ''}`.trim() || 'Child profile',
      ])
    )

    const applications =
      (((data ?? []) as ApplicationRow[]) ?? []).map((application) => {
        const centre = normalizeOne(application.ecd_centres)
        const child = normalizeOne(application.children)
        const relationName = child ? `${child.first_name} ${child.last_name}`.trim() : ''
        const childName =
          relationName ||
          (application.child_id ? childNameById.get(application.child_id) : null) ||
          'Child profile'

        return {
          id: application.id,
          application_number: application.application_number,
          status: application.status,
          offer_made_at: application.offer_made_at,
          offer_accepted_at: application.offer_accepted_at,
          priority: application.priority,
          submitted_at: application.submitted_at,
          centreName: centre?.name ?? 'Unknown centre',
          centreSlug: centre?.slug ?? null,
        childName,
        childId: application.child_id,
      }
    }) ?? []

    const childCounts = new Map<string, number>()
    applications.forEach((application) => {
      if (!application.childId) return
      childCounts.set(application.childId, (childCounts.get(application.childId) ?? 0) + 1)
    })

    const childCards = (childrenData ?? []).map((child) => ({
      id: child.id as string,
      name: `${child.first_name ?? ''} ${child.last_name ?? ''}`.trim() || 'Child profile',
      count: childCounts.get(child.id as string) ?? 0,
    }))

    const selectedChildId = searchParams?.childId ?? (childCards[0]?.id ?? null)
    const filteredApplications = selectedChildId
      ? applications.filter((application) => application.childId === selectedChildId)
      : applications
    const activeChild = childCards.find((child) => child.id === selectedChildId) ?? null

    return (
      <div className="cc-page">
        <section>
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Application Journey</h1>
          <p className="mt-1 text-sm text-slate-600">Track each child, each status change, and your best next move from one clear timeline.</p>
        </section>

        {hasApplications ? (
          <>
            <section className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-cyan-50 px-5 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-600">
                  Auto-detected child
                </p>
                <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xl font-bold text-slate-900">
                    {activeChild ? activeChild.name : 'All children'}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" asChild>
                      <Link href="/directory">Apply to a centre</Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/parent/children">Manage children</Link>
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  We automatically read your saved child profiles and highlight the one you last viewed. Tap a child card below to swap contexts instantly.
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Children</h2>
                  <p className="text-xs text-muted-foreground">Auto-selected from your saved profiles.</p>
                </div>
                <p className="text-sm text-slate-500">
                  Showing {filteredApplications.length} application{filteredApplications.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                <Link
                  href="/parent/applications"
                  className={cn(
                    'rounded-2xl border px-4 py-3 text-sm font-medium transition',
                    !selectedChildId
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-500 shadow-[0_0_0_1px_rgba(6,182,212,0.45)]'
                      : 'border-border bg-white/70 text-slate-800 hover:border-cyan-500/60'
                  )}
                >
                  All children
                  <span className="block text-xs text-muted-foreground">{applications.length} total applications</span>
                </Link>
                {childCards.map((child) => (
                  <Link
                    key={child.id}
                    href={`/parent/applications?childId=${child.id}`}
                    className={cn(
                      'rounded-2xl border px-4 py-3 text-sm font-medium transition',
                      selectedChildId === child.id
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-500 shadow-[0_0_0_1px_rgba(6,182,212,0.45)]'
                        : 'border-border bg-white/70 text-slate-800 hover:border-cyan-500/60'
                    )}
                  >
                    {child.name}
                    <span className="block text-xs text-muted-foreground">
                      {child.count} application{child.count === 1 ? '' : 's'}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              {['submitted', 'pending_review', 'approved', 'provisioned', 'rejected'].map((status) => (
                <div key={status} className="rounded-2xl border border-border bg-white/90 p-4 text-sm text-foreground">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{status.replace('_', ' ')}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{filteredApplications.filter((a) => a.status === status).length}</p>
                </div>
              ))}
            </section>
            <section className="rounded-2xl border border-dashed border-cyan-500/30 bg-white/80 p-4 text-xs text-slate-500">
              Want to track multiple children faster? Have a child apply to multiple centres with the sticky apply bar at the bottom.
            </section>
            <NextBestActionStrip
              title="Keep momentum this week"
              hint="Parents who keep 2-3 active options usually place faster."
              actions={[
                { label: 'Find More Centres', href: '/directory' },
                { label: 'Add Child Profile', href: '/parent/children/new' },
                { label: 'Open Notifications', href: '/parent/notifications' },
              ]}
            />

            <section className="cc-section-block">
              <ApplicationsList applications={filteredApplications} />
            </section>
            <div className="sticky bottom-20 z-20 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur md:hidden">
              <Button size="lg" className="h-12 w-full" asChild>
                <Link href="/directory">Find More Centres</Link>
              </Button>
            </div>
          </>
        ) : hasChildren ? (
          // Parent has children but no applications
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <h2 className="text-lg font-semibold">No applications yet!</h2>
            <p className="mt-2 text-sm text-slate-600">
              You have child profiles, but no applications submitted for them. Start by finding a centre.
            </p>
            <div className="mt-4">
              <Button asChild>
                <Link href="/directory">Apply to a centre for {childCards[0]?.name ?? 'your child'}</Link>
              </Button>
            </div>
          </section>
        ) : (
          // Parent has no children and no applications
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <h2 className="text-lg font-semibold">No child profiles found yet.</h2>
            <p className="mt-2 text-sm text-slate-600">
              Start by adding a child profile, then you can apply to centres.
            </p>
            <div className="mt-4">
              <Button asChild>
                <Link href="/parent/children/new">Add a Child Profile</Link>
              </Button>
            </div>
          </section>
        )}
      </div>
    )
  } finally {
    logRoutePerf(perf)
  }
}
