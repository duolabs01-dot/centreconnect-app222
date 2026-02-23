import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { getJohannesburgGreeting } from '@/lib/utils'
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

    const [childrenCountResult, applicationsResult] = await Promise.all([
      supabase
        .from('children')
        .select('id', { count: 'exact', head: true }),
      supabase
        .from('applications')
        .select('status'),
    ])

    const applicationStatuses = (applicationsResult.data ?? []).map((row) => row.status)
    const childrenCount = childrenCountResult.count ?? 0
    const totalApplications = applicationStatuses.length
    const approvedApplications = applicationStatuses.filter((status) => status === 'approved' || status === 'enrolled').length
    const hasChildren = childrenCount > 0
    const hasApplications = totalApplications > 0
    const hasEnrolled = approvedApplications > 0

    return (
      <div className="cc-page">
        {!hasApplications ? (
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
            <Link
              href={hasChildren ? '/parent/children' : '/parent/children/new'}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              {hasChildren ? "Review your child's profile ->" : "Add your child's profile first ->"}
            </Link>
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
          </div>
        )}
      </div>
    )
  } finally {
    logRoutePerf(perf)
  }
}

