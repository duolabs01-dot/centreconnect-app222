import type { Metadata } from 'next'
import Link from 'next/link'

import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { createWeeklyPlanAction, updateWeeklyTaskStatusAction } from './actions'

export const metadata: Metadata = {
  title: 'Weekly Staff Plan - CentreConnect',
  description: 'Plan the week, delegate daily tasks, and track staff progress in one place.',
}

type TeamMemberRow = {
  user_id: string
  role: 'ecd_admin' | 'ecd_supervisor' | 'ecd_staff'
  user_profiles: { full_name: string | null } | Array<{ full_name: string | null }> | null
}

type PlanRow = {
  id: string
  week_of: string
  title: string
  theme: string | null
}

type TaskRow = {
  id: string
  plan_id: string
  day_of_week: number
  bucket: string
  title: string
  details: string | null
  status: 'pending' | 'in_progress' | 'done' | 'blocked'
  assigned_to: string | null
}

const DAY_LABELS = new Map([
  [1, 'Monday'],
  [2, 'Tuesday'],
  [3, 'Wednesday'],
  [4, 'Thursday'],
  [5, 'Friday'],
])

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function startOfWeekIso() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  now.setDate(now.getDate() + diff)
  return now.toISOString().slice(0, 10)
}

function roleLabel(role: TeamMemberRow['role']) {
  if (role === 'ecd_admin') return 'ECD Admin'
  if (role === 'ecd_supervisor') return 'Supervisor'
  return 'Staff Member'
}

export default async function TeamPlansPage({
  searchParams,
}: {
  searchParams?: { success?: string; error?: string }
}) {
  const { supabase, user, role, ecdId } = await requireEcdPortalSession()

  const [{ data: teamMembers }, { data: currentPlan }, { data: tasks }, { data: centre }] = await Promise.all([
    supabase
      .from('ecd_admins')
      .select('user_id,role,user_profiles!ecd_admins_user_id_fkey(full_name)')
      .eq('ecd_id', ecdId)
      .order('invited_at', { ascending: true }),
    supabase
      .from('ecd_weekly_plans')
      .select('id,week_of,title,theme')
      .eq('ecd_id', ecdId)
      .order('week_of', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('ecd_weekly_plan_tasks')
      .select('id,plan_id,day_of_week,bucket,title,details,status,assigned_to')
      .eq('ecd_id', ecdId)
      .order('day_of_week', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(200),
    supabase.from('ecd_centres').select('name').eq('id', ecdId).maybeSingle(),
  ])

  const team = (teamMembers ?? []) as TeamMemberRow[]
  const teamNameByUserId = new Map(
    team.map((member) => [member.user_id, normalizeOne(member.user_profiles)?.full_name ?? 'Unassigned'])
  )
  const plan = (currentPlan ?? null) as PlanRow | null
  const taskRows = ((tasks ?? []) as TaskRow[]).filter((task) => !plan || task.plan_id === plan.id)
  const groupedTasks = [1, 2, 3, 4, 5].map((day) => ({
    day,
    label: DAY_LABELS.get(day) ?? `Day ${day}`,
    tasks: taskRows.filter((task) => task.day_of_week === day),
  }))

  const totalTasks = taskRows.length
  const completedTasks = taskRows.filter((task) => task.status === 'done').length
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <EcdOsShell
      title="Weekly Staff Plan"
      description="Create the week in under 5 minutes, assign the work, and track daily progress."
      roleLabel={role === 'ecd_admin' ? 'Crèche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
      userRole={role}
    >
      <section className="space-y-6 pb-6">
        {searchParams?.success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {searchParams.success === 'weekly-plan-saved' ? 'Weekly plan saved and daily tasks generated.' : 'Task updated successfully.'}
          </div>
        ) : null}
        {searchParams?.error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{searchParams.error}</div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-3xl border-border bg-card shadow-[var(--shadow-elevation-1)]">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-slate-600">Current Week</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-black text-foreground">{plan?.week_of ?? startOfWeekIso()}</p></CardContent>
          </Card>
          <Card className="rounded-3xl border-border bg-card shadow-[var(--shadow-elevation-1)]">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-slate-600">Tasks Complete</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-black text-foreground">{completedTasks}/{totalTasks}</p></CardContent>
          </Card>
          <Card className="rounded-3xl border-border bg-card shadow-[var(--shadow-elevation-1)]">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-slate-600">Progress</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-black text-foreground">{progressPct}%</p></CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl border-border bg-card shadow-[var(--shadow-elevation-1)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Create this week in under 5 minutes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Pick the weekly focus, choose who leads each area, and CentreConnect will break the work into daily tasks for Monday to Friday.
            </p>
            <form action={createWeeklyPlanAction} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Week starting</label>
                <input name="week_of" type="date" defaultValue={plan?.week_of ?? startOfWeekIso()} className="cc-native-field h-12 rounded-2xl" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Plan title</label>
                <input name="title" defaultValue={plan?.title ?? `${centre?.name ?? 'Centre'} weekly plan`} className="cc-native-field h-12 rounded-2xl" placeholder="Weekly plan title" required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Weekly focus</label>
                <input name="theme" defaultValue={plan?.theme ?? 'School readiness, care, and parent updates'} className="cc-native-field h-12 rounded-2xl" placeholder="Theme or focus for this week" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Learning lead</label>
                <select name="learning_lead" className="cc-native-field h-12 rounded-2xl" defaultValue="">
                  <option value="">Assign to me</option>
                  {team.map((member) => {
                    const profile = normalizeOne(member.user_profiles)
                    return <option key={member.user_id} value={member.user_id}>{profile?.full_name ?? member.user_id} · {roleLabel(member.role)}</option>
                  })}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Care lead</label>
                <select name="care_lead" className="cc-native-field h-12 rounded-2xl" defaultValue="">
                  <option value="">Assign to me</option>
                  {team.map((member) => {
                    const profile = normalizeOne(member.user_profiles)
                    return <option key={`care-${member.user_id}`} value={member.user_id}>{profile?.full_name ?? member.user_id} · {roleLabel(member.role)}</option>
                  })}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Parent updates lead</label>
                <select name="parent_lead" className="cc-native-field h-12 rounded-2xl" defaultValue="">
                  <option value="">Assign to me</option>
                  {team.map((member) => {
                    const profile = normalizeOne(member.user_profiles)
                    return <option key={`parent-${member.user_id}`} value={member.user_id}>{profile?.full_name ?? member.user_id} · {roleLabel(member.role)}</option>
                  })}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Closing lead</label>
                <select name="closing_lead" className="cc-native-field h-12 rounded-2xl" defaultValue="">
                  <option value="">Assign to me</option>
                  {team.map((member) => {
                    const profile = normalizeOne(member.user_profiles)
                    return <option key={`closing-${member.user_id}`} value={member.user_id}>{profile?.full_name ?? member.user_id} · {roleLabel(member.role)}</option>
                  })}
                </select>
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-3">
                <Button type="submit" className="h-11 rounded-2xl bg-teal-600 px-6 text-sm font-bold text-white hover:bg-teal-700">Generate weekly plan</Button>
                <Button type="button" variant="outline" asChild className="h-11 rounded-2xl border-slate-200 text-slate-700">
                  <Link href="/ecd/profile#staff">Manage staff first</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border bg-card shadow-[var(--shadow-elevation-1)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Daily progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {taskRows.length === 0 ? (
              <p className="text-sm text-slate-500">No weekly plan yet. Generate one above and CentreConnect will create the daily tasks automatically.</p>
            ) : (
              groupedTasks.map((group) => (
                <div key={group.day} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{group.label}</p>
                      <p className="text-xs text-slate-500">{group.tasks.filter((task) => task.status === 'done').length} of {group.tasks.length} done</p>
                    </div>
                    <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-slate-600">{group.tasks.length} tasks</Badge>
                  </div>
                  <div className="mt-3 space-y-3">
                    {group.tasks.map((task) => {
                      const assignee = task.assigned_to ? teamNameByUserId.get(task.assigned_to) ?? 'Unassigned' : 'Unassigned'
                      return (
                        <div key={task.id} className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-[220px] flex-1">
                              <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                              {task.details ? <p className="mt-1 text-xs leading-5 text-slate-500">{task.details}</p> : null}
                              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Assigned to {assignee}</p>
                            </div>
                            <form action={updateWeeklyTaskStatusAction} className="flex flex-wrap items-center gap-2">
                              <input type="hidden" name="task_id" value={task.id} />
                              <select name="next_status" defaultValue={task.status} className="cc-native-field h-10 rounded-2xl text-sm">
                                <option value="pending">Pending</option>
                                <option value="in_progress">In progress</option>
                                <option value="done">Done</option>
                                <option value="blocked">Blocked</option>
                              </select>
                              <Button type="submit" size="sm" variant="outline" className="h-10 rounded-2xl border-slate-200 text-slate-700">Save</Button>
                            </form>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </EcdOsShell>
  )
}
