import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { CyberCard } from '@/components/cc-admin/CyberCard'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/cc-admin/Table'
import { Mail, MessageCircle, PackageCheck, Send, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Invites | CC Control Tower',
  description: 'Track invite dispatch and welcome pack delivery activity across centres.',
}

const INVITE_CHANNELS = ['email', 'whatsapp'] as const
const INVITE_STATUSES = ['queued', 'sent', 'delivered', 'opened', 'clicked', 'claimed', 'failed'] as const
const INVITE_EVENT_TYPES = ['owner_invite', 'admin_access_invite', 'welcome_pack', 'centre_bootstrap_created'] as const

type InviteChannel = (typeof INVITE_CHANNELS)[number]
type InviteStatus = (typeof INVITE_STATUSES)[number]
type InviteEventType = (typeof INVITE_EVENT_TYPES)[number]

type InviteRow = {
  id: string
  centre_id: string | null
  event_key: string
  event_type: InviteEventType
  channel: InviteChannel
  recipient: string | null
  status: InviteStatus
  provider: string
  error_message: string | null
  payload: Record<string, unknown> | null
  created_at: string
  ecd_centres:
    | { name: string | null }
    | Array<{ name: string | null }>
    | null
}

type InvitesPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

function queryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]?.trim() ?? ''
  return value?.trim() ?? ''
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function normalizeInviteChannel(value: string): InviteChannel | '' {
  return INVITE_CHANNELS.includes(value as InviteChannel) ? (value as InviteChannel) : ''
}

function normalizeInviteStatus(value: string): InviteStatus | '' {
  return INVITE_STATUSES.includes(value as InviteStatus) ? (value as InviteStatus) : ''
}

function normalizeInviteEventType(value: string): InviteEventType | '' {
  return INVITE_EVENT_TYPES.includes(value as InviteEventType) ? (value as InviteEventType) : ''
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatEventType(value: InviteEventType) {
  if (value === 'owner_invite') return 'Owner Invite'
  if (value === 'admin_access_invite') return 'Admin Invite'
  if (value === 'welcome_pack' || value === 'centre_bootstrap_created') return 'Welcome Pack'
  return value
}

function statusClass(status: InviteStatus) {
  if (status === 'claimed') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
  if (status === 'clicked') return 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300'
  if (status === 'opened') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
  if (status === 'delivered') return 'border-blue-500/30 bg-blue-500/10 text-blue-300'
  if (status === 'queued') return 'border-slate-500/30 bg-slate-500/10 text-slate-300'
  if (status === 'failed') return 'border-rose-500/30 bg-rose-500/10 text-rose-300'
  return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
}

function sanitizeSearchTerm(value: string) {
  return value.replace(/[,%()'"]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)
}

export default async function AdminInvitesPage({ searchParams }: InvitesPageProps) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'platform_admin') redirect('/login')

  const selectedChannel = normalizeInviteChannel(queryValue(searchParams?.channel))
  const selectedStatus = normalizeInviteStatus(queryValue(searchParams?.status))
  const selectedEventType = normalizeInviteEventType(queryValue(searchParams?.event))
  const selectedCentreId = queryValue(searchParams?.centre)
  const searchTerm = sanitizeSearchTerm(queryValue(searchParams?.q))

  let logsQuery = admin
    .from('notification_logs')
    .select('id,centre_id,event_key,event_type,channel,recipient,status,provider,error_message,payload,created_at,ecd_centres(name)')
    .in('event_type', [...INVITE_EVENT_TYPES])
    .order('created_at', { ascending: false })
    .limit(1000)

  if (selectedChannel) logsQuery = logsQuery.eq('channel', selectedChannel)
  if (selectedStatus) logsQuery = logsQuery.eq('status', selectedStatus)
  if (selectedEventType) logsQuery = logsQuery.eq('event_type', selectedEventType)
  if (selectedCentreId) logsQuery = logsQuery.eq('centre_id', selectedCentreId)
  if (searchTerm) {
    logsQuery = logsQuery.or(`recipient.ilike.%${searchTerm}%,event_key.ilike.%${searchTerm}%`)
  }

  const [logsResult, centresResult, analyticsResult] = await Promise.all([
    logsQuery,
    admin.from('ecd_centres').select('id,name').order('name', { ascending: true }).limit(500),
    admin.from('ecd_analytics_events').select('event_type').order('created_at', { ascending: false }).limit(5000),
  ])

  const logs = (logsResult.data ?? []) as InviteRow[]
  const centres = (centresResult.data ?? []) as Array<{ id: string; name: string }>
  const analyticsEvents = (analyticsResult.data ?? []) as Array<{ event_type: string }>

  const sentCount = logs.filter((row) => row.status === 'sent').length
  const deliveredCount = logs.filter((row) => row.status === 'delivered').length
  const openedCount = logs.filter((row) => row.status === 'opened').length
  const clickedCount = logs.filter((row) => row.status === 'clicked').length
  const claimedCount = logs.filter((row) => row.status === 'claimed').length
  const failedCount = logs.filter((row) => row.status === 'failed').length
  const welcomePackCount = logs.filter(
    (row) => row.event_type === 'welcome_pack' || row.event_type === 'centre_bootstrap_created'
  ).length
  const ownerInviteCount = logs.filter((row) => row.event_type === 'owner_invite').length
  const welcomeViewedCount = analyticsEvents.filter((event) => event.event_type === 'welcome_pack_viewed').length
  const qrViewedCount = analyticsEvents.filter((event) => event.event_type === 'qr_poster_viewed').length
  const qrPrintedCount = analyticsEvents.filter((event) => event.event_type === 'qr_poster_print_completed').length
  const onboardingCompleteCount = analyticsEvents.filter(
    (event) => event.event_type === 'onboarding_completed'
  ).length

  const fieldClass =
    'h-10 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none'

  return (
    <AdminPageLayout
      title="Invites"
      description="Simple tracking for every invite and welcome pack sent from CC Admin flows."
      roleLabel="Architect Console"
      wide
    >
      <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CyberCard accent="cyan" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500">Rows in View</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">{logs.length}</h3>
              <p className="mt-1 text-[10px] text-cyan-300">FILTERED_INVITE_LOGS</p>
            </div>
            <Send className="h-4 w-4 text-cyan-300" />
          </div>
        </CyberCard>

        <CyberCard accent="violet" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500">Sent / Delivered / Clicked / Claimed</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">
                {sentCount} / {deliveredCount} / {clickedCount} / {claimedCount}
              </h3>
              <p className="mt-1 text-[10px] text-cyber-violet">STATE_DISTRIBUTION</p>
            </div>
            <Sparkles className="h-4 w-4 text-cyber-violet" />
          </div>
        </CyberCard>

        <CyberCard accent="green" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500">Welcome Packs</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">{welcomePackCount}</h3>
              <p className="mt-1 text-[10px] text-cyber-green">PILOT_ONBOARDING_MAILERS</p>
            </div>
            <PackageCheck className="h-4 w-4 text-cyber-green" />
          </div>
        </CyberCard>

        <CyberCard accent="cyan" glow className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500">Owner Invites / Failed</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">
                {ownerInviteCount} / {failedCount}
              </h3>
              <p className="mt-1 text-[10px] text-cyan-300">OWNER_REACHOUT_HEALTH</p>
            </div>
            {failedCount > 0 ? <MessageCircle className="h-4 w-4 text-cyan-300" /> : <Mail className="h-4 w-4 text-cyan-300" />}
          </div>
        </CyberCard>

        <CyberCard accent="green" glow className="p-5 md:col-span-2 xl:col-span-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mb-1 font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500">Activation Funnel Signals</p>
              <h3 className="font-orbitron text-lg font-bold text-white">
                Welcome Viewed: {welcomeViewedCount} | QR Viewed: {qrViewedCount} | QR Printed: {qrPrintedCount} | Onboarding Completed: {onboardingCompleteCount}
              </h3>
              <p className="mt-1 text-[10px] text-cyber-green">LIVE_ONBOARDING_FUNNEL</p>
            </div>
            <Sparkles className="h-4 w-4 text-cyber-green" />
          </div>
        </CyberCard>
      </section>

      <CyberCard className="mb-6 p-6">
        <form method="get" className="grid gap-3 md:grid-cols-6">
          <input
            type="text"
            name="q"
            defaultValue={searchTerm}
            placeholder="Search recipient or event key"
            className={fieldClass}
          />
          <select name="channel" defaultValue={selectedChannel} className={`cc-native-field ${fieldClass}`}>
            <option value="">All channels</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
          <select name="event" defaultValue={selectedEventType} className={`cc-native-field ${fieldClass}`}>
            <option value="">All events</option>
            <option value="owner_invite">Owner Invite</option>
            <option value="admin_access_invite">Admin Invite</option>
            <option value="welcome_pack">Welcome Pack</option>
            <option value="centre_bootstrap_created">Bootstrap Pack</option>
          </select>
          <select name="status" defaultValue={selectedStatus} className={`cc-native-field ${fieldClass}`}>
            <option value="">All statuses</option>
            <option value="queued">Queued</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="opened">Opened</option>
            <option value="clicked">Clicked</option>
            <option value="claimed">Claimed</option>
            <option value="failed">Failed</option>
          </select>
          <select name="centre" defaultValue={selectedCentreId} className={`cc-native-field ${fieldClass}`}>
            <option value="">All centres</option>
            {centres.map((centre) => (
              <option key={centre.id} value={centre.id}>
                {centre.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20"
            >
              Apply
            </button>
            <Link
              href="/admin/invites"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-300 hover:bg-white/5"
            >
              Clear
            </Link>
          </div>
        </form>
      </CyberCard>

      <CyberCard className="overflow-hidden p-0">
        <div className="border-b border-white/5 bg-white/2 px-6 py-4">
          <h2 className="font-orbitron text-xs font-bold uppercase tracking-widest text-white">
            Invite Registry
          </h2>
        </div>
        {logsResult.error ? (
          <div className="px-6 py-8 text-sm text-rose-300">
            Failed to load invite logs: {logsResult.error.message}
          </div>
        ) : logs.length === 0 ? (
          <div className="px-6 py-10 text-sm text-slate-400">
            No invite logs found for the selected filters.
          </div>
        ) : (
          <div className="bg-slate-950/40">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Sent</TableHead>
                    <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Centre</TableHead>
                    <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Recipient</TableHead>
                    <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Channel</TableHead>
                    <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Event</TableHead>
                    <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Status</TableHead>
                    <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Provider / Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((row) => {
                  const centreName = normalizeOne(row.ecd_centres)?.name ?? 'Unknown centre'
                  return (
                    <TableRow key={row.id} className="border-white/5 hover:bg-white/5">
                      <TableCell className="p-4 text-xs text-slate-400">{formatDateTime(row.created_at)}</TableCell>
                      <TableCell className="p-4 text-sm font-medium text-white">{centreName}</TableCell>
                      <TableCell className="p-4 text-sm text-slate-200">
                        {row.recipient ?? '-'}
                      </TableCell>
                      <TableCell className="p-4 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                        {row.channel}
                      </TableCell>
                      <TableCell className="p-4 text-xs text-slate-300">
                        {formatEventType(row.event_type)}
                      </TableCell>
                      <TableCell className="p-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClass(
                            row.status
                          )}`}
                        >
                          {row.status}
                        </span>
                      </TableCell>
                      <TableCell className="p-4 text-xs text-slate-400">
                        {row.provider}
                        {row.error_message ? ` | ${row.error_message}` : ''}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CyberCard>
    </AdminPageLayout>
  )
}
