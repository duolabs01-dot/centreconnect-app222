'use client'

import { useState } from 'react'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { 
  Coffee, 
  Utensils, 
  Cookie, 
  Smile, 
  Laugh, 
  Moon, 
  CloudRain, 
  Frown,
  CheckCircle2,
  Share
} from 'lucide-react'

type Child = {
  id: string
  first_name: string
  last_name: string
}

type DailyReport = {
  id?: string
  breakfast_eaten?: string
  lunch_eaten?: string
  snack_eaten?: string
  mood?: string
  nap_start?: string
  nap_end?: string
  nap_quality?: string
  activities?: string[]
  teacher_notes?: string
  published_at?: string
}

type DailyReportsClientProps = {
  enrolledChildren: Child[]
  initialReportsByChild: Record<string, DailyReport>
  ecdId: string
  todayDate: string
  staffId: string
  userRoleLabel: string
  userEmail: string
}

const MOODS = [
  { value: 'happy', label: 'Happy', icon: Laugh },
  { value: 'good', label: 'Good', icon: Smile },
  { value: 'tired', label: 'Tired', icon: Moon },
  { value: 'unsettled', label: 'Unsettled', icon: CloudRain },
  { value: 'upset', label: 'Upset', icon: Frown },
]

const EATEN_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'some', label: 'Some' },
  { value: 'none', label: 'None' },
  { value: 'not_offered', label: 'N/A' },
]

const ACTIVITIES = [
  'Painting', 'Outdoor Play', 'Story Time', 'Music', 'Numbers', 'Art', 'Games', 'Other'
]

export function DailyReportsClient({
  enrolledChildren,
  initialReportsByChild,
  ecdId,
  todayDate,
  staffId,
  userRoleLabel,
  userEmail
}: DailyReportsClientProps) {
  const supabase = createClient()
  const [selectedChildId, setSelectedChildId] = useState<string | null>(
    enrolledChildren.length > 0 ? enrolledChildren[0].id : null
  )
  const [reports, setReports] = useState<Record<string, DailyReport>>(initialReportsByChild)
  const [isSaving, setIsSaving] = useState(false)

  const selectedChild = enrolledChildren.find(c => c.id === selectedChildId)
  const currentReport = selectedChildId ? (reports[selectedChildId] || {}) : {}

  const updateReport = (childId: string, updates: Partial<DailyReport>) => {
    setReports(prev => ({
      ...prev,
      [childId]: { ...prev[childId], ...updates }
    }))
  }

  const handleSave = async (publish: boolean = false) => {
    if (!selectedChildId) return
    setIsSaving(true)

    const reportToSave = {
      ecd_id: ecdId,
      child_id: selectedChildId,
      report_date: todayDate,
      ...currentReport,
      updated_at: new Date().toISOString()
    }

    if (publish) {
      reportToSave.published_at = new Date().toISOString()
      reportToSave.published_by = staffId
    }

    try {
      const { data, error } = await supabase
        .from('child_daily_reports')
        .upsert(reportToSave, { onConflict: 'ecd_id,child_id,report_date' })
        .select()
        .single()

      if (error) throw error

      setReports(prev => ({
        ...prev,
        [selectedChildId]: data
      }))
      
      toast.success(publish ? 'Report published to parents!' : 'Draft saved successfully')
    } catch (err) {
      console.error('Error saving report:', err)
      toast.error('Failed to save report')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleActivity = (activity: string) => {
    if (!selectedChildId) return
    const currentActivities = currentReport.activities || []
    const newActivities = currentActivities.includes(activity)
      ? currentActivities.filter(a => a !== activity)
      : [...currentActivities, activity]
    updateReport(selectedChildId, { activities: newActivities })
  }

  return (
    <EcdOsShell
      title="Daily Reports"
      description="Update parents on their child's daily progress."
      roleLabel={userRoleLabel}
      userEmail={userEmail}
    >
      <div className="space-y-6">
        {/* Child Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {enrolledChildren.map((child) => (
            <button
              key={child.id}
              onClick={() => setSelectedChildId(child.id)}
              className={cn(
                "h-12 shrink-0 rounded-full px-5 text-sm font-bold transition-all",
                selectedChildId === child.id
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-900/20"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              )}
            >
              {child.first_name} {reports[child.id]?.published_at ? '✅' : ''}
            </button>
          ))}
        </div>

        {selectedChild ? (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
              {/* Meals Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Utensils className="h-5 w-5 text-cyan-600" />
                    Meals
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    { key: 'breakfast_eaten', label: 'Breakfast', icon: Coffee },
                    { key: 'lunch_eaten', label: 'Lunch', icon: Utensils },
                    { key: 'snack_eaten', label: 'Snack', icon: Cookie },
                  ].map((meal) => (
                    <div key={meal.key} className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <meal.icon className="h-4 w-4 text-slate-400" />
                        {meal.label}
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {EATEN_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => updateReport(selectedChild.id, { [meal.key]: opt.value })}
                            className={cn(
                              "h-11 rounded-lg text-xs font-bold transition-all",
                              (currentReport as any)[meal.key] === opt.value
                                ? "bg-cyan-100 text-cyan-800 border-2 border-cyan-300"
                                : "bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Mood Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Smile className="h-5 w-5 text-cyan-600" />
                    Today's Mood
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-2">
                    {MOODS.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => updateReport(selectedChild.id, { mood: m.value })}
                        className={cn(
                          "flex flex-col items-center justify-center h-20 rounded-xl transition-all",
                          currentReport.mood === m.value
                            ? "bg-amber-100 text-amber-900 border-2 border-amber-300 shadow-sm"
                            : "bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100"
                        )}
                      >
                        <m.icon className={cn("h-7 w-7 mb-1", currentReport.mood === m.value ? "text-amber-600" : "text-slate-400")} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Nap & Activities */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-cyan-600" />
                    Activities & Rest
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Nap Times */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Nap Start</label>
                      <input
                        type="time"
                        value={currentReport.nap_start || ''}
                        onChange={(e) => updateReport(selectedChild.id, { nap_start: e.target.value })}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Nap End</label>
                      <input
                        type="time"
                        value={currentReport.nap_end || ''}
                        onChange={(e) => updateReport(selectedChild.id, { nap_end: e.target.value })}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Activities */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase">Activities Today</label>
                    <div className="flex flex-wrap gap-2">
                      {ACTIVITIES.map((act) => (
                        <button
                          key={act}
                          onClick={() => toggleActivity(act)}
                          className={cn(
                            "h-10 px-4 rounded-full text-xs font-bold transition-all border",
                            currentReport.activities?.includes(act)
                              ? "bg-cyan-600 text-white border-cyan-600 shadow-sm"
                              : "bg-white text-slate-600 border-slate-200 hover:border-cyan-300"
                          )}
                        >
                          {act}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Teacher's Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Share some highlights about their day..."
                    value={currentReport.teacher_notes || ''}
                    onChange={(e) => updateReport(selectedChild.id, { teacher_notes: e.target.value })}
                    className="min-h-[120px] rounded-xl border-slate-200 bg-slate-50/50"
                  />
                  
                  <div className="mt-6 flex flex-col gap-3">
                    <Button 
                      onClick={() => handleSave(false)}
                      disabled={isSaving}
                      variant="outline"
                      className="h-12 rounded-xl font-bold border-cyan-200 text-cyan-700 hover:bg-cyan-50"
                    >
                      {isSaving ? 'Saving...' : 'Save as Draft'}
                    </Button>
                    <Button 
                      onClick={() => handleSave(true)}
                      disabled={isSaving}
                      className="h-14 rounded-xl font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-900/20"
                    >
                      <Share className="mr-2 h-5 w-5" />
                      {currentReport.published_at ? 'Update Published Report' : 'Publish to Parents'}
                    </Button>
                  </div>
                  
                  {currentReport.published_at && (
                    <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                      Last published {new Date(currentReport.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white">
            <p className="text-sm font-semibold text-slate-500">No enrolled children found to report on.</p>
          </div>
        )}
      </div>
    </EcdOsShell>
  )
}
