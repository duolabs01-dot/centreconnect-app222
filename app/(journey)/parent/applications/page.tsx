import type { Metadata } from 'next'
import Link from 'next/link'
import { Compass, Map as MapIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { ApplicationsList } from './applications-list'
import { startRoutePerf, logRoutePerf } from '@/lib/perf/server-timing'
import { cn } from '@/lib/utils'
import { SurfaceCard } from '@/components/ui/surface-card'

type ParentApplicationsPageProps = {
  searchParams?: Promise<{
    childId?: string
  }>
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
  missing_documents: unknown
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
        suburb: string | null
        city: string | null
      }
    | Array<{
        name: string
        slug: string
        logo_url: string | null
        suburb: string | null
        city: string | null
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

function normalizeMissingDocuments(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((entry) => String(entry).trim()).filter(Boolean)
}

export default async function ParentApplicationsPage({ searchParams }: ParentApplicationsPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams)
  const perf = startRoutePerf('/parent/applications')
  const supabase = await createClient()
  const admin = createAdminClient()
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const [applicationsResult, childrenResult] = await Promise.all([
      supabase
        .from('applications')
        .select('id,ecd_id,child_id,application_number,status,missing_documents,offer_made_at,offer_accepted_at,priority,submitted_at,updated_at,ecd_centres(name,slug,logo_url,suburb,city),children(first_name,last_name),application_status_history(new_status,created_at,notes)')
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
    const fallbackCentresById = new Map<
      string,
      { name: string; slug: string | null; logoUrl: string | null; suburb: string | null; city: string | null }
    >()

    if (missingCentreIds.length > 0) {
      const { data: fallbackCentres } = await admin
        .from('public_ecd_centres')
        .select('id,name,slug,logo_url,suburb,city')
        .in('id', missingCentreIds)

      ;(fallbackCentres ?? []).forEach((centre) => {
        fallbackCentresById.set(centre.id as string, {
          name: (centre.name as string | undefined) ?? 'Crèche details pending',
          slug: (centre.slug as string | null | undefined) ?? null,
          logoUrl: (centre.logo_url as string | null | undefined) ?? null,
          suburb: (centre.suburb as string | null | undefined) ?? null,
          city: (centre.city as string | null | undefined) ?? null,
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
          centreName: centre?.name ?? fallbackCentre?.name ?? 'Crèche details pending',
          centreSlug: centre?.slug ?? fallbackCentre?.slug ?? null,
          centreLogoUrl: centre?.logo_url ?? fallbackCentre?.logoUrl ?? null,
          centreLocation:
            [centre?.suburb ?? fallbackCentre?.suburb ?? null, centre?.city ?? fallbackCentre?.city ?? null]
              .filter(Boolean)
              .join(', ') || 'Location pending',
          childName,
          childId: application.child_id,
          missingDocuments: normalizeMissingDocuments(application.missing_documents),
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

    const selectedChildId = resolvedSearchParams?.childId ?? (childCards[0]?.id ?? null)
    const filteredApplications = selectedChildId
      ? applications.filter((application) => application.childId === selectedChildId)
      : applications
    const activeChild = childCards.find((child) => child.id === selectedChildId) ?? null

    return (
      <div className="bg-surface-secondary px-4 pt-4 min-h-screen">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Your journey</h1>
          <p className="mt-1 text-sm text-slate-600">Track each child, every status change, and your best next move from one clear timeline.</p>
        </header>

        {hasApplications ? (
          <div className="space-y-6">
            <SurfaceCard className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-600">
                Focused Child
              </p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xl font-bold text-slate-900">
                  {activeChild ? activeChild.name : 'All children'}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" className="min-h-[44px]" asChild>
                    <Link href="/directory">Apply to a crèche</Link>
                  </Button>
                  <Button size="sm" variant="outline" className="min-h-[44px]" asChild>
                    <Link href="/parent/children">Manage children</Link>
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                You are currently viewing this child&apos;s journey. Tap any child below to switch your timeline.
              </p>
            </SurfaceCard>

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Focus</h2>
                <p className="text-xs text-muted-foreground">Choose whose journey to view.</p>
              </div>
              <p className="text-sm text-slate-500">
                Showing {filteredApplications.length} application{filteredApplications.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              <Link
                href="/parent/applications"
                className="group block h-full"
              >
                <SurfaceCard
                  className={cn(
                    'p-4 transition-all duration-200 h-full',
                    !selectedChildId
                      ? 'ring-2 ring-cyan-500 bg-cyan-50/10'
                      : 'hover:ring-1 hover:ring-cyan-500/30'
                  )}
                >
                  <p className="text-sm font-bold text-slate-900">All children</p>
                  <p className="text-xs text-slate-500 mt-1">{applications.length} total applications</p>
                </SurfaceCard>
              </Link>
              {childCards.map((child) => (
                <Link
                  key={child.id}
                  href={`/parent/applications?childId=${child.id}`}
                  className="group block h-full"
                >
                  <SurfaceCard
                    className={cn(
                      'p-4 transition-all duration-200 h-full',
                      selectedChildId === child.id
                        ? 'ring-2 ring-cyan-500 bg-cyan-50/10'
                        : 'hover:ring-1 hover:ring-cyan-500/30'
                    )}
                  >
                    <p className="text-sm font-bold text-slate-900">{child.name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {child.count} application{child.count === 1 ? '' : 's'}
                    </p>
                  </SurfaceCard>
                </Link>
              ))}
            </div>

            <SurfaceCard variant="outlined" className="p-4 text-xs text-slate-500 border-dashed border-cyan-500/30">
              Need more options? Apply to more crèches and keep every response in one place.
            </SurfaceCard>

            <section className="cc-section-block">
              <ApplicationsList applications={filteredApplications} parentId={user?.id ?? ''} />
            </section>

            <div className="md:hidden">
              <Button size="lg" className="h-12 w-full min-h-[44px]" asChild>
                <Link href="/directory">Find More Crèches</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <SurfaceCard className="flex flex-col items-center justify-center gap-4 py-12 text-center px-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-secondary shadow-card">
                <MapIcon className="h-8 w-8 text-cyan-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">Your journey starts here</p>
                <p className="mt-1 text-sm text-slate-500 max-w-xs mx-auto">
                  Apply to crèches and every response, update, and decision will appear here in one place.
                </p>
              </div>
              <Button asChild className="min-h-[44px] px-8">
                <Link href="/directory">
                  <Compass className="mr-2 h-4 w-4" />
                  Find a Crèche
                </Link>
              </Button>
            </SurfaceCard>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
                Preview - how your applications will look
              </p>
              {[
                { centre: 'Sunshine ECD Alexandra', child: 'Amara, 3 yrs', date: 'Applied today', status: 'submitted' },
                { centre: 'Bright Minds Marlboro', child: 'Amara, 3 yrs', date: 'Applied yesterday', status: 'in_review' },
              ].map((mock) => (
                <SurfaceCard
                  key={mock.centre}
                  className="pointer-events-none select-none p-4 opacity-40 grayscale"
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
                </SurfaceCard>
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



