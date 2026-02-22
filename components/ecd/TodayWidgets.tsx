'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { AlertCircle, ChevronRight, Clock, TrendingUp, Users } from 'lucide-react'

interface TodayWidgetProps {
  pendingApplications: number
  newApplicationsToday: number
  currentCapacity: number
  totalCapacity: number
  avgResponseHours: number
  weeklyVisitors: number
  visitorsTrend: number
}

type ProfileItem = {
  id: string
  label: string
  done: boolean
  href: string
}

export default function TodayWidgets({
  pendingApplications,
  newApplicationsToday,
  currentCapacity,
  totalCapacity,
  avgResponseHours,
  weeklyVisitors,
  visitorsTrend,
}: TodayWidgetProps) {
  const safeTotal = totalCapacity > 0 ? totalCapacity : 1
  const capacityPct = Math.round((currentCapacity / safeTotal) * 100)
  const capacityStatus = capacityPct >= 90 ? 'critical' : capacityPct >= 70 ? 'warning' : 'good'

  const statCard = (icon: ReactNode, value: ReactNode, label: string, detail?: ReactNode) => (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-lg">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-cyan-300">
        {icon}
      </div>
      <p className="text-2xl font-extrabold text-white">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
      {detail ? <p className="mt-1 text-xs text-slate-400">{detail}</p> : null}
    </div>
  )

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {pendingApplications > 0 && (
        <Link
          href="/ecd/applications?tab=pending"
          className="relative flex gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-2xl text-white"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-600/20 text-rose-400">
            <AlertCircle size={22} />
          </div>
          <div className="flex-1">
            <p className="text-2xl font-extrabold text-white">{pendingApplications}</p>
            <p className="text-sm font-medium text-slate-300">Awaiting your review</p>
            {newApplicationsToday > 0 ? (
              <p className="mt-1 text-xs text-slate-400">+{newApplicationsToday} new today</p>
            ) : null}
          </div>
          <div className="absolute bottom-3 right-3 flex items-center gap-1 text-xs font-semibold text-cyan-300">
            Review <ChevronRight size={12} />
          </div>
        </Link>
      )}

      {statCard(
        <Users size={22} className="text-emerald-300" />,
        (
          <>
            {currentCapacity}/{totalCapacity}
          </>
        ),
        'Children enrolled',
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${
              capacityStatus === 'critical'
                ? 'bg-rose-500'
                : capacityStatus === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-emerald-400'
            }`}
            style={{ width: `${Math.max(0, Math.min(100, capacityPct))}%` }}
          />
        </div>
      )}

      {statCard(<Clock size={22} className="text-cyan-300" />, `${avgResponseHours}h`, 'Avg. response time')}

      {statCard(
        <TrendingUp size={22} className="text-emerald-300" />,
        weeklyVisitors,
        'Visitors this week',
        <span className={`text-xs font-semibold ${visitorsTrend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {visitorsTrend >= 0 ? 'Up' : 'Down'} {Math.abs(visitorsTrend)}% vs last week
        </span>
      )}
    </div>
  )
}

export function ProfileCompleteness({ items }: { items: ProfileItem[] }) {
  const total = items.length || 1
  const done = items.filter((item) => item.done).length
  const pct = Math.round((done / total) * 100)

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl text-white">
      <p className="text-base font-semibold text-white">Profile completeness</p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-cyan-400" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-sm text-slate-300">{pct}% complete</p>

      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex items-center justify-between text-sm text-slate-300"
          >
            <span>{item.label}</span>
            <span className={item.done ? 'text-emerald-300' : 'text-slate-500'}>
              {item.done ? 'Done' : 'Pending'}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
