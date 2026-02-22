import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { StatCard } from '@/src/components/ui/StatCard'
import { getJohannesburgGreeting } from '@/lib/utils'
import { startRoutePerf, logRoutePerf } from '@/lib/perf/server-timing'
import { ActivityFeedSection } from './_sections/activity-feed-section'
import { SuggestedCentresSection } from './_sections/suggested-centres-section'
import { RecentApplicationsSection } from './_sections/recent-applications-section'
import { Sparkles, ShieldCheck, Clock3, Rocket, BellRing } from 'lucide-react'

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
    const totalApplications = applicationStatuses.length
    const pendingApplications = applicationStatuses.filter((status) => status === 'submitted' || status === 'in_review').length
    const approvedApplications = applicationStatuses.filter((status) => status === 'approved' || status === 'enrolled').length

    const stats = [
      { label: 'Children', value: childrenCountResult.count ?? 0, helper: 'Profiles added' },
      { label: 'Applications', value: totalApplications, helper: 'Submitted total' },
      { label: 'Pending', value: pendingApplications, helper: 'Awaiting review' },
      { label: 'Approved', value: approvedApplications, helper: 'Accepted and enrolled' },
    ]

    return (
      <div className="cc-page">
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.1)] sm:p-7">
          <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-cyan-200/30 blur-3xl" aria-hidden />
          <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-blue-200/30 blur-3xl" aria-hidden />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/90 px-3 py-1 text-xs font-semibold text-cyan-800">
              <Sparkles className="h-3.5 w-3.5" />
              Parent Home
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-3xl">Welcome back, {parentName}</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              {greeting}. This is your parent command centre for applications, alerts, and placement momentum.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white/90 p-3">
                <div className="flex items-center gap-2 text-slate-900">
                  <Clock3 className="h-4 w-4 text-blue-600" />
                  <p className="text-xs font-semibold uppercase tracking-[0.08em]">Faster Decisions</p>
                </div>
                <p className="mt-1 text-xs text-slate-600">Keep documents complete and avoid stalled applications.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/90 p-3">
                <div className="flex items-center gap-2 text-slate-900">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <p className="text-xs font-semibold uppercase tracking-[0.08em]">Trusted Centres</p>
                </div>
                <p className="mt-1 text-xs text-slate-600">Compare centres by fit, affordability, and confidence signals.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/90 p-3">
                <div className="flex items-center gap-2 text-slate-900">
                  <Rocket className="h-4 w-4 text-violet-600" />
                  <p className="text-xs font-semibold uppercase tracking-[0.08em]">Placement Momentum</p>
                </div>
                <p className="mt-1 text-xs text-slate-600">Aim for multiple live applications to reduce wait risk.</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/directory">Browse Centres</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/parent/applications">Track Applications</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} title={stat.label} value={stat.value} helper={stat.helper} />
          ))}
        </section>

        <section className="cc-glass-soft rounded-2xl p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Priority Actions</h2>
              <p className="mt-1 text-sm text-slate-600">Complete these first to keep every application moving forward.</p>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800 sm:inline-flex">
              <BellRing className="h-3.5 w-3.5" />
              Action queue
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Button size="lg" className="h-12 w-full justify-start bg-blue-600 px-4 text-left hover:bg-blue-500" asChild>
              <Link href="/directory">Find a Centre</Link>
            </Button>
            <Button size="lg" className="h-12 w-full justify-start bg-emerald-600 px-4 text-left hover:bg-emerald-500" asChild>
              <Link href="/parent/children/new">Add Child</Link>
            </Button>
            <Button variant="outline" size="lg" className="h-12 w-full justify-start border-orange-200 bg-orange-50 px-4 text-left text-orange-900 hover:bg-orange-100" asChild>
              <Link href="/parent/applications">Track Applications</Link>
            </Button>
            <Button variant="outline" size="lg" className="h-12 w-full justify-start border-violet-200 bg-violet-50 px-4 text-left text-violet-900 hover:bg-violet-100" asChild>
              <Link href="/parent/profile">Complete Profile</Link>
            </Button>
          </div>
        </section>

        <Suspense fallback={<SectionFallback title="Activity feed" />}>
          <ActivityFeedSection />
        </Suspense>

        <Suspense fallback={<SectionFallback title="Suggested centres" />}>
          <SuggestedCentresSection />
        </Suspense>

        <Suspense fallback={<SectionFallback title="Recent applications" />}>
          <RecentApplicationsSection />
        </Suspense>
      </div>
    )
  } finally {
    logRoutePerf(perf)
  }
}
