import type { Metadata } from 'next'
import Link from 'next/link'
import { Activity, AlertTriangle, ArrowUpRight, BellRing, Building2, Signal, Users } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminKpiCard } from '@/components/admin/admin-kpi-card'
import { DashboardAudience } from '@/components/admin/admin-audience-context'
import { AdminDashboardInviteActions } from '@/components/admin/admin-dashboard-invite-actions'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/cc-admin/Table'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Platform OS | Command Console',
  description: 'Audience-filtered command dashboard for Parent and ECD user segments.',
}

const ECD_ROLES = ['ecd_admin', 'ecd_staff', 'ecd_supervisor'] as const
const ECD_INVITE_EVENTS = ['owner_invite', 'admin_access_invite', 'welcome_pack', 'centre_bootstrap_created'] as const
const PARENT_WELCOME_KEYS = ['cc_welcome_intro', 'cc_welcome_inbox_guide', 'cc_welcome_legal', 'cc_welcome_security'] as const

type NotificationStatus = 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'claimed' | 'failed'
type RowStatus = NotificationStatus | 'read' | 'unread'
type ParentReliabilitySeverity = 'healthy' | 'warning' | 'critical'
type ParentReliabilityCard = {
  failureCount24h: number
  severity: ParentReliabilitySeverity
  severityLabel: string
  severityHint: string
  badgeClass: string
}

type SearchParams = Record<string, string | string[] | undefined>

function q(v: string | string[] | undefined) {
  if (Array.isArray(v)) return v[0]?.trim().toLowerCase() ?? ''
  return v?.trim().toLowerCase() ?? ''
}

function audienceFrom(value: string): DashboardAudience {
  return value === 'parent' ? 'parent' : 'ecd'
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function safe(value: string | null | undefined, fallback: string) {
  const text = String(value ?? '').trim()
  return text || fallback
}

function fmtDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
}

function roleLabel(role: string) {
  if (role === 'parent_user') return 'Parent'
  if (role === 'ecd_admin') return 'ECD Admin'
  if (role === 'ecd_staff') return 'ECD Staff'
  if (role === 'ecd_supervisor') return 'ECD Supervisor'
  return role
}

function eventLabel(event: string) {
  if (event === 'owner_invite') return 'Owner Invite'
  if (event === 'admin_access_invite') return 'Admin Invite'
  if (event === 'welcome_pack') return 'Welcome Pack'
  if (event === 'centre_bootstrap_created') return 'Bootstrap Pack'
  return event
}

function templateLabel(templateKey: string | null | undefined) {
  if (templateKey === 'cc_welcome_intro') return 'Welcome Intro'
  if (templateKey === 'cc_welcome_inbox_guide') return 'Inbox Guide'
  if (templateKey === 'cc_welcome_legal') return 'Legal Note'
  if (templateKey === 'cc_welcome_security') return 'Security Note'
  return 'Welcome Notification'
}

function statusClass(status: RowStatus) {
  if (status === 'claimed' || status === 'read') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
  if (status === 'clicked') return 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300'
  if (status === 'opened') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
  if (status === 'delivered') return 'border-blue-500/30 bg-blue-500/10 text-blue-300'
  if (status === 'queued') return 'border-slate-500/30 bg-slate-500/10 text-slate-300'
  if (status === 'failed') return 'border-rose-500/30 bg-rose-500/10 text-rose-300'
  return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
}

function parentReliabilitySeverityFromCount(failureCount24h: number): ParentReliabilitySeverity {
  if (failureCount24h >= 12) return 'critical'
  if (failureCount24h >= 4) return 'warning'
  return 'healthy'
}

function parentReliabilityCard(failureCount24h: number): ParentReliabilityCard {
  const severity = parentReliabilitySeverityFromCount(failureCount24h)
  if (severity === 'critical') {
    return {
      failureCount24h,
      severity,
      severityLabel: 'CRITICAL',
      severityHint: 'Escalate now. Parent submit failures are materially elevated.',
      badgeClass: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    }
  }
  if (severity === 'warning') {
    return {
      failureCount24h,
      severity,
      severityLabel: 'WARNING',
      severityHint: 'Investigate route hotspots before this becomes a trust blocker.',
      badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    }
  }
  return {
    failureCount24h,
    severity,
    severityLabel: 'HEALTHY',
    severityHint: 'Parent submit reliability is stable in the last 24 hours.',
    badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  }
}

function seriesFromDates(values: Array<string | null | undefined>, days = 14) {
  const dayMs = 24 * 60 * 60 * 1000
  const start = Date.now() - (days - 1) * dayMs
  const keys: string[] = []
  const map = new Map<string, number>()
  for (let i = 0; i < days; i += 1) {
    const key = new Date(start + i * dayMs).toISOString().slice(0, 10)
    keys.push(key)
    map.set(key, 0)
  }
  values.forEach((value) => {
    if (!value) return
    const key = new Date(value).toISOString().slice(0, 10)
    if (!map.has(key)) return
    map.set(key, (map.get(key) ?? 0) + 1)
  })
  return keys.map((key) => map.get(key) ?? 0)
}

function trend(series: number[]) {
  if (series.length < 2) return 0
  const mid = Math.floor(series.length / 2)
  const first = series.slice(0, mid).reduce((a, b) => a + b, 0)
  const second = series.slice(mid).reduce((a, b) => a + b, 0)
  if (first === 0) return second > 0 ? 100 : 0
  return Number((((second - first) / first) * 100).toFixed(1))
}

function Bars({ series, color }: { series: number[]; color: string }) {
  const max = Math.max(...series, 1)
  return (
    <div className="mt-4 flex h-24 items-end gap-1.5 rounded-2xl border border-white/5 bg-black/30 px-3 py-3">
      {series.map((value, index) => (
        <span
          key={`${index}-${value}`}
          className={`w-full rounded-full ${color}`}
          style={{ height: `${Math.max(8, Math.round((value / max) * 100))}%` }}
        />
      ))}
    </div>
  )
}

type AdminDashboardPageProps = {
  searchParams?: SearchParams
}

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const audience = audienceFrom(q(searchParams?.audience))
  const admin = createAdminClient()

  let hero = 'ECD User Control Plane'
  let heroDescription = 'Operational visibility across centres, invite delivery, and onboarding health.'
  let cards: Array<{ label: string; value: string | number; trend: number; sparklineData: number[] }> = []
  let highlights: Array<{ label: string; value: string }> = []
  let users: Array<{ id: string; fullName: string; roleLabel: string; phone: string; createdAt: string }> = []
  let centres: Array<{ id: string; name: string; city: string; meta: string }> = []
  let inviteRows: Array<{
    id: string
    audience: DashboardAudience
    createdAt: string
    centreName: string
    recipient: string
    channel: string
    event: string
    statusKey: RowStatus
    statusLabel: string
    statusStyle: string
    detail: string
    centreId: string | null
    parentId: string | null
  }> = []
  let totalRows = 0
  let pendingRows = 0
  let parentReliability: ParentReliabilityCard | null = null
  let primaryLabel = 'Invite Dispatch (14 Days)'
  let primarySeries: number[] = []
  let secondaryLabel = 'User Signups'
  let secondarySeries: number[] = []
  let tertiaryLabel = 'Centre Activity'
  let tertiarySeries: number[] = []

  if (audience === 'parent') {
    hero = 'Parent User Control Plane'
    heroDescription = 'Onboarding, legal/security welcome visibility, and family account engagement signals.'
    primaryLabel = 'Welcome Notifications (14 Days)'
    secondaryLabel = 'Parent Signups'
    tertiaryLabel = 'Parent Application Activity'

    const [
      totalParentsResult,
      newParentsResult,
      recentParentsResult,
      welcomeRowsResult,
      welcomeTotalResult,
      unreadWelcomeResult,
      parentSeriesResult,
      welcomeSeriesResult,
      applicationRowsResult,
      parentFailure24hCountResult,
    ] = await Promise.all([
      admin.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'parent_user'),
      admin
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'parent_user')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      admin
        .from('user_profiles')
        .select('id,full_name,phone,role,created_at')
        .eq('role', 'parent_user')
        .order('created_at', { ascending: false })
        .limit(8),
      admin
        .from('parent_notifications')
        .select('id,parent_id,ecd_id,template_key,title,message,is_read,created_at')
        .in('template_key', [...PARENT_WELCOME_KEYS])
        .order('created_at', { ascending: false })
        .limit(12),
      admin.from('parent_notifications').select('id', { count: 'exact', head: true }).in('template_key', [...PARENT_WELCOME_KEYS]),
      admin
        .from('parent_notifications')
        .select('id', { count: 'exact', head: true })
        .in('template_key', [...PARENT_WELCOME_KEYS])
        .eq('is_read', false),
      admin.from('user_profiles').select('created_at').eq('role', 'parent_user').order('created_at', { ascending: false }).limit(360),
      admin.from('parent_notifications').select('created_at').in('template_key', [...PARENT_WELCOME_KEYS]).order('created_at', { ascending: false }).limit(360),
      admin.from('applications').select('ecd_id,created_at').order('created_at', { ascending: false }).limit(800),
      admin
        .from('parent_form_submit_failures')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    ])

    const welcomeRows = (welcomeRowsResult.data ?? []) as Array<{
      id: string
      parent_id: string
      ecd_id: string | null
      template_key: string | null
      title: string
      message: string
      is_read: boolean
      created_at: string
    }>
    const applicationRows = (applicationRowsResult.data ?? []) as Array<{ ecd_id: string | null; created_at: string }>
    const parentIds = Array.from(new Set(welcomeRows.map((row) => row.parent_id)))
    const centreIds = Array.from(new Set([...welcomeRows.map((row) => row.ecd_id), ...applicationRows.map((row) => row.ecd_id)].filter(Boolean) as string[]))
    const [profileRowsResult, centreRowsResult] = await Promise.all([
      parentIds.length ? admin.from('user_profiles').select('id,full_name,phone').in('id', parentIds) : Promise.resolve({ data: [] as any[] }),
      centreIds.length ? admin.from('ecd_centres').select('id,name,city').in('id', centreIds) : Promise.resolve({ data: [] as any[] }),
    ])
    const profileMap = new Map((profileRowsResult.data ?? []).map((row: any) => [row.id, row]))
    const centreMap = new Map((centreRowsResult.data ?? []).map((row: any) => [row.id, row]))
    const appByCentre = new Map<string, number>()
    applicationRows.forEach((row) => {
      if (!row.ecd_id) return
      appByCentre.set(row.ecd_id, (appByCentre.get(row.ecd_id) ?? 0) + 1)
    })

    const totalParents = totalParentsResult.count ?? 0
    const newParents = newParentsResult.count ?? 0
    const totalWelcome = welcomeTotalResult.count ?? 0
    const unreadWelcome = unreadWelcomeResult.count ?? 0
    const readWelcome = Math.max(0, totalWelcome - unreadWelcome)
    const readRate = totalWelcome > 0 ? Math.round((readWelcome / totalWelcome) * 100) : 0
    const parentFailureCount24h = parentFailure24hCountResult.count ?? 0

    parentReliability = parentReliabilityCard(parentFailureCount24h)

    primarySeries = seriesFromDates(((welcomeSeriesResult.data ?? []) as Array<{ created_at: string }>).map((row) => row.created_at))
    secondarySeries = seriesFromDates(((parentSeriesResult.data ?? []) as Array<{ created_at: string }>).map((row) => row.created_at))
    tertiarySeries = seriesFromDates(applicationRows.map((row) => row.created_at))

    cards = [
      { label: 'Parent Accounts', value: totalParents, trend: trend(secondarySeries), sparklineData: secondarySeries },
      { label: 'New This Week', value: newParents, trend: trend(secondarySeries), sparklineData: secondarySeries },
      { label: 'Welcome Notifications', value: totalWelcome, trend: trend(primarySeries), sparklineData: primarySeries },
      { label: 'Read Rate', value: `${readRate}%`, trend: readRate - 50, sparklineData: [Math.max(readRate - 20, 0), Math.max(readRate - 10, 0), readRate] },
    ]

    highlights = [
      { label: 'Unread welcomes', value: unreadWelcome.toLocaleString() },
      { label: 'Read welcomes', value: readWelcome.toLocaleString() },
      { label: 'Centres reached', value: appByCentre.size.toLocaleString() },
    ]

    users = ((recentParentsResult.data ?? []) as Array<any>).map((row) => ({
      id: row.id,
      fullName: safe(row.full_name, 'Parent account'),
      roleLabel: roleLabel(row.role),
      phone: safe(row.phone, 'No phone'),
      createdAt: row.created_at,
    }))

    centres = Array.from(appByCentre.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([centreId, count]) => {
        const centre = centreMap.get(centreId)
        return {
          id: centreId,
          name: safe(centre?.name, 'Unknown Centre'),
          city: safe(centre?.city, 'Unknown City'),
          meta: `${count} applications linked`,
        }
      })

    inviteRows = welcomeRows.map((row) => {
      const profile = profileMap.get(row.parent_id)
      const centre = row.ecd_id ? centreMap.get(row.ecd_id) : null
      const recipient = profile?.phone ? `${safe(profile.full_name, 'Parent')} · ${profile.phone}` : safe(profile?.full_name, 'Parent')
      const statusKey: RowStatus = row.is_read ? 'read' : 'unread'
      return {
        id: row.id,
        audience: 'parent' as const,
        createdAt: row.created_at,
        centreName: safe(centre?.name, 'CentreConnect'),
        recipient,
        channel: 'in_app',
        event: templateLabel(row.template_key),
        statusKey,
        statusLabel: row.is_read ? 'READ' : 'UNREAD',
        statusStyle: statusClass(statusKey),
        detail: row.title || row.message,
        centreId: row.ecd_id,
        parentId: row.parent_id,
      }
    })

    totalRows = totalWelcome
    pendingRows = unreadWelcome
  } else {
    const [
      totalUsersResult,
      newUsersResult,
      totalCentresResult,
      activeCentresResult,
      pendingInviteResult,
      totalInviteResult,
      recentUsersResult,
      recentCentresResult,
      inviteRowsResult,
      userSeriesResult,
      inviteSeriesResult,
      centreSeriesResult,
      paidInvoicesResult,
    ] = await Promise.all([
      admin.from('user_profiles').select('id', { count: 'exact', head: true }).in('role', [...ECD_ROLES]),
      admin
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .in('role', [...ECD_ROLES])
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      admin.from('ecd_centres').select('id', { count: 'exact', head: true }),
      admin.from('ecd_centres').select('id', { count: 'exact', head: true }).eq('is_active', true),
      admin
        .from('notification_logs')
        .select('id', { count: 'exact', head: true })
        .in('event_type', [...ECD_INVITE_EVENTS])
        .in('status', ['queued', 'sent', 'delivered', 'opened', 'clicked']),
      admin.from('notification_logs').select('id', { count: 'exact', head: true }).in('event_type', [...ECD_INVITE_EVENTS]),
      admin.from('user_profiles').select('id,full_name,phone,role,created_at').in('role', [...ECD_ROLES]).order('created_at', { ascending: false }).limit(8),
      admin.from('ecd_centres').select('id,name,city,is_active').order('created_at', { ascending: false }).limit(8),
      admin
        .from('notification_logs')
        .select('id,centre_id,event_type,channel,recipient,status,provider,error_message,created_at,ecd_centres(name)')
        .in('event_type', [...ECD_INVITE_EVENTS])
        .order('created_at', { ascending: false })
        .limit(12),
      admin.from('user_profiles').select('created_at').in('role', [...ECD_ROLES]).order('created_at', { ascending: false }).limit(360),
      admin.from('notification_logs').select('created_at').in('event_type', [...ECD_INVITE_EVENTS]).order('created_at', { ascending: false }).limit(360),
      admin.from('ecd_centres').select('created_at').order('created_at', { ascending: false }).limit(360),
      admin.from('invoices').select('total').eq('status', 'paid').limit(500),
    ])

    primarySeries = seriesFromDates(((inviteSeriesResult.data ?? []) as Array<{ created_at: string }>).map((row) => row.created_at))
    secondarySeries = seriesFromDates(((userSeriesResult.data ?? []) as Array<{ created_at: string }>).map((row) => row.created_at))
    tertiarySeries = seriesFromDates(((centreSeriesResult.data ?? []) as Array<{ created_at: string }>).map((row) => row.created_at))
    const paidRevenue = ((paidInvoicesResult.data ?? []) as Array<{ total: number | string }>).reduce(
      (sum, row) => sum + (Number(row.total) || 0),
      0
    ) / 100

    cards = [
      { label: 'ECD Team Users', value: totalUsersResult.count ?? 0, trend: trend(secondarySeries), sparklineData: secondarySeries },
      { label: 'New This Week', value: newUsersResult.count ?? 0, trend: trend(secondarySeries), sparklineData: secondarySeries },
      {
        label: 'Active Centres',
        value: `${activeCentresResult.count ?? 0}/${totalCentresResult.count ?? 0}`,
        trend: trend(tertiarySeries),
        sparklineData: tertiarySeries,
      },
      { label: 'Paid Revenue', value: `R${Math.round(paidRevenue).toLocaleString()}`, trend: trend(primarySeries), sparklineData: primarySeries },
    ]

    const rawInviteRows = (inviteRowsResult.data ?? []) as Array<any>
    const claimed = rawInviteRows.filter((row) => row.status === 'claimed').length
    const failed = rawInviteRows.filter((row) => row.status === 'failed').length
    highlights = [
      { label: 'Pending invites', value: (pendingInviteResult.count ?? 0).toLocaleString() },
      { label: 'Claimed invites', value: claimed.toLocaleString() },
      { label: 'Failed dispatches', value: failed.toLocaleString() },
    ]

    users = ((recentUsersResult.data ?? []) as Array<any>).map((row) => ({
      id: row.id,
      fullName: safe(row.full_name, 'ECD account'),
      roleLabel: roleLabel(row.role),
      phone: safe(row.phone, 'No phone'),
      createdAt: row.created_at,
    }))

    centres = ((recentCentresResult.data ?? []) as Array<any>).map((row) => ({
      id: row.id,
      name: safe(row.name, 'Unnamed centre'),
      city: safe(row.city, 'Unknown city'),
      meta: row.is_active ? 'Active centre' : 'Inactive centre',
    }))

    inviteRows = rawInviteRows.map((row) => {
      const centre = normalizeOne(row.ecd_centres)
      const statusKey = row.status as RowStatus
      return {
        id: row.id,
        audience: 'ecd' as const,
        createdAt: row.created_at,
        centreName: safe(centre?.name, 'Unknown centre'),
        recipient: safe(row.recipient, 'No recipient'),
        channel: safe(row.channel, 'unknown'),
        event: eventLabel(row.event_type),
        statusKey,
        statusLabel: String(row.status ?? '').toUpperCase(),
        statusStyle: statusClass(statusKey),
        detail: row.error_message ? `${row.provider} · ${row.error_message}` : row.provider,
        centreId: row.centre_id,
        parentId: null,
      }
    })

    totalRows = totalInviteResult.count ?? 0
    pendingRows = pendingInviteResult.count ?? 0
  }

  return (
    <div className="space-y-12 pb-20">
      <header className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              <span className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,1)]" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">Admin Telemetry</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/5 bg-slate-500/5 px-3 py-1">
              <Signal className="h-3 w-3 text-slate-500" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Audience: {audience.toUpperCase()}</p>
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl font-black leading-[0.9] tracking-tighter text-white sm:text-7xl">
              Command <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Center</span>
            </h1>
            <p className="max-w-3xl text-base font-medium text-slate-400 sm:text-lg">
              {hero}. {heroDescription}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-4 lg:items-end">
          <Link
            href="/admin/invites"
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-5 text-xs font-black uppercase tracking-[0.18em] text-cyan-200 transition-colors hover:bg-cyan-500/20"
          >
            Open Invite Ledger
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <AdminKpiCard
            key={card.label}
            label={card.label}
            value={card.value}
            trend={card.trend}
            sparklineData={card.sparklineData}
          />
        ))}
      </div>

      {audience === 'parent' && parentReliability ? (
        <section className="overflow-hidden rounded-[2rem] border border-white/5 bg-[#080B13] shadow-2xl">
          <div className="flex flex-col gap-4 border-b border-white/5 bg-black/20 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/10">
                <AlertTriangle className="h-4 w-4 text-cyan-300" />
              </span>
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.24em] text-white">Parent Reliability (24h)</h2>
                <p className="mt-1 text-xs text-slate-400">{parentReliability.severityHint}</p>
              </div>
            </div>
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${parentReliability.badgeClass}`}>
              {parentReliability.severityLabel}
            </span>
          </div>
          <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-300">
              Submit failures recorded in last 24h:{' '}
              <span className="font-black text-white">{parentReliability.failureCount24h.toLocaleString()}</span>
            </p>
            <Link
              href="/admin/parent-reliability?window=24h"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 text-xs font-black uppercase tracking-[0.16em] text-cyan-200 transition-colors hover:bg-cyan-500/20"
            >
              Open Parent Reliability
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <section className="relative lg:col-span-2">
          <div className="absolute -inset-4 rounded-[3rem] bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5" />
          <div className="relative overflow-hidden rounded-[3rem] border border-white/5 bg-[#080B13] p-8 shadow-2xl sm:p-10">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-tighter text-white">Central Analytics</h2>
                <p className="mt-1 text-sm text-slate-500">Filtered to the selected audience segment.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-2">
                <Activity className="h-4 w-4 text-cyan-400" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">Live Metrics</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {highlights.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                  <p className="mt-1 text-xl font-black tracking-tight text-white">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-7 grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">{primaryLabel}</p>
                <Bars series={primarySeries} color="bg-gradient-to-t from-cyan-600/90 to-cyan-300/90" />
              </div>
              <div className="space-y-6">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{secondaryLabel}</p>
                  <Bars series={secondarySeries} color="bg-gradient-to-t from-emerald-600/90 to-emerald-300/90" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{tertiaryLabel}</p>
                  <Bars series={tertiarySeries} color="bg-gradient-to-t from-violet-600/90 to-violet-300/90" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-white/5 bg-[#080B13] p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-400" />
              <h3 className="text-xs font-black uppercase tracking-[0.24em] text-slate-200">Users</h3>
            </div>
            <ul className="space-y-3">
              {users.length === 0 && (
                <li className="rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-sm text-slate-500">No users in this segment yet.</li>
              )}
              {users.map((user) => (
                <li key={user.id} className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                  <p className="text-sm font-semibold text-white">{user.fullName}</p>
                  <p className="text-xs text-cyan-300">{user.roleLabel}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{user.phone}</p>
                  <p className="text-[11px] text-slate-500">{fmtDate(user.createdAt)}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[2rem] border border-white/5 bg-[#080B13] p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-cyan-400" />
              <h3 className="text-xs font-black uppercase tracking-[0.24em] text-slate-200">Centres</h3>
            </div>
            <ul className="space-y-3">
              {centres.length === 0 && (
                <li className="rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-sm text-slate-500">No centres in this segment yet.</li>
              )}
              {centres.map((centre) => (
                <li key={centre.id} className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                  <p className="text-sm font-semibold text-white">{centre.name}</p>
                  <p className="text-xs text-slate-400">{centre.city}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-cyan-300">{centre.meta}</p>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <section className="overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#080B13] shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-white/5 bg-black/20 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-cyan-300" />
            <h2 className="text-sm font-black uppercase tracking-[0.26em] text-white">Invite Tracking</h2>
          </div>
          <p className="text-xs text-slate-400">
            Rows: {totalRows.toLocaleString()} | Pending: {pendingRows.toLocaleString()}
          </p>
        </div>
        <div className="bg-slate-950/40">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Time</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Centre</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Recipient</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Channel</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Event</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Status</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Details</TableHead>
                <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inviteRows.length === 0 ? (
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableCell colSpan={8} className="px-6 py-10 text-sm text-slate-500">
                    No invite rows found for this segment.
                  </TableCell>
                </TableRow>
              ) : (
                inviteRows.map((row) => (
                  <TableRow key={row.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="p-4 text-xs text-slate-400">{fmtDate(row.createdAt)}</TableCell>
                    <TableCell className="p-4 text-sm font-medium text-white">{row.centreName}</TableCell>
                    <TableCell className="p-4 text-sm text-slate-200">{row.recipient}</TableCell>
                    <TableCell className="p-4 text-xs font-semibold uppercase tracking-wider text-cyan-300">{row.channel}</TableCell>
                    <TableCell className="p-4 text-xs text-slate-300">{row.event}</TableCell>
                    <TableCell className="p-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${row.statusStyle}`}>
                        {row.statusLabel}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[260px] p-4 text-xs text-slate-400">{row.detail}</TableCell>
                    <TableCell className="p-4">
                      {row.audience === 'ecd' ? (
                        <AdminDashboardInviteActions
                          audience="ecd"
                          rowId={row.id}
                          centreId={row.centreId}
                          status={row.statusKey as NotificationStatus}
                        />
                      ) : (
                        <AdminDashboardInviteActions
                          audience="parent"
                          rowId={row.id}
                          parentId={row.parentId}
                          isRead={row.statusKey === 'read'}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
