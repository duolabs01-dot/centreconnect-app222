import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowUpRight,
  BellRing,
  Building2,
  CheckCircle2,
  CreditCard,
  FileSpreadsheet,
  HeartHandshake,
  LifeBuoy,
  ShieldCheck,
} from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertInviteDomainHealth } from '@/lib/auth/onboarding-links'
import { getCompanyHqSnapshot } from '@/lib/admin/company-hq'
import { AdminKpiCard } from '@/components/admin/admin-kpi-card'
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
  title: 'Admin Home',
  description: 'Plain-English home for centres, parents, money, and support.',
}

const ECD_ROLES = ['ecd_admin', 'ecd_staff', 'ecd_supervisor'] as const
const ECD_INVITE_EVENTS = ['owner_invite', 'admin_access_invite', 'welcome_pack', 'centre_bootstrap_created'] as const
const PARENT_WELCOME_KEYS = ['cc_welcome_intro', 'cc_welcome_inbox_guide', 'cc_welcome_legal', 'cc_welcome_security'] as const
const OPEN_SUPPORT_STATUSES = ['open', 'in_progress', 'waiting_response'] as const
const PENDING_INVOICE_STATUSES = ['draft', 'sent', 'overdue'] as const

type NotificationStatus = 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'claimed' | 'failed'
type RowStatus = NotificationStatus | 'read' | 'unread'
type ParentReliabilitySeverity = 'healthy' | 'warning' | 'critical'

type DashboardAction = {
  title: string
  count: string
  detail: string
  href: string
  tone: 'cyan' | 'amber' | 'rose' | 'emerald'
}

type ProductReadinessCard = {
  title: string
  statusLabel: string
  detail: string
  href: string
  hrefLabel: string
  tone: DashboardAction['tone']
}

type RecentPerson = {
  id: string
  fullName: string
  phone: string
  createdAt: string
}

type RecentCentre = {
  id: string
  name: string
  city: string
  meta: string
  createdAt: string
}

type InviteRow = {
  id: string
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

function eventLabel(event: string) {
  if (event === 'owner_invite') return 'Owner invite'
  if (event === 'admin_access_invite') return 'Admin invite'
  if (event === 'welcome_pack') return 'Welcome pack'
  if (event === 'centre_bootstrap_created') return 'Bootstrap pack'
  return event
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

function parentHealthCopy(failureCount24h: number) {
  const severity = parentReliabilitySeverityFromCount(failureCount24h)
  if (severity === 'critical') {
    return {
      label: 'CRITICAL',
      badgeClass: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
      hint: 'Parent forms need attention now.',
    }
  }
  if (severity === 'warning') {
    return {
      label: 'WARNING',
      badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
      hint: 'A few parents may be getting stuck.',
    }
  }
  return {
    label: 'HEALTHY',
    badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    hint: 'Parent forms look stable right now.',
  }
}

function actionToneClass(tone: DashboardAction['tone']) {
  if (tone == 'rose') return 'border-rose-500/20 bg-rose-500/10'
  if (tone == 'amber') return 'border-amber-500/20 bg-amber-500/10'
  if (tone == 'emerald') return 'border-emerald-500/20 bg-emerald-500/10'
  return 'border-cyan-500/20 bg-cyan-500/10'
}

function toneBadgeClass(tone: DashboardAction['tone']) {
  if (tone === 'rose') return 'border-rose-500/30 bg-rose-500/10 text-rose-300'
  if (tone === 'amber') return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
  if (tone === 'emerald') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
  return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
}

function money(amountInCents: number) {
  return `R${Math.round(amountInCents / 100).toLocaleString()}`
}

function SectionCard({
  title,
  description,
  href,
  hrefLabel,
  icon,
  children,
}: {
  title: string
  description: string
  href: string
  hrefLabel: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[2rem] border border-white/5 bg-[#080B13] p-6 shadow-2xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-cyan-300">{icon}</div>
          <h2 className="text-2xl font-black tracking-tight text-white">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">{description}</p>
        </div>
        <Link
          href={href}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 text-xs font-black uppercase tracking-[0.16em] text-slate-200 transition-colors hover:bg-white/5"
        >
          {hrefLabel}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {children}
    </section>
  )
}

export default async function AdminDashboardPage() {
  const admin = createAdminClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [
    totalCentresResult,
    liveCentresResult,
    onboardingCentresResult,
    claimRequestsResult,
    centreAccountsResult,
    recentCentresResult,
    totalParentsResult,
    newParentsResult,
    unreadWelcomesResult,
    parentFailuresResult,
    recentParentsResult,
    openSupportResult,
    paidInvoicesResult,
    pendingInvoicesResult,
    failedInviteCountResult,
    inviteRowsResult,
  ] = await Promise.all([
    admin.from('ecd_centres').select('id', { count: 'exact', head: true }),
    admin.from('ecd_centres').select('id', { count: 'exact', head: true }).eq('is_active', true),
    admin.from('ecd_centres').select('id', { count: 'exact', head: true }).eq('is_active', false).eq('onboarding_complete', false),
    admin.from('claim_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('user_profiles').select('id', { count: 'exact', head: true }).in('role', [...ECD_ROLES]),
    admin.from('ecd_centres').select('id,name,city,is_active,created_at').order('created_at', { ascending: false }).limit(6),
    admin.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'parent_user'),
    admin.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'parent_user').gte('created_at', sevenDaysAgo),
    admin.from('parent_notifications').select('id', { count: 'exact', head: true }).in('template_key', [...PARENT_WELCOME_KEYS]).eq('is_read', false),
    admin.from('parent_form_submit_failures').select('id', { count: 'exact', head: true }).gte('created_at', twentyFourHoursAgo),
    admin.from('user_profiles').select('id,full_name,phone,created_at').eq('role', 'parent_user').order('created_at', { ascending: false }).limit(6),
    admin.from('support_tickets').select('id', { count: 'exact', head: true }).in('status', [...OPEN_SUPPORT_STATUSES]),
    admin.from('invoices').select('id,total,status,due_at,paid_at').eq('status', 'paid').order('paid_at', { ascending: false }).limit(40),
    admin.from('invoices').select('id,total,status,due_at').in('status', [...PENDING_INVOICE_STATUSES]).order('due_at', { ascending: true }).limit(40),
    admin.from('notification_logs').select('id', { count: 'exact', head: true }).in('event_type', [...ECD_INVITE_EVENTS]).eq('status', 'failed'),
    admin
      .from('notification_logs')
      .select('id,centre_id,event_type,channel,recipient,status,provider,error_message,created_at,ecd_centres(name)')
      .in('event_type', [...ECD_INVITE_EVENTS])
      .order('created_at', { ascending: false })
      .limit(12),
  ])

  const totalCentres = totalCentresResult.count ?? 0
  const liveCentres = liveCentresResult.count ?? 0
  const onboardingCentres = onboardingCentresResult.count ?? 0
  const nonLiveCentres = Math.max(totalCentres - liveCentres, 0)
  const prospectCentres = Math.max(nonLiveCentres - onboardingCentres, 0)
  const claimRequests = claimRequestsResult.count ?? 0
  const centreAccounts = centreAccountsResult.count ?? 0
  const totalParents = totalParentsResult.count ?? 0
  const newParents = newParentsResult.count ?? 0
  const unreadWelcomes = unreadWelcomesResult.count ?? 0
  const parentFailures = parentFailuresResult.count ?? 0
  const openSupport = openSupportResult.count ?? 0
  const failedInvites = failedInviteCountResult.count ?? 0
  const paidInvoices = (paidInvoicesResult.data ?? []) as Array<{ total: number | string | null }>
  const pendingInvoices = (pendingInvoicesResult.data ?? []) as Array<{ total: number | string | null; due_at: string | null }>
  const paidRevenueCents = paidInvoices.reduce((sum, row) => sum + (Number(row.total) || 0), 0)
  const pendingRevenueCents = pendingInvoices.reduce((sum, row) => sum + (Number(row.total) || 0), 0)
  const parentHealth = parentHealthCopy(parentFailures)
  const inviteDomainHealth = assertInviteDomainHealth()
  const onboardingFollowThroughTone: DashboardAction['tone'] =
    onboardingCentres > 0 || claimRequests > 0 ? 'amber' : 'emerald'

  const readinessCards: ProductReadinessCard[] = [
    {
      title: 'Owner access path',
      statusLabel: !inviteDomainHealth.ok ? 'Action required' : failedInvites > 0 ? 'Follow up' : 'Ready',
      detail: !inviteDomainHealth.ok
        ? `${inviteDomainHealth.message} Fix this before you widen live onboarding.`
        : failedInvites > 0
        ? `${failedInvites} centre invite records still failed, but the domain path is healthy. Repair follow-through before the next onboarding call.`
        : 'Invite domains and callback links look safe for live owner onboarding today.',
      href: '/admin/invites',
      hrefLabel: 'Open invite health',
      tone: !inviteDomainHealth.ok ? 'rose' : failedInvites > 0 ? 'amber' : 'emerald',
    },
    {
      title: 'Pilot onboarding truth',
      statusLabel: onboardingFollowThroughTone === 'emerald' ? 'Clear' : 'Needs follow-through',
      detail:
        onboardingCentres > 0 || claimRequests > 0
          ? `${onboardingCentres} centres are still not live and ${claimRequests} claim requests are still waiting. Unblock real centre setup before adding new scope.`
          : 'No current centre backlog is showing up in live onboarding or claim-request counts.',
      href: '/admin/tenants',
      hrefLabel: 'Open centre readiness',
      tone: onboardingFollowThroughTone,
    },
    {
      title: 'Attendance fallback',
      statusLabel: 'Ready',
      detail:
        'ECD register import now supports photo review, CSV attendance import, and a manual attendance register fallback. This is the safe path when a pilot centre sends typed registers or poor photos.',
      href: '/admin/tenants',
      hrefLabel: 'Open pilot centres',
      tone: 'emerald',
    },
    {
      title: 'Founder visibility',
      statusLabel: 'Read-only',
      detail:
        'AI Company OS and OpenClaw stay as visibility layers. Use them for status and handoff context, not as a runtime controller or a fake queue feed.',
      href: '/admin/openclaw',
      hrefLabel: 'Open OpenClaw ops',
      tone: 'cyan',
    },
  ]

  const companyHqSnapshot = await getCompanyHqSnapshot()
  const hierarchyPreview = companyHqSnapshot.hierarchy.slice(0, 6)
  const planNow = companyHqSnapshot.roadmap.find((bucket) => bucket.id === 'now')?.items ?? []
  const planNext = companyHqSnapshot.roadmap.find((bucket) => bucket.id === 'next')?.items ?? []
  const delegatedWork = companyHqSnapshot.roadmap.flatMap((bucket) => bucket.items).slice(0, 8)

  const actions: DashboardAction[] = [
    {
      title: 'Centres still onboarding',
      count: onboardingCentres.toLocaleString(),
      detail: 'These centres still need setup, branding, or invite help.',
      href: '/admin/tenants',
      tone: onboardingCentres > 0 ? 'amber' : 'emerald',
    },
    {
      title: 'Parent Reliability (24h)',
      count: parentFailures.toLocaleString(),
      detail: parentHealth.hint,
      href: '/admin/parent-reliability?window=24h',
      tone: parentFailures >= 12 ? 'rose' : parentFailures >= 4 ? 'amber' : 'emerald',
    },
    {
      title: 'Failed centre invites',
      count: failedInvites.toLocaleString(),
      detail: 'Resend or fix owner/admin invite problems quickly.',
      href: '/admin/invites?status=failed',
      tone: failedInvites > 0 ? 'rose' : 'emerald',
    },
    {
      title: 'Open support tickets',
      count: openSupport.toLocaleString(),
      detail: 'These centres or parents still need a response.',
      href: '/admin/support',
      tone: openSupport > 0 ? 'cyan' : 'emerald',
    },
  ]

  const recentCentres = ((recentCentresResult.data ?? []) as Array<any>).map((row) => ({
    id: row.id,
    name: safe(row.name, 'Unnamed centre'),
    city: safe(row.city, 'Unknown city'),
    meta: row.is_active ? 'Live on CentreConnect' : 'Still onboarding',
    createdAt: row.created_at,
  })) as RecentCentre[]

  const recentParents = ((recentParentsResult.data ?? []) as Array<any>).map((row) => ({
    id: row.id,
    fullName: safe(row.full_name, 'Parent account'),
    phone: safe(row.phone, 'No phone'),
    createdAt: row.created_at,
  })) as RecentPerson[]

  const rawInviteRows = (inviteRowsResult.data ?? []) as Array<any>
  const inviteRows = rawInviteRows.map((row) => {
    const centre = normalizeOne(row.ecd_centres)
    const statusKey = row.status as RowStatus
    return {
      id: row.id,
      createdAt: row.created_at,
      centreName: safe(centre?.name, 'Unknown centre'),
      recipient: safe(row.recipient, 'No recipient'),
      channel: safe(row.channel, 'unknown'),
      event: eventLabel(row.event_type),
      statusKey,
      statusLabel: String(row.status ?? '').toUpperCase(),
      statusStyle: statusClass(statusKey),
      detail: row.error_message ? `${row.provider} - ${row.error_message}` : safe(row.provider, 'No provider details'),
      centreId: row.centre_id,
    }
  }) as InviteRow[]

  return (
    <div className="space-y-8 pb-20">
      <header className="rounded-[2rem] border border-white/5 bg-[#080B13] p-6 shadow-2xl lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">Founder overview</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">What needs attention today</h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-400 sm:text-base">
              Start here when you need live counts, onboarding truth, and the next admin action for pilot centres without inventing pipeline or payment state.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/tenants"
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-5 text-xs font-black uppercase tracking-[0.18em] text-cyan-200 transition-colors hover:bg-cyan-500/20"
            >
              Open centres
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/admin/support"
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-5 text-xs font-black uppercase tracking-[0.18em] text-slate-200 transition-colors hover:bg-white/5"
            >
              Open support
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/admin/revenue"
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-5 text-xs font-black uppercase tracking-[0.18em] text-slate-200 transition-colors hover:bg-white/5"
            >
              Open revenue
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard label="Live centres" value={`${liveCentres}/${totalCentres}`} sparklineData={[Math.max(totalCentres - liveCentres, 0), liveCentres, totalCentres]} />
        <AdminKpiCard label="Parents on CentreConnect" value={totalParents} sparklineData={[Math.max(totalParents - newParents, 0), newParents, totalParents]} />
        <AdminKpiCard label="Paid revenue" value={money(paidRevenueCents)} sparklineData={[Math.max(paidRevenueCents / 200, 1), Math.max(paidRevenueCents / 150, 1), Math.max(paidRevenueCents / 100, 1)]} />
        <AdminKpiCard label="Open support tickets" value={openSupport} sparklineData={[Math.max(openSupport - 2, 0), Math.max(openSupport - 1, 0), openSupport]} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-400">
        This page uses live admin counts plus already-shipped product capabilities. It does not guess future conversions or mark unpaid work as revenue.
      </div>

      <SectionCard
        title="Company hierarchy"
        description="Visible ownership so you can see who owns what without opening a separate page."
        href="/admin/hq"
        hrefLabel="Open Company HQ"
        icon={<Building2 className="h-4 w-4" />}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {hierarchyPreview.map((role) => (
            <div key={role.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">{role.owner}</p>
              <p className="mt-2 text-sm font-bold text-white">{role.label}</p>
              <p className="mt-2 text-xs text-slate-400">{role.currentFocus}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Plans (Now + Next)"
        description="The working plan is pinned here so it is impossible to lose track."
        href="/admin/hq#task-router"
        hrefLabel="Open full planning board"
        icon={<ShieldCheck className="h-4 w-4" />}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-300">Now</p>
            <div className="mt-3 space-y-2">
              {planNow.length > 0 ? planNow.slice(0, 5).map((item) => (
                <p key={item.id} className="text-sm text-slate-200">• {item.title}</p>
              )) : <p className="text-sm text-slate-500">No now items captured.</p>}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Next</p>
            <div className="mt-3 space-y-2">
              {planNext.length > 0 ? planNext.slice(0, 5).map((item) => (
                <p key={item.id} className="text-sm text-slate-200">• {item.title}</p>
              )) : <p className="text-sm text-slate-500">No next items captured.</p>}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Delegated agent work"
        description="Live delegated lanes from AI Company OS and OpenClaw surfaces, visible from dashboard."
        href="/admin/openclaw"
        hrefLabel="Open delegated work"
        icon={<BellRing className="h-4 w-4" />}
      >
        <div className="space-y-2">
          {delegatedWork.length > 0 ? delegatedWork.map((item) => (
            <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.owner ?? 'Unassigned owner'} • {item.sourceLabel}</p>
                </div>
                {item.href ? (
                  <Link href={item.href} className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300 hover:text-cyan-200">
                    Open
                  </Link>
                ) : null}
              </div>
            </div>
          )) : <p className="text-sm text-slate-500">No delegated items visible yet.</p>}
        </div>
      </SectionCard>

      <SectionCard
        title="Today"
        description="The live queues that need founder attention first."
        href="/admin/tenants"
        hrefLabel="Open action queues"
        icon={<CheckCircle2 className="h-4 w-4" />}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {actions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className={`rounded-2xl border p-4 transition-transform hover:-translate-y-0.5 ${actionToneClass(action.tone)}`}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">{action.title}</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-white">{action.count}</p>
              <p className="mt-2 text-sm text-slate-400">{action.detail}</p>
            </Link>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Product readiness today"
        description="A practical read before you onboard Sakhisizwe or any other pilot centre. Everything here is either live data or a shipped capability already in the product."
        href="/admin/ai-os"
        hrefLabel="Open founder status"
        icon={<ShieldCheck className="h-4 w-4" />}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {readinessCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className={`rounded-2xl border p-4 transition-transform hover:-translate-y-0.5 ${actionToneClass(card.tone)}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-2xl">
                  <p className="text-sm font-black text-white">{card.title}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{card.detail}</p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${toneBadgeClass(card.tone)}`}
                >
                  {card.statusLabel}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200">
                {card.title === 'Attendance fallback' ? <FileSpreadsheet className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                {card.hrefLabel}
              </div>
            </Link>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard
          title="Centres"
          description="Track who is live, who still needs onboarding help, and who is waiting for a claim response."
          href="/admin/tenants"
          hrefLabel="Open centres"
          icon={<Building2 className="h-4 w-4" />}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Centre team accounts</p>
              <p className="mt-2 text-2xl font-black text-white">{centreAccounts}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Onboarding in progress</p>
              <p className="mt-2 text-2xl font-black text-white">{onboardingCentres}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Prospect centres (not live yet)</p>
              <p className="mt-2 text-2xl font-black text-white">{prospectCentres}</p>
              <p className="mt-1 text-[11px] text-slate-500">Claim requests waiting: {claimRequests}</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {recentCentres.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-500">No centres yet.</div>
            ) : (
              recentCentres.map((centre) => (
                <div key={centre.id} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{centre.name}</p>
                      <p className="text-xs text-slate-400">{centre.city}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">{centre.meta}</span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">Added {fmtDate(centre.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Parents"
          description="Watch signups, unread welcomes, and whether parents are hitting form problems."
          href="/admin/parent-reliability?window=24h"
          hrefLabel="Open parent health"
          icon={<HeartHandshake className="h-4 w-4" />}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">New parents this week</p>
              <p className="mt-2 text-2xl font-black text-white">{newParents}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Unread welcomes</p>
              <p className="mt-2 text-2xl font-black text-white">{unreadWelcomes}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Form health</p>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] ${parentHealth.badgeClass}`}>
                  {parentHealth.label}
                </span>
              </div>
              <p className="mt-2 text-2xl font-black text-white">{parentFailures}</p>
              <p className="mt-2 text-xs text-slate-400">{parentHealth.hint}</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {recentParents.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-500">No parent accounts yet.</div>
            ) : (
              recentParents.map((parent) => (
                <div key={parent.id} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-sm font-semibold text-white">{parent.fullName}</p>
                  <p className="text-xs text-cyan-300">{parent.phone}</p>
                  <p className="mt-2 text-[11px] text-slate-500">Joined {fmtDate(parent.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Money"
          description="Keep a quick eye on paid revenue, unpaid invoices, and the value still waiting to be collected."
          href="/admin/revenue"
          hrefLabel="Open revenue"
          icon={<CreditCard className="h-4 w-4" />}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Paid invoices</p>
              <p className="mt-2 text-2xl font-black text-white">{paidInvoices.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Invoices still waiting</p>
              <p className="mt-2 text-2xl font-black text-white">{pendingInvoices.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Value still waiting</p>
              <p className="mt-2 text-2xl font-black text-white">{money(pendingRevenueCents)}</p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Latest paid revenue in this view</p>
            <p className="mt-2 text-3xl font-black text-white">{money(paidRevenueCents)}</p>
            <p className="mt-2 text-sm text-slate-400">This is a quick founder view. Use Revenue for invoice-by-invoice follow-up and collections.</p>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Support and invite activity"
        description="Recent centre invite traffic so you can resend, troubleshoot, or jump into a centre quickly."
        href="/admin/invites"
        hrefLabel="Open invites"
        icon={<BellRing className="h-4 w-4" />}
      >
        <div className="mb-4 flex flex-wrap gap-3 text-xs text-slate-400">
          <span>Rows in view: {inviteRows.length}</span>
          <span>Failed invites: {failedInvites}</span>
          <span>Open support: {openSupport}</span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
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
                    No invite activity yet.
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
                      <AdminDashboardInviteActions
                        audience="ecd"
                        rowId={row.id}
                        centreId={row.centreId}
                        status={row.statusKey as NotificationStatus}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <SectionCard
        title="Need help now?"
        description="Jump straight to the parts of the admin you use most when a centre phones you or something breaks."
        href="/admin/dashboard"
        hrefLabel="Stay on home"
        icon={<LifeBuoy className="h-4 w-4" />}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { href: '/admin/tenants', label: 'Centres', copy: 'Edit centre setup, ages, branding, and onboarding.' },
            { href: '/admin/invites', label: 'Invites', copy: 'Check whether welcome packs and owner invites actually went out.' },
            { href: '/admin/support', label: 'Support', copy: 'Reply to tickets and find centres at churn risk.' },
            { href: '/admin/revenue', label: 'Revenue', copy: 'Follow unpaid invoices and payment collection.' },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="rounded-2xl border border-white/10 bg-black/20 p-4 transition-colors hover:bg-white/5">
              <p className="text-sm font-black text-white">{item.label}</p>
              <p className="mt-2 text-sm text-slate-400">{item.copy}</p>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}


