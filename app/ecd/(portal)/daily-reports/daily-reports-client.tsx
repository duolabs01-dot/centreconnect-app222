'use client'

import Image from 'next/image'
import { useCallback, useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { saveDailyReportAction } from './actions'
import {
  CalendarDays,
  CheckCircle2,
  CloudRain,
  Coffee,
  Cookie,
  Frown,
  Laugh,
  Moon,
  Search,
  Share,
  Smile,
  Sparkles,
  Utensils,
} from 'lucide-react'

type Child = {
  id: string
  first_name: string
  last_name: string
  photo_url: string | null
}

type DailyReport = {
  id?: string
  child_id: string
  report_date: string
  breakfast_eaten?: string | null
  lunch_eaten?: string | null
  snack_eaten?: string | null
  mood?: string | null
  nap_start?: string | null
  nap_end?: string | null
  activities?: string[] | null
  teacher_notes?: string | null
  photo_url?: string | null
  published_at?: string | null
  published_by?: string | null
  created_at?: string | null
}

type ReportTab = 'today' | 'this_week' | 'all'
type ReportStatus = 'published' | 'draft' | 'missing'

type DailyReportsClientProps = {
  enrolledChildren: Child[]
  initialReports: DailyReport[]
  ecdId: string
  todayDate: string
  weekStartDate: string
  staffId: string
  userRoleLabel: string
  userEmail: string
  userRole: 'ecd_admin' | 'ecd_staff' | 'ecd_supervisor'
}

const MOODS = [
  { value: 'happy', label: 'Happy', icon: Laugh, iconClass: 'text-amber-500' },
  { value: 'good', label: 'Good', icon: Smile, iconClass: 'text-emerald-500' },
  { value: 'tired', label: 'Tired', icon: Moon, iconClass: 'text-slate-500' },
  { value: 'unsettled', label: 'Unsettled', icon: CloudRain, iconClass: 'text-blue-500' },
  { value: 'upset', label: 'Upset', icon: Frown, iconClass: 'text-rose-500' },
] as const

const EATEN_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'some', label: 'Some' },
  { value: 'none', label: 'None' },
  { value: 'not_offered', label: 'N/A' },
] as const

const ACTIVITIES = ['Painting', 'Outdoor Play', 'Story Time', 'Music', 'Numbers', 'Art', 'Games'] as const

function toReportKey(childId: string, reportDate: string) {
  return `${childId}::${reportDate}`
}

function toDateLabel(dateValue: string) {
  return new Date(`${dateValue}T00:00:00Z`).toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function hasDraftContent(report: DailyReport | null | undefined) {
  if (!report) return false
  return Boolean(
    report.breakfast_eaten ||
      report.lunch_eaten ||
      report.snack_eaten ||
      report.mood ||
      report.nap_start ||
      report.nap_end ||
      (report.activities && report.activities.length > 0) ||
      (report.teacher_notes && report.teacher_notes.trim().length > 0)
  )
}

function getReportStatus(report: DailyReport | null | undefined): ReportStatus {
  if (!report) return 'missing'
  if (report.published_at) return 'published'
  if (hasDraftContent(report)) return 'draft'
  return 'missing'
}

function statusLabel(status: ReportStatus) {
  if (status === 'published') return 'Published'
  if (status === 'draft') return 'Draft'
  return 'Not started'
}

function statusClass(status: ReportStatus) {
  if (status === 'published') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'draft') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-slate-200 bg-slate-50 text-slate-500'
}

function mealValueLabel(value: string | null | undefined) {
  if (!value) return 'N/A'
  return value.replaceAll('_', ' ')
}

function normalizeDateTime(value: string | null | undefined) {
  const trimmed = String(value ?? '').trim()
  return trimmed.length > 0 ? trimmed : null
}

function extractInitials(child: Child) {
  return `${child.first_name[0] ?? 'C'}${child.last_name[0] ?? ''}`.toUpperCase()
}

function getMoodLabel(value: string | null | undefined) {
  return MOODS.find((entry) => entry.value === value)?.label ?? 'No mood'
}

function buildAiSummary({
  tab,
  totalChildren,
  publishedCount,
  draftCount,
  missingCount,
  topMoodLabel,
  mealCompletionRate,
}: {
  tab: ReportTab
  totalChildren: number
  publishedCount: number
  draftCount: number
  missingCount: number
  topMoodLabel: string
  mealCompletionRate: number
}) {
  const tabLabel = tab === 'today' ? 'today' : tab === 'this_week' ? 'this week' : 'across all records'
  return `AI Summary: ${publishedCount}/${totalChildren} reports are published ${tabLabel}. ${draftCount} drafts still need review, ${missingCount} children are not started, top mood is ${topMoodLabel}, and meal completion is ${mealCompletionRate}% across visible cards.`
}

export function DailyReportsClient({
  enrolledChildren,
  initialReports,
  ecdId: _ecdId,
  todayDate,
  weekStartDate,
  staffId: _staffId,
  userRoleLabel,
  userEmail,
  userRole,
}: DailyReportsClientProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedChildId, setExpandedChildId] = useState<string | null>(enrolledChildren[0]?.id ?? null)
  const [selectedDateByChild, setSelectedDateByChild] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()
  const [reportsByKey, setReportsByKey] = useState<Record<string, DailyReport>>(() => {
    const seeded: Record<string, DailyReport> = {}
    for (const report of initialReports) {
      if (!report.child_id || !report.report_date) continue
      seeded[toReportKey(report.child_id, report.report_date)] = report
    }
    return seeded
  })

  const childById = useMemo(() => new Map(enrolledChildren.map((child) => [child.id, child])), [enrolledChildren])

  const reportsByChild = useMemo(() => {
    const mapped = new Map<string, DailyReport[]>()
    for (const report of Object.values(reportsByKey)) {
      const list = mapped.get(report.child_id) ?? []
      list.push(report)
      mapped.set(report.child_id, list)
    }
    for (const list of mapped.values()) {
      list.sort((a, b) => {
        if (a.report_date === b.report_date) {
          return (b.created_at ?? '').localeCompare(a.created_at ?? '')
        }
        return b.report_date.localeCompare(a.report_date)
      })
    }
    return mapped
  }, [reportsByKey])

  const getPrimaryReportForTab = useCallback(
    (childId: string, tab: ReportTab) => {
      const reports = reportsByChild.get(childId) ?? []
      if (tab === 'today') {
        return reports.find((report) => report.report_date === todayDate) ?? null
      }
      if (tab === 'this_week') {
        return (
          reports.find((report) => report.report_date >= weekStartDate && report.report_date <= todayDate) ?? null
        )
      }
      return reports[0] ?? null
    },
    [reportsByChild, todayDate, weekStartDate]
  )

  const filteredChildren = useMemo(() => {
    const term = searchQuery.trim().toLowerCase()
    const base = !term
      ? enrolledChildren
      : enrolledChildren.filter((child) =>
          `${child.first_name} ${child.last_name}`.toLowerCase().includes(term)
        )

    return [...base].sort((a, b) => {
      const statusA = getReportStatus(getPrimaryReportForTab(a.id, activeTab))
      const statusB = getReportStatus(getPrimaryReportForTab(b.id, activeTab))
      const rank = { missing: 0, draft: 1, published: 2 } as const
      if (rank[statusA] !== rank[statusB]) return rank[statusA] - rank[statusB]
      return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
    })
  }, [activeTab, enrolledChildren, searchQuery, getPrimaryReportForTab])

  const selectedChild = expandedChildId ? childById.get(expandedChildId) ?? null : null
  const selectedChildReports = selectedChild ? reportsByChild.get(selectedChild.id) ?? [] : []
  const defaultSelectedDate = selectedChild
    ? getPrimaryReportForTab(selectedChild.id, activeTab)?.report_date ?? todayDate
    : todayDate
  const selectedDate = selectedChild
    ? selectedDateByChild[selectedChild.id] ?? defaultSelectedDate
    : todayDate
  const selectedReport = selectedChild
    ? reportsByKey[toReportKey(selectedChild.id, selectedDate)] ?? {
        child_id: selectedChild.id,
        report_date: selectedDate,
      }
    : null

  const aiSummaryStats = useMemo(() => {
    const reports = filteredChildren.map((child) => getPrimaryReportForTab(child.id, activeTab))
    const totalChildren = filteredChildren.length
    const publishedCount = reports.filter((report) => getReportStatus(report) === 'published').length
    const draftCount = reports.filter((report) => getReportStatus(report) === 'draft').length
    const missingCount = Math.max(0, totalChildren - publishedCount - draftCount)

    const moodCounts = new Map<string, number>()
    let mealChecks = 0
    let mealSuccesses = 0

    for (const report of reports) {
      if (!report) continue
      if (report.mood) {
        moodCounts.set(report.mood, (moodCounts.get(report.mood) ?? 0) + 1)
      }
      for (const meal of [report.breakfast_eaten, report.lunch_eaten, report.snack_eaten]) {
        if (!meal) continue
        mealChecks += 1
        if (meal === 'all' || meal === 'some') mealSuccesses += 1
      }
    }

    let topMoodLabel = 'steady'
    let topMoodCount = 0
    for (const [mood, count] of moodCounts.entries()) {
      if (count > topMoodCount) {
        topMoodCount = count
        topMoodLabel = getMoodLabel(mood)
      }
    }

    const mealCompletionRate = mealChecks > 0 ? Math.round((mealSuccesses / mealChecks) * 100) : 0

    return {
      totalChildren,
      publishedCount,
      draftCount,
      missingCount,
      topMoodLabel,
      mealCompletionRate,
      text: buildAiSummary({
        tab: activeTab,
        totalChildren,
        publishedCount,
        draftCount,
        missingCount,
        topMoodLabel,
        mealCompletionRate,
      }),
    }
  }, [activeTab, filteredChildren, getPrimaryReportForTab])

  const reportTabs: Array<{ key: ReportTab; label: string }> = [
    { key: 'today', label: 'Today' },
    { key: 'this_week', label: 'This Week' },
    { key: 'all', label: 'All' },
  ]

  function selectChild(childId: string) {
    setExpandedChildId(childId)
    const existingDate = selectedDateByChild[childId]
    if (existingDate) return
    const defaultDate = getPrimaryReportForTab(childId, activeTab)?.report_date ?? todayDate
    setSelectedDateByChild((prev) => ({ ...prev, [childId]: defaultDate }))
  }

  function updateReport(childId: string, reportDate: string, updates: Partial<DailyReport>) {
    const key = toReportKey(childId, reportDate)
    setReportsByKey((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? { child_id: childId, report_date: reportDate }),
        ...updates,
      },
    }))
  }

  function toggleActivity(childId: string, reportDate: string, activity: string) {
    const key = toReportKey(childId, reportDate)
    const existing = reportsByKey[key]?.activities ?? []
    const nextActivities = existing.includes(activity)
      ? existing.filter((value) => value !== activity)
      : [...existing, activity]
    updateReport(childId, reportDate, { activities: nextActivities })
  }

  function saveReport(publish: boolean) {
    if (!selectedChild || !selectedReport) return

    startTransition(async () => {
      const result = await saveDailyReportAction({
        childId: selectedChild.id,
        reportDate: selectedDate,
        publish,
        report: {
          breakfast_eaten: selectedReport.breakfast_eaten ?? null,
          lunch_eaten: selectedReport.lunch_eaten ?? null,
          snack_eaten: selectedReport.snack_eaten ?? null,
          mood: selectedReport.mood ?? null,
          nap_start: normalizeDateTime(selectedReport.nap_start),
          nap_end: normalizeDateTime(selectedReport.nap_end),
          activities: selectedReport.activities ?? [],
          teacher_notes: selectedReport.teacher_notes ?? null,
          photo_url: selectedReport.photo_url ?? null,
        },
      })

      if (!result.ok) {
        toast.error(result.error || 'Failed to save daily report.')
        return
      }

      const saved = result.report as DailyReport | undefined
      if (saved?.child_id && saved?.report_date) {
        setReportsByKey((prev) => ({
          ...prev,
          [toReportKey(saved.child_id, saved.report_date)]: saved,
        }))
      }

      if (result.warning) {
        toast.warning(result.warning)
      } else {
        toast.success(publish ? 'Report published and notifications dispatched.' : 'Draft saved.')
      }
    })
  }

  return (
    <>
      <div className="space-y-6">
        <section className="hidden lg:flex lg:items-end lg:justify-between min-w-0">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-600">Daily Reporting</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Daily Reports</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 overflow-x-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 shrink-0">
              {reportTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition whitespace-nowrap',
                    activeTab === tab.key
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="relative w-80 shrink-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-11 rounded-xl border-slate-200 pl-9"
                placeholder="Search child name"
              />
            </div>
          </div>
        </section>

        <Card className="border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-emerald-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-slate-900">
              <Sparkles className="h-4 w-4 text-cyan-600" />
              AI Daily Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-700">{aiSummaryStats.text}</p>
            <div className="grid gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                Published: {aiSummaryStats.publishedCount}
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                Drafts: {aiSummaryStats.draftCount}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                Not started: {aiSummaryStats.missingCount}
              </div>
              <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700">
                Meal completion: {aiSummaryStats.mealCompletionRate}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-col gap-3 lg:hidden">
              <div className="flex flex-wrap items-center gap-3">
                <div className="max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-1">
                  <div className="flex gap-1 overflow-x-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
                    {reportTabs.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                          'shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition whitespace-nowrap',
                          activeTab === tab.key
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative w-full sm:w-80 shrink-0">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="h-11 rounded-xl border-slate-200 pl-9"
                    placeholder="Search child name"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredChildren.map((child) => {
                  const primaryReport = getPrimaryReportForTab(child.id, activeTab)
                  const status = getReportStatus(primaryReport)
                  const isExpanded = expandedChildId === child.id
                  const fullName = `${child.first_name} ${child.last_name}`.trim()

                  return (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => selectChild(child.id)}
                      className={cn(
                        'rounded-2xl border bg-white p-4 text-left transition hover:border-cyan-200 hover:shadow-sm',
                        isExpanded ? 'border-cyan-300 shadow-sm' : 'border-slate-200'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                            {child.photo_url ? (
                              <Image src={child.photo_url} alt={fullName} fill className="object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-500">
                                {extractInitials(child)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{fullName}</p>
                            <p className="truncate text-xs text-slate-500">
                              {primaryReport ? toDateLabel(primaryReport.report_date) : 'No report yet'}
                            </p>
                          </div>
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
                            statusClass(status)
                          )}
                        >
                          {statusLabel(status)}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-1.5 text-slate-600">
                          Mood: {getMoodLabel(primaryReport?.mood)}
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-1.5 text-slate-600">
                          Meals: {mealValueLabel(primaryReport?.lunch_eaten)}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {filteredChildren.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No children match this search.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {selectedChild && selectedReport ? (
          <Card className="border-cyan-100">
            <CardHeader className="border-b border-slate-100 bg-slate-50/60">
              <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base">
                <span className="text-slate-900">
                  Full Report: {selectedChild.first_name} {selectedChild.last_name}
                </span>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-slate-500" />
                  <select
                    className="cc-native-field h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                    value={selectedDate}
                    onChange={(event) =>
                      setSelectedDateByChild((prev) => ({
                        ...prev,
                        [selectedChild.id]: event.target.value,
                      }))
                    }
                  >
                    {Array.from(
                      new Set([todayDate, ...selectedChildReports.map((report) => report.report_date)])
                    )
                      .sort((a, b) => b.localeCompare(a))
                      .map((dateValue) => (
                        <option key={dateValue} value={dateValue}>
                          {toDateLabel(dateValue)}
                        </option>
                      ))}
                  </select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-6 xl:grid-cols-2">
                <section className="space-y-5">
                  <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Meals</p>
                    {[
                      { key: 'breakfast_eaten', label: 'Breakfast', icon: Coffee },
                      { key: 'lunch_eaten', label: 'Lunch', icon: Utensils },
                      { key: 'snack_eaten', label: 'Snack', icon: Cookie },
                    ].map((meal) => (
                      <div key={meal.key} className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                          <meal.icon className="h-4 w-4 text-slate-400" />
                          {meal.label}
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {EATEN_OPTIONS.map((option) => (
                            <Button
                              key={option.value}
                              type="button"
                              variant="outline"
                              onClick={() =>
                                updateReport(selectedChild.id, selectedDate, {
                                  [meal.key]: option.value,
                                } as Partial<DailyReport>)
                              }
                              className={cn(
                                'h-10 rounded-xl px-2 text-[11px] font-semibold',
                                (selectedReport as any)[meal.key] === option.value
                                  ? 'border-cyan-300 bg-cyan-50 text-cyan-700'
                                  : 'border-slate-200 bg-white text-slate-500'
                              )}
                            >
                              {option.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Mood</p>
                    <div className="grid grid-cols-5 gap-2">
                      {MOODS.map((mood) => (
                        <Button
                          key={mood.value}
                          type="button"
                          variant="outline"
                          onClick={() => updateReport(selectedChild.id, selectedDate, { mood: mood.value })}
                          className={cn(
                            'h-16 flex-col rounded-xl px-2 text-[10px] font-semibold',
                            selectedReport.mood === mood.value
                              ? 'border-amber-300 bg-amber-50 text-amber-700'
                              : 'border-slate-200 text-slate-500'
                          )}
                        >
                          <mood.icon className={cn('mb-1 h-5 w-5', mood.iconClass)} />
                          {mood.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="space-y-5">
                  <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Activities and rest</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-slate-500">Nap start</label>
                        <input
                          type="time"
                          value={selectedReport.nap_start ?? ''}
                          onChange={(event) =>
                            updateReport(selectedChild.id, selectedDate, { nap_start: event.target.value })
                          }
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-slate-500">Nap end</label>
                        <input
                          type="time"
                          value={selectedReport.nap_end ?? ''}
                          onChange={(event) =>
                            updateReport(selectedChild.id, selectedDate, { nap_end: event.target.value })
                          }
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ACTIVITIES.map((activity) => {
                        const isActive = selectedReport.activities?.includes(activity)
                        return (
                          <Button
                            key={activity}
                            type="button"
                            variant="outline"
                            onClick={() => toggleActivity(selectedChild.id, selectedDate, activity)}
                            className={cn(
                              'h-10 rounded-full px-4 text-xs font-semibold',
                              isActive
                                ? 'border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-700'
                                : 'border-slate-200 text-slate-600'
                            )}
                          >
                            {activity}
                          </Button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Teacher notes</p>
                    <Textarea
                      value={selectedReport.teacher_notes ?? ''}
                      onChange={(event) =>
                        updateReport(selectedChild.id, selectedDate, { teacher_notes: event.target.value })
                      }
                      className="min-h-[130px] rounded-xl border-slate-200"
                      placeholder="Share highlights, behavior changes, and any parent follow-up."
                    />
                  </div>
                </section>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => saveReport(false)}
                  disabled={isPending}
                  className="rounded-xl border-cyan-200 text-cyan-700 hover:bg-cyan-50"
                >
                  {isPending ? 'Saving...' : 'Save Draft'}
                </Button>
                <Button
                  type="button"
                  onClick={() => saveReport(true)}
                  disabled={isPending}
                  className="rounded-xl bg-cyan-600 text-white hover:bg-cyan-700"
                >
                  <Share className="mr-2 h-4 w-4" />
                  {selectedReport.published_at ? 'Update Published Report' : 'Publish Report'}
                </Button>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 className="h-4 w-4 text-slate-400" />
                {selectedReport.published_at
                  ? `Published at ${new Date(selectedReport.published_at).toLocaleString()}`
                  : 'This report is still a draft.'}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  )
}

