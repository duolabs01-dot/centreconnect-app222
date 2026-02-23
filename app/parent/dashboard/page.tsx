import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDate, getJohannesburgGreeting } from '@/lib/utils'
import { startRoutePerf, logRoutePerf } from '@/lib/perf/server-timing'
import { ActivityFeedSection } from './_sections/activity-feed-section'
import { RecentApplicationsSection } from './_sections/recent-applications-section'
import { Compass, Sparkles, ShieldCheck, ChevronRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Parent Command Centre | CentreConnect',
  description: 'Your premium parent hub for children, applications, alerts, and next best actions.',
  openGraph: {
    images: ['/og-image.png'],
  },
}

function SectionFallback({ title }: { title: string }) {
  return (
    <section className="cc-glass-soft mt-6 rounded-2xl p-4 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 h-24 animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
    </section>
  )
}

export default async function ParentDashboardPage() {
  const perf = startRoutePerf('/parent/dashboard')
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', user?.id ?? '')
      .maybeSingle()
    const parentName = profileData?.full_name?.trim() || 'Parent'
    const greeting = getJohannesburgGreeting()

    const [childrenCountResult, applicationsResult, jobsResult] = await Promise.all([
      supabase
        .from('children')
        .select('id', { count: 'exact', head: true }),
      supabase
        .from('applications')
        .select('status'),
      supabase
        .from('jobs')
        .select('id, title, role_type, closes_at, ecd_centres(name, suburb, city, slug)')
        .eq('is_published', true)
        .limit(4),
    ])

    const applicationStatuses = (applicationsResult.data ?? []).map((row) => row.status)
    const childrenCount = childrenCountResult.count ?? 0
    const jobs = jobsResult.data ?? []
    const totalApplications = applicationStatuses.length
    const approvedApplications = applicationStatuses.filter((status) => status === 'approved' || status === 'enrolled').length
    const hasChildren = childrenCount > 0
    const hasApplications = totalApplications > 0
    const hasEnrolled = approvedApplications > 0
    const jobsSection = jobs.length > 0 ? (
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            Jobs at Centres
          </h2>
          <Link
            href="/directory"
            className="text-xs text-cyan-600 font-semibold"
          >
            View all
          </Link>
        </div>
        <div className="space-y-2">
          {jobs.map((job) => {
            const centre = Array.isArray(job.ecd_centres)
              ? job.ecd_centres[0]
              : job.ecd_centres

            return (
              <Link
                key={job.id}
                href={centre?.slug ? `/c/${centre.slug}/jobs/${job.id}` : '/directory'}
                className="group block rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-cyan-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {job.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {centre?.name}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-cyan-200 bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-700">
                    Details
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    {String(job.role_type ?? '').replace(/_/g, ' ') || 'Role'}
                  </span>
                  {[centre?.suburb, centre?.city].filter(Boolean).length > 0 ? (
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-500">
                      {[centre?.suburb, centre?.city].filter(Boolean).join(', ')}
                    </span>
                  ) : null}
                  {job.closes_at ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                      Closes {formatDate(job.closes_at)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-xs font-semibold text-cyan-700 transition-colors group-hover:text-cyan-800">
                  Open full role details and apply -&gt;
                </p>
              </Link>
            )
          })}
        </div>
      </section>
    ) : null

    return (
      <div className="cc-page">
        {!hasApplications ? (
          <div className="space-y-8">
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 gap-6">
              <div className="w-20 h-20 rounded-full bg-cyan-50 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-cyan-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  Welcome, {parentName}
                </h1>
                <p className="text-slate-500 text-base max-w-sm mx-auto leading-relaxed">
                  Let&apos;s find the perfect ECD centre for your child.
                  It takes less than 5 minutes to apply.
                </p>
              </div>
              <Link
                href="/directory"
                className="inline-flex items-center gap-2 bg-cyan-600 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-cyan-700 transition-colors shadow-lg shadow-cyan-200 text-base"
              >
                <Compass className="w-5 h-5" />
                Find a Centre
              </Link>
              <div className="w-full max-w-sm space-y-3 mt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">
                  What parents use CentreConnect for
                </p>
                {[
                  { icon: '', text: 'Find verified ECD centres nearby' },
                  { icon: '', text: 'Apply to multiple centres at once' },
                  { icon: '', text: 'Track application status in real time' },
                  { icon: '', text: 'Communicate directly with centres' },
                  { icon: '', text: 'Store all documents in one place' },
                ].map((item) => (
                  <div
                    key={item.text}
                    className="flex items-center gap-3 text-left"
                  >
                    <span className="text-xl">{item.icon}</span>
                    <p className="text-sm text-slate-600">{item.text}</p>
                  </div>
                ))}
              </div>
              <Link
                href={hasChildren ? '/parent/children' : '/parent/children/new'}
                className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                {hasChildren ? "Review your child's profile ->" : "Add your child's profile first ->"}
              </Link>
            </div>
            {jobsSection}
          </div>
        ) : hasApplications && !hasEnrolled ? (
          <div className="space-y-4">
            <div className="px-1">
              <p className="text-sm font-medium text-slate-500">
                {greeting}, {parentName}
              </p>
              <h1 className="text-xl font-bold text-slate-900 mt-0.5">
                Your Application Journey
              </h1>
            </div>

            <Suspense fallback={<SectionFallback title="Applications" />}>
              <RecentApplicationsSection />
            </Suspense>

            <div className="pt-2">
              <Link
                href="/directory"
                className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-cyan-50 hover:border-cyan-200 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Compass className="w-5 h-5 text-slate-400 group-hover:text-cyan-500" />
                  <span className="text-sm font-semibold text-slate-600 group-hover:text-cyan-700">
                    Discover more centres
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
            {jobsSection}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-5 text-white">
              <div className="flex items-center gap-3 mb-1">
                <ShieldCheck className="w-5 h-5 text-cyan-200" />
                <p className="text-cyan-100 text-xs font-semibold uppercase tracking-wider">
                  All Good
                </p>
              </div>
              <p className="text-lg font-bold">
                Your child is in good hands
              </p>
              <p className="text-cyan-100 text-sm mt-1">
                Enrolled and learning today
              </p>
            </div>

            <Suspense fallback={<SectionFallback title="Activity" />}>
              <ActivityFeedSection />
            </Suspense>

            <Suspense fallback={<SectionFallback title="Applications" />}>
              <RecentApplicationsSection />
            </Suspense>
            {jobsSection}
          </div>
        )}
      </div>
    )
  } finally {
    logRoutePerf(perf)
  }
}

