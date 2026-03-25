// app/ecd/(portal)/daily-reports/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText, Smile, UtensilsCrossed, Footprints, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { hasEcdFeatureAccess } from '@/lib/ecd/feature-gates'
import { getJohannesburgNowParts } from '@/lib/utils'
import { DailyReportsClient } from './daily-reports-client'

export const metadata: Metadata = {
  title: 'Daily Reports - CentreConnect',
  description: 'Provide daily updates for parents on their children\'s meals, mood, and activities.',
}

type ChildRecord = {
  id: string
  first_name: string
  last_name: string
  photo_url: string | null
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function toDateString(value: Date) {
  return value.toISOString().slice(0, 10)
}

export default async function EcdDailyReportsPage() {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
  const dailyReportsAccess = await hasEcdFeatureAccess({ supabase, ecdId, feature: 'daily-reports' })

  if (!dailyReportsAccess.allowed) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 py-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-500/10">
            <FileText className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Daily Reports</h1>
            <p className="text-sm text-slate-500">Send mood, meal and activity updates to parents every day</p>
          </div>
        </div>

        <Card className="rounded-3xl border-amber-200 bg-amber-50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-amber-900">
              <Zap className="h-4 w-4 text-amber-500" />
              Daily Reports — Growth feature
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-amber-800">
            <p>
              Daily Reports let you send a quick update to each child&apos;s family at the end of every day — mood, meals, nap times, activities. Parents love it. It keeps them connected and builds trust.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-white/60 px-3 py-3">
                <Smile className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <p className="font-black text-amber-900">Mood check-in</p>
                  <p className="text-xs text-amber-700">Happy, okay, or struggling — parents know what to expect at pick-up</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-white/60 px-3 py-3">
                <UtensilsCrossed className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <p className="font-black text-amber-900">Meals &amp; nap times</p>
                  <p className="text-xs text-amber-700">Log what they ate and when they slept — no more guessing games</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-white/60 px-3 py-3">
                <Footprints className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <p className="font-black text-amber-900">Activities</p>
                  <p className="text-xs text-amber-700">What they learned today — builds confidence in your programme</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-white/70 px-4 py-3">
              <div>
                <p className="font-black text-amber-900">Unlock Daily Reports — R299/month</p>
                <p className="text-xs text-amber-700">Growth plan includes attendance, reports, DOE export, and more</p>
              </div>
              <Link
                href="/ecd/billing"
                className="flex items-center gap-1.5 rounded-2xl bg-amber-500 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-amber-600"
              >
                <Zap className="h-3.5 w-3.5" />
                Upgrade to Growth
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  const { year, month, day } = getJohannesburgNowParts()
  const todayDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const todayUtc = new Date(Date.UTC(year, month - 1, day))
  const weekStartUtc = new Date(todayUtc)
  const weekDay = (todayUtc.getUTCDay() + 6) % 7
  weekStartUtc.setUTCDate(todayUtc.getUTCDate() - weekDay)
  const lookbackUtc = new Date(todayUtc)
  lookbackUtc.setUTCDate(todayUtc.getUTCDate() - 45)
  const weekStartDate = toDateString(weekStartUtc)
  const lookbackDate = toDateString(lookbackUtc)

  const [childrenResult, enrolledResult, reportsResult] = await Promise.all([
    supabase
      .from('children')
      .select('id,first_name,last_name,photo_url')
      .eq('ecd_id', ecdId)
      .order('created_at', { ascending: false })
      .limit(800),
    supabase
      .from('applications')
      .select('child_id,children(id,first_name,last_name,photo_url)')
      .eq('ecd_id', ecdId)
      .eq('status', 'enrolled')
      .limit(100),
    supabase
      .from('child_daily_reports')
      .select('*')
      .eq('ecd_id', ecdId)
      .gte('report_date', lookbackDate)
      .lte('report_date', todayDate)
      .order('report_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  const childrenRows = childrenResult.data ?? []
  const enrolledRows = enrolledResult.data ?? []
  const seenChildIds = new Set<string>()
  const enrolledChildren: ChildRecord[] = [
    ...childrenRows.flatMap((child: any) => {
      const childId = child?.id
      if (!childId || seenChildIds.has(childId)) return []
      seenChildIds.add(childId)
      return [
        {
          id: childId,
          first_name: child?.first_name?.trim() || 'Child',
          last_name: child?.last_name?.trim() || '',
          photo_url: child?.photo_url ?? null,
        },
      ]
    }),
    ...enrolledRows.flatMap((row: any) => {
      const child = normalizeOne(row.children)
      const childId = child?.id ?? row.child_id
      if (!childId || seenChildIds.has(childId)) return []
      seenChildIds.add(childId)

      return [
        {
          id: childId,
          first_name: child?.first_name?.trim() || 'Child',
          last_name: child?.last_name?.trim() || '',
          photo_url: child?.photo_url ?? null,
        },
      ]
    }),
  ]
  const reports = reportsResult.data ?? []

  return (
    <DailyReportsClient
      enrolledChildren={enrolledChildren}
      initialReports={reports as any[]}
      ecdId={ecdId}
      todayDate={todayDate}
      weekStartDate={weekStartDate}
      staffId={user.id}
      userRoleLabel={role === 'ecd_admin' ? 'Crèche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? ''}
      userRole={role}
    />
  )
}

