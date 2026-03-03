'use client'

import { useState } from 'react'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  saveReportCardAction,
  publishReportCardAction,
  deleteReportCardAction,
  DEFAULT_DEVELOPMENT_AREAS,
  type SaveReportCardInput,
} from '@/lib/actions/ecd/report-cards'
import {
  FileText,
  Plus,
  Star,
  Send,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ChevronRight,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────
type Child = {
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

type ReportCard = {
  id: string
  child_id: string
  term: string
  period_start: string | null
  period_end: string | null
  status: string
  teacher_name: string | null
  overall_comment: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  report_card_areas: ReportCardArea[]
}

type ReportCardsClientProps = {
  enrolledChildren: Child[]
  initialReportCards: ReportCard[]
  ecdId: string
  userRoleLabel: string
  userEmail: string
  userRole: 'ecd_admin' | 'ecd_staff' | 'ecd_supervisor'
}

// ── Star Rating Component ────────────────────────────────────────
function StarRating({
  value,
  onChange,
  readonly = false,
}: {
  value: number
  onChange?: (v: number) => void
  readonly?: boolean
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={cn(
            'h-8 w-8 rounded-xl flex items-center justify-center transition-colors',
            star <= value
              ? 'bg-amber-100 text-amber-500'
              : 'bg-slate-50 text-slate-300',
            !readonly && 'hover:bg-amber-50 cursor-pointer',
            readonly && 'cursor-default'
          )}
        >
          <Star className={cn('h-4 w-4', star <= value && 'fill-current')} />
        </button>
      ))}
    </div>
  )
}

// ── Term Options ─────────────────────────────────────────────────
const currentYear = new Date().getFullYear()
const TERM_OPTIONS = [
  `Term 1 ${currentYear}`,
  `Term 2 ${currentYear}`,
  `Term 3 ${currentYear}`,
  `Term 4 ${currentYear}`,
]

// ── Main Client Component ────────────────────────────────────────
export function ReportCardsClient({
  enrolledChildren,
  initialReportCards,
  userRoleLabel,
  userEmail,
  userRole,
}: ReportCardsClientProps) {
  const [reportCards, setReportCards] = useState<ReportCard[]>(initialReportCards)
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  // ── Form State ──
  const [selectedChildId, setSelectedChildId] = useState<string>(
    enrolledChildren[0]?.id ?? ''
  )
  const [selectedTerm, setSelectedTerm] = useState<string>(TERM_OPTIONS[0])
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [overallComment, setOverallComment] = useState('')
  const [areas, setAreas] = useState<ReportCardArea[]>(
    DEFAULT_DEVELOPMENT_AREAS.map((name, i) => ({
      area_name: name,
      rating: 3,
      comment: null,
      sort_order: i,
    }))
  )

  // ── Helpers ──
  function resetForm() {
    setSelectedChildId(enrolledChildren[0]?.id ?? '')
    setSelectedTerm(TERM_OPTIONS[0])
    setPeriodStart('')
    setPeriodEnd('')
    setOverallComment('')
    setAreas(
      DEFAULT_DEVELOPMENT_AREAS.map((name, i) => ({
        area_name: name,
        rating: 3,
        comment: null,
        sort_order: i,
      }))
    )
    setEditingId(null)
  }

  function loadReportCardIntoForm(rc: ReportCard) {
    setSelectedChildId(rc.child_id)
    setSelectedTerm(rc.term)
    setPeriodStart(rc.period_start ?? '')
    setPeriodEnd(rc.period_end ?? '')
    setOverallComment(rc.overall_comment ?? '')
    setAreas(
      rc.report_card_areas.length > 0
        ? rc.report_card_areas.map((a) => ({
            area_name: a.area_name,
            rating: a.rating,
            comment: a.comment,
            sort_order: a.sort_order,
          }))
        : DEFAULT_DEVELOPMENT_AREAS.map((name, i) => ({
            area_name: name,
            rating: 3,
            comment: null,
            sort_order: i,
          }))
    )
    setEditingId(rc.id)
  }

  function updateAreaRating(index: number, rating: number) {
    setAreas((prev) =>
      prev.map((a, i) => (i === index ? { ...a, rating } : a))
    )
  }

  function updateAreaComment(index: number, comment: string) {
    setAreas((prev) =>
      prev.map((a, i) => (i === index ? { ...a, comment: comment || null } : a))
    )
  }

  function getChildName(childId: string) {
    const child = enrolledChildren.find((c) => c.id === childId)
    return child ? `${child.first_name} ${child.last_name}` : 'Unknown'
  }

  // ── Handlers ──
  async function handleSave() {
    setIsSaving(true)
    const payload: SaveReportCardInput = {
      id: editingId,
      child_id: selectedChildId,
      term: selectedTerm,
      period_start: periodStart || null,
      period_end: periodEnd || null,
      overall_comment: overallComment || null,
      areas,
    }

    const result = await saveReportCardAction(payload)
    setIsSaving(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success(result.message)

    // Refresh: optimistically add/update in local state
    if (editingId && result.reportCardId) {
      setReportCards((prev) =>
        prev.map((rc) =>
          rc.id === editingId
            ? {
                ...rc,
                term: selectedTerm,
                period_start: periodStart || null,
                period_end: periodEnd || null,
                overall_comment: overallComment || null,
                updated_at: new Date().toISOString(),
                report_card_areas: areas,
              }
            : rc
        )
      )
    } else if (result.reportCardId) {
      setReportCards((prev) => [
        {
          id: result.reportCardId!,
          child_id: selectedChildId,
          term: selectedTerm,
          period_start: periodStart || null,
          period_end: periodEnd || null,
          status: 'draft',
          teacher_name: null,
          overall_comment: overallComment || null,
          published_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          report_card_areas: areas,
        },
        ...prev,
      ])
    }

    resetForm()
    setView('list')
  }

  async function handlePublish(rcId: string) {
    setIsPublishing(true)
    const result = await publishReportCardAction(rcId)
    setIsPublishing(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success(result.message)
    setReportCards((prev) =>
      prev.map((rc) =>
        rc.id === rcId
          ? { ...rc, status: 'published', published_at: new Date().toISOString() }
          : rc
      )
    )
  }

  async function handleDelete(rcId: string) {
    const result = await deleteReportCardAction(rcId)
    if (!result.success) {
      toast.error(result.message)
      return
    }
    toast.success(result.message)
    setReportCards((prev) => prev.filter((rc) => rc.id !== rcId))
  }

  // ── Group report cards by term ──
  const termGroups: Record<string, ReportCard[]> = {}
  for (const rc of reportCards) {
    if (!termGroups[rc.term]) termGroups[rc.term] = []
    termGroups[rc.term].push(rc)
  }
  const sortedTerms = Object.keys(termGroups).sort().reverse()

  // ── Render ──
  return (
    <EcdOsShell
      title="Report Cards"
      description="Create and share child progress reports with parents."
      roleLabel={userRoleLabel}
      userEmail={userEmail}
      userRole={userRole}
    >
      <div className="space-y-6">
        {/* ── List View ── */}
        {view === 'list' && (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  Report Cards
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {reportCards.length} report card{reportCards.length !== 1 ? 's' : ''} total
                </p>
              </div>
              {enrolledChildren.length > 0 && (
                <Button
                  onClick={() => {
                    resetForm()
                    setView('create')
                  }}
                  className="rounded-2xl bg-cyan-600 hover:bg-cyan-700 font-bold text-white shadow-lg shadow-cyan-900/20 h-12 px-6"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  New Report Card
                </Button>
              )}
            </div>

            {enrolledChildren.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-200 bg-white">
                <FileText className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm font-bold text-slate-500">
                  No enrolled children to create report cards for.
                </p>
              </div>
            ) : reportCards.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-200 bg-white">
                <FileText className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm font-bold text-slate-500">
                  No report cards yet. Create one to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {sortedTerms.map((term) => (
                  <div key={term}>
                    <h2 className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                      {term}
                    </h2>
                    <div className="space-y-3">
                      {termGroups[term].map((rc) => (
                        <Card
                          key={rc.id}
                          className="overflow-hidden border-slate-100 bg-white"
                        >
                          <div className="flex items-center justify-between p-5">
                            <div className="flex items-center gap-4 min-w-0">
                              <div
                                className={cn(
                                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                                  rc.status === 'published'
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'bg-amber-50 text-amber-600'
                                )}
                              >
                                {rc.status === 'published' ? (
                                  <CheckCircle2 className="h-5 w-5" />
                                ) : (
                                  <Clock className="h-5 w-5" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black text-slate-900 truncate">
                                  {getChildName(rc.child_id)}
                                </p>
                                <p className="text-xs text-slate-500 font-medium">
                                  {rc.status === 'published' ? (
                                    <span className="text-emerald-600">
                                      Published{' '}
                                      {rc.published_at
                                        ? new Date(rc.published_at).toLocaleDateString('en-ZA')
                                        : ''}
                                    </span>
                                  ) : (
                                    <span className="text-amber-600">Draft</span>
                                  )}
                                  {rc.teacher_name && (
                                    <span className="text-slate-400">
                                      {' '}
                                      &middot; by {rc.teacher_name}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {rc.status === 'draft' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePublish(rc.id)}
                                    disabled={isPublishing}
                                    className="rounded-2xl text-cyan-600 hover:bg-cyan-50 font-bold"
                                  >
                                    <Send className="h-4 w-4 mr-1" />
                                    Publish
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(rc.id)}
                                    className="rounded-2xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              <button
                                onClick={() => {
                                  loadReportCardIntoForm(rc)
                                  setView('edit')
                                }}
                                className="flex h-9 w-9 items-center justify-center rounded-2xl text-slate-300 hover:bg-slate-50 hover:text-slate-600"
                              >
                                <ChevronRight className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Create / Edit View ── */}
        {(view === 'create' || view === 'edit') && (
          <>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  resetForm()
                  setView('list')
                }}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-600 hover:bg-cyan-50 hover:text-cyan-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900">
                  {view === 'edit' ? 'Edit Report Card' : 'New Report Card'}
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Fill in development areas and overall progress.
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Left Column: Child & Term Selection */}
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-cyan-600" />
                      Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Child Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">
                        Child
                      </label>
                      <select
                        value={selectedChildId}
                        onChange={(e) => setSelectedChildId(e.target.value)}
                        disabled={view === 'edit'}
                        className="cc-native-field h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 disabled:opacity-60"
                      >
                        {enrolledChildren.map((child) => (
                          <option key={child.id} value={child.id}>
                            {child.first_name} {child.last_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Term Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">
                        Term
                      </label>
                      <select
                        value={selectedTerm}
                        onChange={(e) => setSelectedTerm(e.target.value)}
                        disabled={view === 'edit'}
                        className="cc-native-field h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 disabled:opacity-60"
                      >
                        {TERM_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Period */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">
                          Period Start
                        </label>
                        <input
                          type="date"
                          value={periodStart}
                          onChange={(e) => setPeriodStart(e.target.value)}
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">
                          Period End
                        </label>
                        <input
                          type="date"
                          value={periodEnd}
                          onChange={(e) => setPeriodEnd(e.target.value)}
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Overall Comment */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Overall Comment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Share overall progress and highlights for this term..."
                      value={overallComment}
                      onChange={(e) => setOverallComment(e.target.value)}
                      className="min-h-[120px] rounded-2xl border-slate-200 bg-slate-50/50"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Development Areas */}
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="h-5 w-5 text-amber-500" />
                      Development Areas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {areas.map((area, index) => (
                      <div
                        key={area.area_name}
                        className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-black text-slate-800">
                            {area.area_name}
                          </p>
                          <StarRating
                            value={area.rating}
                            onChange={(r) => updateAreaRating(index, r)}
                          />
                        </div>
                        <input
                          type="text"
                          placeholder={`Comment on ${area.area_name.toLowerCase()}...`}
                          value={area.comment ?? ''}
                          onChange={(e) => updateAreaComment(index, e.target.value)}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || !selectedChildId}
                    variant="outline"
                    size="lg"
                    className="rounded-2xl font-bold border-cyan-200 text-cyan-700 hover:bg-cyan-50"
                  >
                    {isSaving ? 'Saving...' : 'Save as Draft'}
                  </Button>
                  <Button
                    onClick={async () => {
                      await handleSave()
                      // After save, publish if we have an editing ID
                      if (editingId) {
                        await handlePublish(editingId)
                      }
                    }}
                    disabled={isSaving || isPublishing || !selectedChildId}
                    size="lg"
                    className="rounded-2xl font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-900/20 h-14"
                  >
                    <Send className="mr-2 h-5 w-5" />
                    {isPublishing ? 'Publishing...' : 'Save & Publish to Parents'}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </EcdOsShell>
  )
}
