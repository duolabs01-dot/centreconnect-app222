// app/parent/daily-reports/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ParentAppShell } from '@/components/layout/parent-app-shell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { getJohannesburgNowParts } from '@/lib/utils'
import { 
  Smile, 
  Laugh, 
  Zzz, 
  CloudRain, 
  Frown, 
  Utensils, 
  Coffee, 
  Cookie, 
  CheckCircle2, 
  Moon,
  Info
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Daily Reports - CentreConnect',
  description: 'View today\'s progress, meals, and activities for your children.',
}

const MOOD_MAP: Record<string, { label: string, icon: any, color: string }> = {
  happy: { label: 'Happy', icon: Laugh, color: 'text-amber-500' },
  good: { label: 'Good', icon: Smile, color: 'text-emerald-500' },
  tired: { label: 'Tired', icon: Zzz, color: 'text-slate-500' },
  unsettled: { label: 'Unsettled', icon: CloudRain, color: 'text-blue-500' },
  upset: { label: 'Upset', icon: Frown, color: 'text-rose-500' },
}

export default async function ParentDailyReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { year, month, day } = getJohannesburgNowParts()
  const todayDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  // 1. Get enrolled children
  const { data: applications } = await supabase
    .from('applications')
    .select('child_id, children(id, first_name, last_name)')
    .eq('parent_id', user.id)
    .eq('status', 'enrolled')

  if (!applications || applications.length === 0) {
    return (
      <ParentAppShell>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Info className="h-12 w-12 text-slate-300 mb-4" />
          <h2 className="text-lg font-bold text-slate-900">No Enrolled Children</h2>
          <p className="mt-1 text-sm text-slate-500">Daily reports are only available for enrolled children.</p>
        </div>
      </ParentAppShell>
    )
  }

  const childIds = applications.map(a => a.child_id)
  
  // 2. Get published reports for today
  const { data: reports } = await supabase
    .from('child_daily_reports')
    .select('*')
    .in('child_id', childIds)
    .eq('report_date', todayDate)
    .not('published_at', 'is', null)

  const reportsByChild: Record<string, any> = {}
  reports?.forEach(r => { reportsByChild[r.child_id] = r })

  return (
    <ParentAppShell>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Today's Reports</h1>
          <p className="text-sm text-slate-500">{new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </header>

        {applications.map((app: any) => {
          const child = Array.isArray(app.children) ? app.children[0] : app.children
          const report = reportsByChild[child.id]
          const mood = report?.mood ? MOOD_MAP[report.mood] : null

          return (
            <Card key={child.id} className="overflow-hidden border-cyan-100">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{child.first_name} {child.last_name}</span>
                  {report && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                      Received {new Date(report.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {!report ? (
                  <div className="py-8 text-center">
                    <Zzz className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-500">Today's report is being prepared by the teacher.</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Mood & Notes */}
                    <div className="flex items-start gap-4">
                      {mood && (
                        <div className="flex flex-col items-center shrink-0">
                          <div className={cn("h-16 w-16 rounded-2xl bg-white border-2 border-slate-50 shadow-sm flex items-center justify-center", mood.color)}>
                            <mood.icon className="h-10 w-10" />
                          </div>
                          <span className="mt-2 text-[10px] font-black uppercase tracking-wider text-slate-400">{mood.label}</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm italic text-slate-700 leading-relaxed">
                          "{report.teacher_notes || "Your child had a productive day at the centre today!"}"
                        </p>
                      </div>
                    </div>

                    {/* Meals Grid */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Breakfast', key: 'breakfast_eaten', icon: Coffee },
                        { label: 'Lunch', key: 'lunch_eaten', icon: Utensils },
                        { label: 'Snack', key: 'snack_eaten', icon: Cookie },
                      ].map(meal => (
                        <div key={meal.key} className="rounded-xl bg-slate-50 p-3 text-center">
                          <meal.icon className="h-4 w-4 text-slate-400 mx-auto mb-2" />
                          <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">{meal.label}</p>
                          <p className="text-xs font-black text-cyan-700 uppercase tracking-tight">
                            {report[meal.key]?.replace('_', ' ') || 'N/A'}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Activities & Rest */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                          <CheckCircle2 className="h-4 w-4 text-cyan-600" />
                          Activities Today
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(report.activities || ['Classroom learning']).map((act: string) => (
                            <span key={act} className="px-3 py-1 bg-cyan-50 text-cyan-700 text-[11px] font-bold rounded-full border border-cyan-100">
                              {act}
                            </span>
                          ))}
                        </div>
                      </div>

                      {report.nap_start && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                            <Moon className="h-4 w-4 text-amber-500" />
                            Rest & Nap
                          </div>
                          <p className="text-xs text-slate-600 font-medium bg-amber-50/50 p-2 rounded-lg border border-amber-100/50">
                            Slept from <span className="font-bold">{report.nap_start}</span> to <span className="font-bold">{report.nap_end || '...'}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </ParentAppShell>
  )
}
