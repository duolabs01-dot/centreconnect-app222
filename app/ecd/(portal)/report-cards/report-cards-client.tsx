'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, Clock3, FileText, Plus, Send, Star, Trash2 } from 'lucide-react'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  DEFAULT_DEVELOPMENT_AREAS,
  deleteReportCardAction,
  publishReportCardAction,
  saveReportCardAction,
  type SaveReportCardInput,
} from '@/lib/actions/ecd/report-cards'

type ChildOption = {
  id: string
  first_name: string
  last_name: string
}

type ReportCardArea = {
  area_name: string
  rating: number
  comment: string | null
  sort_order: number
}

type ReportCardRow = {
  id: string
  child_id: string
  term: string
  period_start: string | null
  period_end: string | null
  status: 'draft' | 'published'
  teacher_name: string | null
  overall_comment: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  report_card_areas: ReportCardArea[]
}

type ReportCardsClientProps = {
  enrolledChildren: ChildOption[]
  initialReportCards: ReportCardRow[]
  reportCardsWarning?: string | null
  userRoleLabel: string
  userEmail: string
  userRole: 'ecd_admin' | 'ecd_staff' | 'ecd_supervisor'
}

type ViewMode = 'list' | 'editor'

const CURRENT_YEAR = new Date().getFullYear()
const TERM_OPTIONS = [
  `Term 1 ${CURRENT_YEAR}`,
  `Term 2 ${CURRENT_YEAR}`,
  `Term 3 ${CURRENT_YEAR}`,
  `Term 4 ${CURRENT_YEAR}`,
] as const

function fallbackAreas(): ReportCardArea[] {
  return DEFAULT_DEVELOPMENT_AREAS.map((name, index) => ({
    area_name: name,
    rating: 3,
    comment: null,
    sort_order: index,
  }))
}

function formatDisplayDate(value: string | null | undefined) {
  if (!value) return '--'
  return new Date(value).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function childFullName(child: ChildOption | undefined) {
  if (!child) return 'Child'
  return `${child.first_name} ${child.last_name}`.trim() || 'Child'
}

function StarRating({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((level) => (
        <Button
          key={level}
          type="button"
          onClick={() => onChange(level)}
          size="icon"
          variant="outline"
          className={cn(
            'h-9 w-9 rounded-2xl',
            level <= value
              ? 'border-amber-200 bg-amber-50 text-amber-500 hover:bg-amber-50'
              : 'border-slate-200 bg-white text-slate-300'
          )}
        >
          <Star className={cn('h-4 w-4', level <= value && 'fill-current')} />
        </Button>
      ))}
    </div>
  )
}

export function ReportCardsClient({
  enrolledChildren,
  initialReportCards,
  reportCardsWarning = null,
  userRoleLabel,
  userEmail,
  userRole,
}: ReportCardsClientProps) {
  const [view, setView] = useState<ViewMode>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [reportCards, setReportCards] = useState<ReportCardRow[]>(initialReportCards)

  const [selectedChildId, setSelectedChildId] = useState<string>(enrolledChildren[0]?.id ?? '')
  const [selectedTerm, setSelectedTerm] = useState<string>(TERM_OPTIONS[0])
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [overallComment, setOverallComment] = useState('')
  const [areas, setAreas] = useState<ReportCardArea[]>(fallbackAreas)

  const [isSaving, startSaveTransition] = useTransition()
  const [isPublishing, startPublishTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()

  const childMap = useMemo(() => {
    return new Map(enrolledChildren.map((child) => [child.id, child]))
  }, [enrolledChildren])

  const groupedByTerm = useMemo(() => {
    const groups = new Map<string, ReportCardRow[]>()
    const sorted = [...reportCards].sort(
      (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
    )

    for (const card of sorted) {
      const list = groups.get(card.term) ?? []
      list.push(card)
      groups.set(card.term, list)
    }

    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [reportCards])

  function resetForm() {
    setEditingId(null)
    setSelectedChildId(enrolledChildren[0]?.id ?? '')
    setSelectedTerm(TERM_OPTIONS[0])
    setPeriodStart('')
    setPeriodEnd('')
    setOverallComment('')
    setAreas(fallbackAreas())
  }

  function openCreateForm() {
    resetForm()
    setView('editor')
  }

  function openEditForm(card: ReportCardRow) {
    setEditingId(card.id)
    setSelectedChildId(card.child_id)
    setSelectedTerm(card.term)
    setPeriodStart(card.period_start ?? '')
    setPeriodEnd(card.period_end ?? '')
    setOverallComment(card.overall_comment ?? '')
    setAreas(
      card.report_card_areas.length > 0
        ? [...card.report_card_areas].sort((a, b) => a.sort_order - b.sort_order)
        : fallbackAreas()
    )
    setView('editor')
  }

  function updateAreaRating(index: number, rating: number) {
    setAreas((current) => current.map((area, i) => (i === index ? { ...area, rating } : area)))
  }

  function updateAreaComment(index: number, comment: string) {
    setAreas((current) => current.map((area, i) => (i === index ? { ...area, comment: comment || null } : area)))
  }

  function upsertLocalCard(cardId: string, status: 'draft' | 'published') {
    const now = new Date().toISOString()
    const nextCard: ReportCardRow = {
      id: cardId,
      child_id: selectedChildId,
      term: selectedTerm,
      period_start: periodStart || null,
      period_end: periodEnd || null,
      status,
      teacher_name: null,
      overall_comment: overallComment || null,
      published_at: status === 'published' ? now : null,
      created_at: now,
      updated_at: now,
      report_card_areas: areas.map((area, index) => ({
        area_name: area.area_name,
        rating: area.rating,
        comment: area.comment || null,
        sort_order: area.sort_order ?? index,
      })),
    }

    setReportCards((current) => {
      const existingIndex = current.findIndex((entry) => entry.id === cardId)
      if (existingIndex < 0) return [nextCard, ...current]
      return current.map((entry, index) =>
        index === existingIndex
          ? {
              ...entry,
              ...nextCard,
              created_at: entry.created_at,
              status,
              published_at: status === 'published' ? nextCard.published_at : entry.published_at,
            }
          : entry
      )
    })
  }

  function handleSave(publishAfterSave: boolean) {
    if (!selectedChildId) {
      toast.error('Choose a child before saving.')
      return
    }

    startSaveTransition(async () => {
      const payload: SaveReportCardInput = {
        id: editingId ?? null,
        child_id: selectedChildId,
        term: selectedTerm,
        period_start: periodStart || null,
        period_end: periodEnd || null,
        overall_comment: overallComment || null,
        areas: areas.map((area, index) => ({
          area_name: area.area_name,
          rating: area.rating,
          comment: area.comment || null,
          sort_order: area.sort_order ?? index,
        })),
      }

      const saveResult = await saveReportCardAction(payload)
      if (!saveResult.success || !saveResult.reportCardId) {
        toast.error(saveResult.message)
        return
      }

      const savedId = saveResult.reportCardId
      upsertLocalCard(savedId, 'draft')

      if (publishAfterSave) {
        startPublishTransition(async () => {
          const publishResult = await publishReportCardAction(savedId)
          if (!publishResult.success) {
            toast.error(publishResult.message)
            return
          }
          upsertLocalCard(savedId, 'published')
          toast.success(publishResult.message)
          resetForm()
          setView('list')
        })
        return
      }

      toast.success(saveResult.message)
      resetForm()
      setView('list')
    })
  }

  function handlePublish(cardId: string) {
    startPublishTransition(async () => {
      const result = await publishReportCardAction(cardId)
      if (!result.success) {
        toast.error(result.message)
        return
      }

      setReportCards((current) =>
        current.map((entry) =>
          entry.id === cardId
            ? {
                ...entry,
                status: 'published',
                published_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
            : entry
        )
      )
      toast.success(result.message)
    })
  }

  function handleDelete(cardId: string) {
    startDeleteTransition(async () => {
      const result = await deleteReportCardAction(cardId)
      if (!result.success) {
        toast.error(result.message)
        return
      }

      setReportCards((current) => current.filter((entry) => entry.id !== cardId))
      toast.success(result.message)
    })
  }

  return (
    <EcdOsShell
      title="Report Cards"
      description="Create and publish child progress reports for families."
      roleLabel={userRoleLabel}
      userEmail={userEmail}
      userRole={userRole}
    >
      <section className="space-y-6">
        {view === 'list' ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Communication</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Report Cards</h1>
                <p className="mt-1 text-sm text-slate-600">
                  {reportCards.length} report card{reportCards.length === 1 ? '' : 's'} saved for your centre.
                </p>
              </div>
              <Button
                type="button"
                className="h-12 rounded-3xl bg-teal-600 px-6 text-white hover:bg-teal-700"
                onClick={openCreateForm}
                disabled={enrolledChildren.length === 0 || Boolean(reportCardsWarning)}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Report Card
              </Button>
            </div>

            {reportCardsWarning ? (
              <Card className="rounded-3xl border-amber-200 bg-amber-50">
                <CardContent className="py-4">
                  <p className="text-sm font-semibold text-amber-900">{reportCardsWarning}</p>
                </CardContent>
              </Card>
            ) : null}

            {enrolledChildren.length === 0 ? (
              <Card className="rounded-3xl border-slate-200 bg-white">
                <CardContent className="py-10 text-center">
                  <p className="text-sm font-semibold text-slate-700">No enrolled children found.</p>
                  <p className="mt-1 text-xs text-slate-500">Report cards unlock once children are enrolled.</p>
                </CardContent>
              </Card>
            ) : null}

            {enrolledChildren.length > 0 && reportCards.length === 0 ? (
              <Card className="rounded-3xl border-dashed border-slate-300 bg-white">
                <CardContent className="py-10 text-center">
                  <FileText className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-700">No report cards yet.</p>
                  <p className="mt-1 text-xs text-slate-500">Create your first draft and share progress with families.</p>
                </CardContent>
              </Card>
            ) : null}

            {groupedByTerm.map(([term, cards]) => (
              <div key={term} className="space-y-3">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{term}</p>
                {cards.map((card) => {
                  const child = childMap.get(card.child_id)
                  return (
                    <Card key={card.id} className="rounded-3xl border-slate-200 bg-white">
                      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{childFullName(child)}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Period {formatDisplayDate(card.period_start)} - {formatDisplayDate(card.period_end)}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {card.status === 'published'
                              ? `Published ${formatDisplayDate(card.published_at)}`
                              : 'Draft'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-bold',
                              card.status === 'published'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-amber-200 bg-amber-50 text-amber-700'
                            )}
                          >
                            {card.status === 'published' ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <Clock3 className="h-3.5 w-3.5" />
                            )}
                            {card.status}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 rounded-2xl border-slate-200 bg-white"
                            onClick={() => openEditForm(card)}
                          >
                            Open
                          </Button>
                          {card.status === 'draft' ? (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-10 rounded-2xl border-teal-200 bg-white text-teal-700 hover:bg-teal-50"
                                onClick={() => handlePublish(card.id)}
                                disabled={isPublishing}
                              >
                                <Send className="mr-1 h-4 w-4" />
                                Publish
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-10 rounded-2xl border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                                onClick={() => handleDelete(card.id)}
                                disabled={isDeleting}
                              >
                                <Trash2 className="mr-1 h-4 w-4" />
                                Delete
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ))}
          </>
        ) : null}

        {view === 'editor' ? (
          <>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-10 w-10 rounded-2xl border-slate-200 bg-white p-0"
                onClick={() => {
                  resetForm()
                  setView('list')
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-black text-slate-900">{editingId ? 'Edit Report Card' : 'New Report Card'}</h1>
                <p className="text-xs text-slate-500">Capture progress by development area.</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                <Card className="rounded-3xl border-slate-200 bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg">Details</CardTitle>
                    <CardDescription>Select child, term, and report period.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <label className="block space-y-1">
                      <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Child</span>
                      <select
                        value={selectedChildId}
                        onChange={(event) => setSelectedChildId(event.target.value)}
                        disabled={Boolean(editingId)}
                        className="cc-native-field h-12 rounded-2xl"
                      >
                        {enrolledChildren.map((child) => (
                          <option key={child.id} value={child.id}>
                            {childFullName(child)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block space-y-1">
                      <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Term</span>
                      <select
                        value={selectedTerm}
                        onChange={(event) => setSelectedTerm(event.target.value)}
                        disabled={Boolean(editingId)}
                        className="cc-native-field h-12 rounded-2xl"
                      >
                        {TERM_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block space-y-1">
                        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Period Start</span>
                        <Input
                          type="date"
                          className="h-12 rounded-2xl"
                          value={periodStart}
                          onChange={(event) => setPeriodStart(event.target.value)}
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Period End</span>
                        <Input
                          type="date"
                          className="h-12 rounded-2xl"
                          value={periodEnd}
                          onChange={(event) => setPeriodEnd(event.target.value)}
                        />
                      </label>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-slate-200 bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg">Teacher Comment</CardTitle>
                    <CardDescription>Share highlights and growth opportunities for this term.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      className="min-h-[150px] rounded-2xl"
                      placeholder="Overall progress summary..."
                      value={overallComment}
                      onChange={(event) => setOverallComment(event.target.value)}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="rounded-3xl border-slate-200 bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg">Development Areas</CardTitle>
                    <CardDescription>Rate each area from 1 to 5 and optionally add comments.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {areas.map((area, index) => (
                      <div key={`${area.area_name}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900">{area.area_name}</p>
                          <StarRating value={area.rating} onChange={(value) => updateAreaRating(index, value)} />
                        </div>
                        <Input
                          className="mt-3 h-10 rounded-2xl border-slate-200 bg-white"
                          placeholder={`Comment on ${area.area_name.toLowerCase()}...`}
                          value={area.comment ?? ''}
                          onChange={(event) => updateAreaComment(index, event.target.value)}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Button
                    type="button"
                    className="h-12 w-full rounded-3xl bg-white text-teal-700 border border-teal-200 hover:bg-teal-50"
                    onClick={() => handleSave(false)}
                    disabled={isSaving || isPublishing}
                  >
                    {isSaving ? 'Saving...' : 'Save Draft'}
                  </Button>
                  <Button
                    type="button"
                    className="h-12 w-full rounded-3xl bg-teal-600 text-white hover:bg-teal-700"
                    onClick={() => handleSave(true)}
                    disabled={isSaving || isPublishing}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {isPublishing ? 'Publishing...' : 'Save & Publish'}
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </EcdOsShell>
  )
}
