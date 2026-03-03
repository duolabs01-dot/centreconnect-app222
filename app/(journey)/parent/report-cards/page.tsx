import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ParentAppShell } from '@/components/layout/parent-app-shell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { FileText, Star, Info } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Report Cards - CentreConnect',
  description: 'View your children\'s term progress reports from their creche.',
}

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'h-4 w-4',
            star <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
          )}
        />
      ))}
    </div>
  )
}

const RATING_LABELS: Record<number, string> = {
  1: 'Needs Support',
  2: 'Developing',
  3: 'Competent',
  4: 'Proficient',
  5: 'Excelling',
}

export default async function ParentReportCardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 1. Get enrolled children
  const { data: applications } = await supabase
    .from('applications')
    .select('child_id, children(id, first_name, last_name), ecd_id, ecd_centres(name)')
    .eq('parent_id', user.id)
    .eq('status', 'enrolled')

  if (!applications || applications.length === 0) {
    return (
      <ParentAppShell>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Info className="h-12 w-12 text-slate-300 mb-4" />
          <h2 className="text-lg font-bold text-slate-900">No Enrolled Children</h2>
          <p className="mt-1 text-sm text-slate-500">
            Report cards are only available for enrolled children.
          </p>
        </div>
      </ParentAppShell>
    )
  }

  const childIds = applications.map((a) => a.child_id)

  // 2. Get published report cards with areas
  const { data: reportCards } = await supabase
    .from('report_cards')
    .select('*,report_card_areas(*)')
    .in('child_id', childIds)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50)

  // Build lookup maps
  const childMap: Record<string, { first_name: string; last_name: string; centre_name: string }> = {}
  for (const app of applications) {
    const child = Array.isArray(app.children) ? app.children[0] : app.children
    const centre = Array.isArray(app.ecd_centres) ? app.ecd_centres[0] : app.ecd_centres
    if (child?.id) {
      childMap[child.id] = {
        first_name: (child as any).first_name ?? 'Child',
        last_name: (child as any).last_name ?? '',
        centre_name: (centre as any)?.name ?? 'Creche',
      }
    }
  }

  return (
    <ParentAppShell>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Report Cards</h1>
          <p className="text-sm text-slate-500">
            Term progress reports from your children&apos;s creche.
          </p>
        </header>

        {(!reportCards || reportCards.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-slate-200 mb-4" />
            <h2 className="text-lg font-bold text-slate-700">No Report Cards Yet</h2>
            <p className="mt-1 text-sm text-slate-500 max-w-sm">
              Your children&apos;s creche will share progress reports here when they are ready.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {reportCards.map((rc: any) => {
              const child = childMap[rc.child_id]
              const areas = (rc.report_card_areas ?? []).sort(
                (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
              )
              const avgRating =
                areas.length > 0
                  ? Math.round(
                      (areas.reduce((sum: number, a: any) => sum + a.rating, 0) /
                        areas.length) *
                        10
                    ) / 10
                  : 0

              return (
                <Card key={rc.id} className="overflow-hidden border-cyan-100">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {child?.first_name} {child?.last_name}
                        </CardTitle>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {rc.term}
                          {child?.centre_name && (
                            <span className="text-slate-400"> &middot; {child.centre_name}</span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1.5">
                          <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                          <span className="text-lg font-black text-slate-900">{avgRating}</span>
                          <span className="text-xs text-slate-400 font-medium">/5</span>
                        </div>
                        {rc.published_at && (
                          <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                            {new Date(rc.published_at).toLocaleDateString('en-ZA', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {/* Development Areas */}
                    <div className="space-y-4">
                      {areas.map((area: any) => (
                        <div key={area.area_name} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-slate-800">
                              {area.area_name}
                            </p>
                            <div className="flex items-center gap-2">
                              <StarDisplay value={area.rating} />
                              <span className="text-[10px] font-bold text-slate-400 uppercase w-20 text-right">
                                {RATING_LABELS[area.rating] ?? ''}
                              </span>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
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
                          {area.comment && (
                            <p className="text-xs text-slate-500 italic pl-1">
                              &quot;{area.comment}&quot;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Overall Comment */}
                    {rc.overall_comment && (
                      <div className="rounded-2xl bg-cyan-50/50 border border-cyan-100 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600 mb-2">
                          Teacher&apos;s Comment
                        </p>
                        <p className="text-sm text-slate-700 leading-relaxed italic">
                          &quot;{rc.overall_comment}&quot;
                        </p>
                        {rc.teacher_name && (
                          <p className="text-xs text-slate-400 font-bold mt-2">
                            — {rc.teacher_name}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Period info */}
                    {(rc.period_start || rc.period_end) && (
                      <p className="text-[10px] text-slate-400 font-medium text-center">
                        Period:{' '}
                        {rc.period_start
                          ? new Date(rc.period_start).toLocaleDateString('en-ZA')
                          : '...'}
                        {' — '}
                        {rc.period_end
                          ? new Date(rc.period_end).toLocaleDateString('en-ZA')
                          : '...'}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </ParentAppShell>
  )
}
