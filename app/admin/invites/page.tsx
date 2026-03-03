import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { CyberCard } from '@/components/cc-admin/CyberCard'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/cc-admin/Table'
import { Mail, PackageCheck, Send, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Invites | CC Control Tower',
  description: 'Track invite dispatch and welcome pack delivery activity across centres.',
}

const INVITE_TYPES = ['email', 'sms', 'welcome_pack'] as const
const INVITE_STATUSES = ['sent', 'opened', 'claimed'] as const

type InviteType = (typeof INVITE_TYPES)[number]
type InviteStatus = (typeof INVITE_STATUSES)[number]

type InviteRow = {
  id: string
  centre_id: string | null
  owner_email: string | null
  owner_phone: string | null
  invite_type: InviteType
  sent_at: string
  status: InviteStatus
  notes: string | null
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

function normalizeInviteType(value: string): InviteType | '' {
  return INVITE_TYPES.includes(value as InviteType) ? (value as InviteType) : ''
}

function normalizeInviteStatus(value: string): InviteStatus | '' {
  return INVITE_STATUSES.includes(value as InviteStatus) ? (value as InviteStatus) : ''
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatInviteType(value: InviteType) {
  if (value === 'welcome_pack') return 'Welcome Pack'
  return value.toUpperCase()
}

function statusClass(status: InviteStatus) {
  if (status === 'claimed') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
  if (status === 'opened') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
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

  const selectedType = normalizeInviteType(queryValue(searchParams?.type))
  const selectedStatus = normalizeInviteStatus(queryValue(searchParams?.status))
  const selectedCentreId = queryValue(searchParams?.centre)
  const searchTerm = sanitizeSearchTerm(queryValue(searchParams?.q))

  let logsQuery = admin
    .from('invite_logs')
    .select('id,centre_id,owner_email,owner_phone,invite_type,sent_at,status,notes,ecd_centres(name)')
    .order('sent_at', { ascending: false })
    .limit(1000)

  if (selectedType) logsQuery = logsQuery.eq('invite_type', selectedType)
  if (selectedStatus) logsQuery = logsQuery.eq('status', selectedStatus)
  if (selectedCentreId) logsQuery = logsQuery.eq('centre_id', selectedCentreId)
  if (searchTerm) {
    logsQuery = logsQuery.or(`owner_email.ilike.%${searchTerm}%,owner_phone.ilike.%${searchTerm}%`)
  }

  const [logsResult, centresResult] = await Promise.all([
    logsQuery,
    admin.from('ecd_centres').select('id,name').order('name', { ascending: true }).limit(500),
  ])

  const logs = (logsResult.data ?? []) as InviteRow[]
  const centres = (centresResult.data ?? []) as Array<{ id: string; name: string }>

  const sentCount = logs.filter((row) => row.status === 'sent').length
  const openedCount = logs.filter((row) => row.status === 'opened').length
  const claimedCount = logs.filter((row) => row.status === 'claimed').length
  const welcomePackCount = logs.filter((row) => row.invite_type === 'welcome_pack').length

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
              <p className="mb-1 font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500">Sent / Opened / Claimed</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">{sentCount} / {openedCount} / {claimedCount}</h3>
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
              <p className="mb-1 font-orbitron text-[9px] uppercase tracking-[0.25em] text-slate-500">Email-Type Sends</p>
              <h3 className="font-orbitron text-2xl font-bold text-white">
                {logs.filter((row) => row.invite_type === 'email').length}
              </h3>
              <p className="mt-1 text-[10px] text-cyan-300">ACCESS_AND_NOTIFY_MAIL</p>
            </div>
            <Mail className="h-4 w-4 text-cyan-300" />
          </div>
        </CyberCard>
      </section>

      <CyberCard className="mb-6 p-6">
        <form method="get" className="grid gap-3 md:grid-cols-5">
          <input
            type="text"
            name="q"
            defaultValue={searchTerm}
            placeholder="Search email or phone"
            className={fieldClass}
          />
          <select name="type" defaultValue={selectedType} className={`cc-native-field ${fieldClass}`}>
            <option value="">All types</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="welcome_pack">Welcome Pack</option>
          </select>
          <select name="status" defaultValue={selectedStatus} className={`cc-native-field ${fieldClass}`}>
            <option value="">All statuses</option>
            <option value="sent">Sent</option>
            <option value="opened">Opened</option>
            <option value="claimed">Claimed</option>
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
                  <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Owner Contact</TableHead>
                  <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Type</TableHead>
                  <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Status</TableHead>
                  <TableHead className="font-orbitron text-[10px] uppercase tracking-widest text-slate-500">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((row) => {
                  const centreName = normalizeOne(row.ecd_centres)?.name ?? 'Unknown centre'
                  return (
                    <TableRow key={row.id} className="border-white/5 hover:bg-white/5">
                      <TableCell className="p-4 text-xs text-slate-400">{formatDateTime(row.sent_at)}</TableCell>
                      <TableCell className="p-4 text-sm font-medium text-white">{centreName}</TableCell>
                      <TableCell className="p-4">
                        <p className="text-sm text-slate-200">{row.owner_email ?? '-'}</p>
                        <p className="text-xs text-slate-500">{row.owner_phone ?? '-'}</p>
                      </TableCell>
                      <TableCell className="p-4 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                        {formatInviteType(row.invite_type)}
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
                      <TableCell className="p-4 text-xs text-slate-400">{row.notes?.trim() || '-'}</TableCell>
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
