import type { Metadata } from 'next'
import Link from 'next/link'
import { Compass, Map as MapIcon } from 'lucide-react'
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
  ecd_id: string | null
  child_id: string | null
  application_number: string
  status: string
  offer_made_at: string | null
  offer_accepted_at: string | null
  priority: number | null
  submitted_at: string
  updated_at: string | null
  ecd_centres:
    | {
        name: string
        slug: string
        logo_url: string | null
      }
    | Array<{
        name: string
        slug: string
        logo_url: string | null
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
  application_status_history:
    | Array<{
        new_status: string
        created_at: string
        notes: string | null
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
        .select('id,ecd_id,child_id,application_number,status,offer_made_at,offer_accepted_at,priority,submitted_at,updated_at,ecd_centres(name,slug,logo_url),children(first_name,last_name),application_status_history(new_status,created_at,notes)')
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

    const hasApplications = (data ?? []).length > 0

    const childNameById = new Map(
      (childrenData ?? []).map((child) => [
        child.id as string,
        `${child.first_name ?? ''} ${child.last_name ?? ''}`.trim() || 'Child profile',
      ])
    )

    const applicationRows = (((data ?? []) as ApplicationRow[]) ?? [])
    const missingCentreIds = Array.from(
      new Set(
        applicationRows
          .filter((application) => !normalizeOne(application.ecd_centres)?.name && application.ecd_id)
          .map((application) => application.ecd_id as string)
      )
    )
    const fallbackCentresById = new Map<string, { name: string; slug: string | null; logoUrl: string | null }>()

    if (missingCentreIds.length > 0) {
      const { data: fallbackCentres } = await supabase
        .from('public_ecd_centres')
        .select('id,name,slug,logo_url')
        .in('id', missingCentreIds)

      ;(fallbackCentres ?? []).forEach((centre) => {
        fallbackCentresById.set(centre.id as string, {
          name: (centre.name as string | undefined) ?? 'Centre details pending',
          slug: (centre.slug as string | null | undefined) ?? null,
          logoUrl: (centre.logo_url as string | null | undefined) ?? null,
        })
      })
    }

    const applications =
      applicationRows.map((application) => {
        const centre = normalizeOne(application.ecd_centres)
        const fallbackCentre = application.ecd_id ? fallbackCentresById.get(application.ecd_id) : null
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
          updated_at: application.updated_at,
          centreName: centre?.name ?? fallbackCentre?.name ?? 'Centre details pending',
          centreSlug: centre?.slug ?? fallbackCentre?.slug ?? null,
          centreLogoUrl: centre?.logo_url ?? fallbackCentre?.logoUrl ?? null,
          childName,
          childId: application.child_id,
          history:
            [...(application.application_status_history ?? [])]
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              .map((item) => ({
                status: item.new_status,
                created_at: item.created_at,
                notes: item.notes ?? undefined,
              })) ?? [],
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
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-cyan-50 px-5 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-600">
                  Focused Child
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
                  You are currently viewing this child&apos;s journey. Tap any child below to switch your timeline.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Children</h2>
                  <p className="text-xs text-muted-foreground">Choose a child to focus this journey.</p>
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
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-500 shadow-[var(--shadow-elevation-1)]'
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
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-500 shadow-[var(--shadow-elevation-1)]'
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

            <section className="rounded-2xl border border-dashed border-cyan-500/30 bg-white/80 p-4 text-xs text-slate-500">
              Need more options? Apply to more centres and keep every response in one place.
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

            <div className="md:hidden">
              <Button size="lg" className="h-12 w-full" asChild>
                <Link href="/directory">Find More Centres</Link>
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-gradient-to-br from-cyan-50 to-sky-50 border border-cyan-100 py-10 text-center px-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-[var(--shadow-elevation-1)]">
                <MapIcon className="h-8 w-8 text-cyan-500" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">Your journey starts here</p>
                <p className="mt-1 text-sm text-slate-500 max-w-xs mx-auto">
                  Apply to centres and every response, update, and decision will appear here in one place.
                </p>
              </div>
              <Button asChild>
                <Link href="/directory">
                  <Compass className="mr-2 h-4 w-4" />
                  Find a Centre
                </Link>
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
                Preview - how your applications will look
              </p>
              {[
                { centre: 'Sunshine ECD Alexandra', child: 'Amara, 3 yrs', date: 'Applied today', status: 'submitted' },
                { centre: 'Bright Minds Marlboro', child: 'Amara, 3 yrs', date: 'Applied yesterday', status: 'in_review' },
              ].map((mock) => (
                <div
                  key={mock.centre}
                  className="pointer-events-none select-none rounded-2xl border border-slate-200 bg-white p-4 opacity-40"
                  aria-hidden="true"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{mock.centre}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{mock.child} | {mock.date}</p>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      Pending
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  } finally {
    logRoutePerf(perf)
  }
}



