import type { Metadata } from 'next'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import {
  CheckCircle2,
  CloudRain,
  Coffee,
  Cookie,
  Frown,
  Info,
  Laugh,
  Moon,
  Smile,
  Utensils,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ParentAppShell } from '@/components/layout/parent-app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, getJohannesburgNowParts } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Daily Reports - CentreConnect',
  description: "View your children's latest daily updates from crèche.",
}

const MOOD_MAP: Record<string, { label: string; icon: typeof Smile; color: string }> = {
  happy: { label: 'Happy', icon: Laugh, color: 'text-amber-500' },
  good: { label: 'Good', icon: Smile, color: 'text-emerald-500' },
  tired: { label: 'Tired', icon: Moon, color: 'text-slate-500' },
  unsettled: { label: 'Unsettled', icon: CloudRain, color: 'text-blue-500' },
  upset: { label: 'Upset', icon: Frown, color: 'text-rose-500' },
}

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

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function formatReportDate(dateValue: string) {
  return new Date(`${dateValue}T00:00:00Z`).toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function renderMealValue(value: string | null | undefined) {
  if (!value) return 'N/A'
  return value.replaceAll('_', ' ')
}

export default async function ParentDailyReportsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { year, month, day } = getJohannesburgNowParts()
  const todayDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const todayUtc = new Date(Date.UTC(year, month - 1, day))
  const sevenDaysAgo = new Date(todayUtc)
  sevenDaysAgo.setUTCDate(todayUtc.getUTCDate() - 6)
  const fromDate = sevenDaysAgo.toISOString().slice(0, 10)

  const { data: applications } = await supabase
    .from('applications')
    .select('child_id,children(id,first_name,last_name)')
    .eq('parent_id', user.id)
    .eq('status', 'enrolled')

  const childRows = (applications ?? []) as ApplicationRow[]
  const seenChildIds = new Set<string>()
  const children = childRows.flatMap((row) => {
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
      <ParentAppShell>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Info className="mb-4 h-12 w-12 text-slate-300" />
          <h2 className="text-lg font-bold text-slate-900">No enrolled children</h2>
          <p className="mt-1 text-sm text-slate-500">Daily reports are available once enrollment is active.</p>
        </div>
      </ParentAppShell>
    )
  }

  const childIds = children.map((child) => child.id)
  const { data: reportsRaw } = await supabase
    .from('child_daily_reports')
    .select(
      'id,child_id,report_date,breakfast_eaten,lunch_eaten,snack_eaten,nap_start,nap_end,mood,activities,teacher_notes,photo_url,published_at'
    )
    .in('child_id', childIds)
    .gte('report_date', fromDate)
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

  return (
    <ParentAppShell>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Daily Reports</h1>
          <p className="text-sm text-slate-500">
            Latest updates from the last 7 days, including today.
          </p>
        </header>

        {children.map((child) => {
          const allReports = reportsByChild.get(child.id) ?? []
          const todayReport = allReports.find((report) => report.report_date === todayDate) ?? null

          return (
            <Card key={child.id} className="overflow-hidden border-cyan-100">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>
                    {child.first_name} {child.last_name}
                  </span>
                  {todayReport ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      Today received
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      No report yet today
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {todayReport ? (
                  <div className="space-y-5">
                    <div className="flex items-start gap-4">
                      {todayReport.mood && MOOD_MAP[todayReport.mood] ? (
                        <div className="shrink-0 text-center">
                          <div
                            className={cn(
                              'flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm',
                              MOOD_MAP[todayReport.mood].color
                            )}
                          >
                            {(() => {
                              const MoodIcon = MOOD_MAP[todayReport.mood!].icon
                              return <MoodIcon className="h-8 w-8" />
                            })()}
                          </div>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {MOOD_MAP[todayReport.mood].label}
                          </p>
                        </div>
                      ) : null}
                      <p className="text-sm italic text-slate-700 leading-relaxed">
                        &quot;
                        {todayReport.teacher_notes || 'Your child had a positive and engaging day at crèche today.'}
                        &quot;
                      </p>
                    </div>

                    {todayReport.photo_url ? (
                      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                        <Image
                          src={todayReport.photo_url}
                          alt="Daily update photo"
                          fill
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : null}

                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Breakfast', key: 'breakfast_eaten', icon: Coffee },
                        { label: 'Lunch', key: 'lunch_eaten', icon: Utensils },
                        { label: 'Snack', key: 'snack_eaten', icon: Cookie },
                      ].map((meal) => (
                        <div key={meal.key} className="rounded-2xl bg-slate-50 p-3 text-center">
                          <meal.icon className="mx-auto mb-2 h-4 w-4 text-slate-400" />
                          <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">{meal.label}</p>
                          <p className="text-xs font-black uppercase tracking-tight text-cyan-700">
                            {renderMealValue((todayReport as any)[meal.key])}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                          <CheckCircle2 className="h-4 w-4 text-cyan-600" />
                          Activities
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(todayReport.activities ?? ['Classroom learning']).map((activity) => (
                            <span
                              key={`${todayReport.id}-${activity}`}
                              className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-[11px] font-bold text-cyan-700"
                            >
                              {activity}
                            </span>
                          ))}
                        </div>
                      </div>
                      {todayReport.nap_start ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                            <Moon className="h-4 w-4 text-amber-500" />
                            Rest
                          </div>
                          <p className="rounded-2xl border border-amber-100 bg-amber-50/50 p-2 text-xs font-medium text-slate-700">
                            Slept from <span className="font-bold">{todayReport.nap_start}</span> to{' '}
                            <span className="font-bold">{todayReport.nap_end || '...'}</span>
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="py-2">
                    <p className="text-sm text-slate-600">
                      No report has been published for today yet. You can still see recent updates below.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Last 7 days</p>
                  {allReports.length === 0 ? (
                    <p className="text-xs text-slate-500">No published reports in the last 7 days.</p>
                  ) : (
                    <div className="space-y-2">
                      {allReports.slice(0, 7).map((report) => (
                        <div
                          key={report.id}
                          className="flex items-start justify-between rounded-2xl border border-slate-100 bg-slate-50/40 px-3 py-2"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-800">{formatReportDate(report.report_date)}</p>
                            <p className="mt-0.5 text-[11px] text-slate-600">
                              {report.teacher_notes?.trim()
                                ? report.teacher_notes.slice(0, 80)
                                : 'Daily update shared by your crèche team.'}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold uppercase text-slate-500">
                            {report.published_at
                              ? new Date(report.published_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '--:--'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </ParentAppShell>
  )
}
