import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { FileText, Info, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ParentAppShell } from '@/components/layout/parent-app-shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Report Cards - CentreConnect',
  description: "View your children's term progress reports from their creche.",
}

type EnrolledApplicationRow = {
  child_id: string | null
  children:
    | {
        id: string
        first_name: string | null
        last_name: string | null
      }
    | Array<{
        id: string
        first_name: string | null
        last_name: string | null
      }>
    | null
  ecd_centres:
    | {
        name: string | null
      }
    | Array<{
        name: string | null
      }>
    | null
}

type ReportCardRow = {
  id: string
  child_id: string
  term: string
  period_start: string | null
  period_end: string | null
  published_at: string | null
  teacher_name: string | null
  overall_comment: string | null
  report_card_areas:
    | Array<{
        area_name: string
        rating: number
        comment: string | null
        sort_order: number
      }>
    | null
}

const RATING_LABELS: Record<number, string> = {
  1: 'Needs Support',
  2: 'Developing',
  3: 'Competent',
  4: 'Proficient',
  5: 'Excelling',
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function averageRating(areas: Array<{ rating: number }>) {
  if (areas.length === 0) return 0
  return Math.round((areas.reduce((sum, area) => sum + area.rating, 0) / areas.length) * 10) / 10
}

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((level) => (
        <Star
          key={level}
          className={cn('h-4 w-4', level <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-200')}
        />
      ))}
    </div>
  )
}

export default async function ParentReportCardsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: enrolledApplications } = await supabase
    .from('applications')
    .select('child_id,children(id,first_name,last_name),ecd_centres(name)')
    .eq('parent_id', user.id)
    .eq('status', 'enrolled')
    .order('submitted_at', { ascending: false })
    .limit(200)

  const childMeta = new Map<string, { firstName: string; lastName: string; centreName: string }>()

  for (const row of (enrolledApplications ?? []) as EnrolledApplicationRow[]) {
    const child = normalizeOne(row.children)
    const childId = child?.id ?? row.child_id
    if (!childId || childMeta.has(childId)) continue
    const centre = normalizeOne(row.ecd_centres)
    childMeta.set(childId, {
      firstName: child?.first_name?.trim() || 'Child',
      lastName: child?.last_name?.trim() || '',
      centreName: centre?.name?.trim() || 'Creche',
    })
  }

  const childIds = Array.from(childMeta.keys())

  if (childIds.length === 0) {
    return (
      <ParentAppShell>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Info className="mb-4 h-12 w-12 text-slate-300" />
          <h2 className="text-lg font-bold text-slate-900">No enrolled children</h2>
          <p className="mt-1 text-sm text-slate-500">Report cards appear here once your child is enrolled.</p>
        </div>
      </ParentAppShell>
    )
  }

  const { data: reportCardsRows } = await supabase
    .from('report_cards')
    .select(
      'id,child_id,term,period_start,period_end,published_at,teacher_name,overall_comment,report_card_areas(area_name,rating,comment,sort_order)'
    )
    .in('child_id', childIds)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(250)

  const reportCards = (reportCardsRows ?? []) as ReportCardRow[]

  return (
    <ParentAppShell>
      <section className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Report Cards</h1>
          <p className="text-sm text-slate-500">Term progress reports from your children&apos;s creche.</p>
        </header>

        {reportCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="mb-4 h-12 w-12 text-slate-200" />
            <h2 className="text-lg font-bold text-slate-700">No report cards yet</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Your child&apos;s creche will share progress reports here as soon as they are published.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {reportCards.map((card) => {
              const child = childMeta.get(card.child_id)
              const areas = [...(card.report_card_areas ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              const average = averageRating(areas.map((area) => ({ rating: area.rating })))

              return (
                <Card key={card.id} className="overflow-hidden rounded-3xl border-cyan-100">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/60">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg">
                          {child?.firstName} {child?.lastName}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {card.term}
                          {child?.centreName ? <span className="text-slate-400"> · {child.centreName}</span> : null}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span className="text-lg font-black text-slate-900">{average}</span>
                          <span className="text-xs font-medium text-slate-400">/5</span>
                        </div>
                        {card.published_at ? (
                          <p className="mt-0.5 text-[11px] font-bold text-emerald-600">
                            {new Date(card.published_at).toLocaleDateString('en-ZA', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-5 pt-6">
                    <div className="space-y-4">
                      {areas.map((area) => (
                        <div key={`${card.id}-${area.area_name}`} className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-bold text-slate-800">{area.area_name}</p>
                            <div className="flex items-center gap-2">
                              <StarDisplay value={area.rating} />
                              <span className="w-[90px] text-right text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                {RATING_LABELS[area.rating] ?? ''}
                              </span>
                            </div>
                          </div>

                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                area.rating >= 4
                                  ? 'bg-emerald-400'
                                  : area.rating >= 3
                                    ? 'bg-cyan-400'
                                    : area.rating >= 2
                                      ? 'bg-amber-400'
                                      : 'bg-rose-400'
                              )}
                              style={{ width: `${(area.rating / 5) * 100}%` }}
                            />
                          </div>

                          {area.comment ? (
                            <p className="pl-1 text-xs italic text-slate-500">&quot;{area.comment}&quot;</p>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    {card.overall_comment ? (
                      <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
                        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">Teacher Comment</p>
                        <p className="text-sm italic leading-relaxed text-slate-700">&quot;{card.overall_comment}&quot;</p>
                        {card.teacher_name ? <p className="mt-2 text-xs font-bold text-slate-500">— {card.teacher_name}</p> : null}
                      </div>
                    ) : null}

                    {(card.period_start || card.period_end) ? (
                      <p className="text-center text-[11px] font-medium text-slate-400">
                        Period {card.period_start ? new Date(card.period_start).toLocaleDateString('en-ZA') : '...'} —{' '}
                        {card.period_end ? new Date(card.period_end).toLocaleDateString('en-ZA') : '...'}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </ParentAppShell>
  )
}
