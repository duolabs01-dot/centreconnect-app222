import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  CheckCircle2,
  CloudRain,
  Frown,
  Info,
  Laugh,
  Moon,
  Search,
  Smile,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, getJohannesburgNowParts } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Daily Reports - CentreConnect',
  description: "View your children's daily updates from their creche.",
}

const MOOD_MAP: Record<string, { label: string; icon: typeof Smile; color: string }> = {
  happy: { label: 'Happy', icon: Laugh, color: 'text-amber-500' },
  good: { label: 'Good', icon: Smile, color: 'text-emerald-500' },
  tired: { label: 'Tired', icon: Moon, color: 'text-slate-500' },
  unsettled: { label: 'Unsettled', icon: CloudRain, color: 'text-blue-500' },
  upset: { label: 'Upset', icon: Frown, color: 'text-rose-500' },
}

const REPORT_TABS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'all', label: 'All' },
] as const

type ReportTab = (typeof REPORT_TABS)[number]['key']

type ChildRow = {
  id: string
  first_name: string | null
  last_name: string | null
}

type ApplicationRow = {
  child_id: string | null
  children: ChildRow | ChildRow[] | null
}

type DailyReportRow = {
  id: string
  child_id: string
  report_date: string
  breakfast_eaten: string | null
  lunch_eaten: string | null
  snack_eaten: string | null
  nap_start: string | null
  nap_end: string | null
  mood: string | null
  activities: string[] | null
  teacher_notes: string | null
  photo_url: string | null
  published_at: string | null
}

type ParentDailyReportsPageProps = {
  searchParams?: {
    tab?: string
    q?: string
  }
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function normalizeTab(input: string | undefined): ReportTab {
  if (input === 'week' || input === 'all' || input === 'today') return input
  return 'today'
}

function formatReportDate(dateValue: string) {
  return new Date(`${dateValue}T00:00:00Z`).toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function formatMealValue(value: string | null | undefined) {
  if (!value) return 'N/A'
  return value.replaceAll('_', ' ')
}

function isMealDone(value: string | null | undefined) {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized !== 'none' && normalized !== 'not served' && normalized !== 'n/a'
}

function filterReportsByTab(reports: DailyReportRow[], tab: ReportTab, todayDate: string, weekStartDate: string) {
  if (tab === 'today') return reports.filter((report) => report.report_date === todayDate)
  if (tab === 'week') return reports.filter((report) => report.report_date >= weekStartDate && report.report_date <= todayDate)
  return reports
}

function buildTabHref(tab: ReportTab, query: string) {
  const params = new URLSearchParams()
  params.set('tab', tab)
  if (query.trim()) params.set('q', query.trim())
  return `/parent/daily-reports?${params.toString()}`
}

export default async function ParentDailyReportsPage({ searchParams }: ParentDailyReportsPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const activeTab = normalizeTab(searchParams?.tab)
  const searchQuery = (searchParams?.q ?? '').trim()
  const normalizedSearch = searchQuery.toLowerCase()

  const { year, month, day } = getJohannesburgNowParts()
  const todayDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const todayUtc = new Date(Date.UTC(year, month - 1, day))
  const weekStart = new Date(todayUtc)
  weekStart.setUTCDate(todayUtc.getUTCDate() - 6)
  const weekStartDate = weekStart.toISOString().slice(0, 10)
  const ninetyDaysAgo = new Date(todayUtc)
  ninetyDaysAgo.setUTCDate(todayUtc.getUTCDate() - 89)
  const reportsStartDate = ninetyDaysAgo.toISOString().slice(0, 10)

  const { data: applications } = await supabase
    .from('applications')
    .select('child_id,children(id,first_name,last_name)')
    .eq('parent_id', user.id)
    .eq('status', 'enrolled')

  const childRows = (applications ?? []) as ApplicationRow[]
  const seenChildIds = new Set<string>()
  const children = childRows.flatMap((row: any) => {
    const child = normalizeOne(row.children)
    const childId = child?.id ?? row.child_id
    if (!childId || seenChildIds.has(childId)) return []
    seenChildIds.add(childId)
    return [
      {
        id: childId,
        first_name: child?.first_name?.trim() || 'Child',
        last_name: child?.last_name?.trim() || '',
      },
    ]
  })

  if (children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Info className="mb-4 h-12 w-12 text-slate-300" />
        <h2 className="text-lg font-bold text-slate-900">No enrolled children</h2>
        <p className="mt-1 text-sm text-slate-500">Daily reports are available once enrollment is active.</p>
      </div>
    )
  }

  const childIds = children.map((child) => child.id)
  const { data: reportsRaw } = await supabase
    .from('child_daily_reports')
    .select(
      'id,child_id,report_date,breakfast_eaten,lunch_eaten,snack_eaten,nap_start,nap_end,mood,activities,teacher_notes,photo_url,published_at'
    )
    .in('child_id', childIds)
    .gte('report_date', reportsStartDate)
    .lte('report_date', todayDate)
    .not('published_at', 'is', null)
    .order('report_date', { ascending: false })
    .order('published_at', { ascending: false })

  const reports = (reportsRaw ?? []) as DailyReportRow[]
  const reportsByChild = new Map<string, DailyReportRow[]>()
  for (const report of reports) {
    const list = reportsByChild.get(report.child_id) ?? []
    list.push(report)
    reportsByChild.set(report.child_id, list)
  }

  const cards = children
    .map((child) => {
      const name = `${child.first_name} ${child.last_name}`.trim()
      const allReports = reportsByChild.get(child.id) ?? []
      const tabReports = filterReportsByTab(allReports, activeTab, todayDate, weekStartDate)
      const todayReport = allReports.find((report) => report.report_date === todayDate) ?? null
      const latestReport = allReports[0] ?? null

      return {
        child,
        name,
        allReports,
        tabReports,
        todayReport,
        latestReport,
      }
    })
    .filter((entry) => {
      if (!normalizedSearch) return true
      return entry.name.toLowerCase().includes(normalizedSearch)
    })
    .sort((a, b) => {
      if (a.todayReport && !b.todayReport) return -1
      if (!a.todayReport && b.todayReport) return 1
      return a.name.localeCompare(b.name)
    })

  const visibleReports = cards.flatMap((card) => card.tabReports)
  const childrenWithTodayReport = cards.filter((card) => Boolean(card.todayReport)).length
  const mealCompletedCount = visibleReports.filter(
    (report) => isMealDone(report.breakfast_eaten) && isMealDone(report.lunch_eaten) && isMealDone(report.snack_eaten)
  ).length
  const mealCompletionRate = visibleReports.length > 0 ? Math.round((mealCompletedCount / visibleReports.length) * 100) : 0
  const moodCounts = visibleReports.reduce<Record<string, number>>((acc, report) => {
    const mood = (report.mood ?? '').trim().toLowerCase()
    if (!mood) return acc
    acc[mood] = (acc[mood] ?? 0) + 1
    return acc
  }, {})
  const topMoodEntry = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]
  const topMoodLabel = topMoodEntry ? (MOOD_MAP[topMoodEntry[0]]?.label ?? topMoodEntry[0]) : 'No mood trend yet'

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Daily Reports</h1>
        <p className="text-sm text-slate-500">Smart overview for today, this week, or all published updates.</p>
      </header>

      <Card className="rounded-3xl border-teal-200 bg-teal-50/70 shadow-[var(--shadow-elevation-1)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-black uppercase tracking-[0.14em] text-teal-700">AI Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p>
            {childrenWithTodayReport} of {cards.length} children have a report today. Current top mood trend:{' '}
            <span className="font-bold text-slate-900">{topMoodLabel}</span>.
          </p>
          <p>
            Meal completion across visible reports is{' '}
            <span className="font-bold text-slate-900">{mealCompletionRate}%</span>.{' '}
            {activeTab === 'today'
              ? 'Use today cards below to open full reports quickly.'
              : activeTab === 'week'
                ? 'Weekly trends help you spot consistency and follow up quickly.'
                : 'All history is available below for deeper review.'}
          </p>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {REPORT_TABS.map((tab) => {
            const active = activeTab === tab.key
            return (
              <Link
                key={tab.key}
                href={buildTabHref(tab.key, searchQuery)}
                className={cn(
                  'rounded-2xl border px-4 py-2 text-xs font-black uppercase tracking-[0.08em] transition-colors',
                  active
                    ? 'border-teal-300 bg-teal-50 text-teal-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:text-teal-700'
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>

        <form className="relative max-w-md" method="get">
          <input type="hidden" name="tab" value={activeTab} />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            name="q"
            defaultValue={searchQuery}
            placeholder="Search child name"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
          />
        </form>
      </section>

      {cards.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-slate-800">No matching children found.</p>
          <p className="mt-1 text-xs text-slate-500">Try a different search query.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const moodInfo = card.todayReport?.mood ? MOOD_MAP[card.todayReport.mood] : null
            const MoodIcon = moodInfo?.icon ?? Smile

            return (
              <Card key={card.child.id} className="rounded-3xl border-slate-200 shadow-[var(--shadow-elevation-1)]">
                <CardHeader className="space-y-3 border-b border-slate-100 bg-slate-50/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        {card.latestReport?.photo_url ? (
                          <Image
                            src={card.latestReport.photo_url}
                            alt={`${card.name} report photo`}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-black text-slate-500">
                            {card.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">{card.name}</CardTitle>
                        <p className="mt-0.5 text-xs font-medium text-slate-500">
                          {card.latestReport ? `Latest: ${formatReportDate(card.latestReport.report_date)}` : 'No report yet'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em]',
                        card.todayReport ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      )}
                    >
                      {card.todayReport ? 'Today ready' : 'Pending today'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl border border-slate-200 bg-white p-2">
                      <p className="font-bold uppercase tracking-wide text-slate-400">Visible reports</p>
                      <p className="mt-0.5 text-sm font-black text-slate-900">{card.tabReports.length}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-2">
                      <p className="font-bold uppercase tracking-wide text-slate-400">Mood today</p>
                      <p className={cn('mt-0.5 flex items-center gap-1 text-sm font-black', moodInfo?.color ?? 'text-slate-500')}>
                        <MoodIcon className="h-3.5 w-3.5" />
                        {moodInfo?.label ?? 'Not shared'}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4">
                  <details className="group rounded-2xl border border-slate-200 bg-slate-50/70">
                    <summary className="cursor-pointer list-none px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-teal-700">
                      Tap to expand full report
                    </summary>
                    <div className="space-y-3 border-t border-slate-200 p-3">
                      {card.tabReports.length === 0 ? (
                        <p className="text-xs text-slate-500">No published reports in this tab for {card.child.first_name}.</p>
                      ) : (
                        card.tabReports.slice(0, 12).map((report) => (
                          <div key={report.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                                {formatReportDate(report.report_date)}
                              </p>
                              <p className="text-[11px] font-semibold text-slate-400">
                                {report.published_at
                                  ? new Date(report.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  : '--:--'}
                              </p>
                            </div>
                            <p className="mt-1 text-sm text-slate-700">
                              {report.teacher_notes?.trim() || 'Daily update shared by your creche team.'}
                            </p>
                            <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                              <p className="rounded-xl bg-slate-50 px-2 py-1 font-semibold text-slate-600">
                                Breakfast: {formatMealValue(report.breakfast_eaten)}
                              </p>
                              <p className="rounded-xl bg-slate-50 px-2 py-1 font-semibold text-slate-600">
                                Lunch: {formatMealValue(report.lunch_eaten)}
                              </p>
                              <p className="rounded-xl bg-slate-50 px-2 py-1 font-semibold text-slate-600">
                                Snack: {formatMealValue(report.snack_eaten)}
                              </p>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {(report.activities ?? ['Classroom learning']).map((activity) => (
                                <span
                                  key={`${report.id}-${activity}`}
                                  className="rounded-full border border-cyan-100 bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-cyan-700"
                                >
                                  {activity}
                                </span>
                              ))}
                            </div>
                            {report.nap_start ? (
                              <p className="mt-2 text-[11px] font-medium text-slate-600">
                                Rest: {report.nap_start} - {report.nap_end || '...'}
                              </p>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </details>

                  <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-teal-600" />
                    Reports are published by centre staff and visible immediately.
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
