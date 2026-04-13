import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FileWarning, HeartHandshake, ReceiptText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import {
  getNotificationDeliverySummary,
  getRecentNotificationFailures,
  OPERATIONAL_NOTIFICATION_EVENTS,
} from '@/lib/admin/notification-reporting'
import { getJohannesburgDateKey } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Notifications | Platform Admin',
  description: 'Operational notification reporting and overdue reminder opportunities.',
}

function fmtDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
}

function safe(value: string | null | undefined, fallback: string) {
  const text = String(value ?? '').trim()
  return text || fallback
}

export default async function AdminNotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'platform_admin') redirect('/login')

  const now = new Date()
  const dayAgoIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgoIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const threeDaysAgoIso = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString()
  const todayKey = getJohannesburgDateKey(now)

  const [summary24h, summary7d, failures7d, parentLinkStale, complianceMissing, invoiceOverdue, centres, children, attendanceRecords, legacyAttendance] = await Promise.all([
    getNotificationDeliverySummary(admin, {
      sinceIso: dayAgoIso,
      eventTypes: [...OPERATIONAL_NOTIFICATION_EVENTS],
    }),
    getNotificationDeliverySummary(admin, {
      sinceIso: sevenDaysAgoIso,
      eventTypes: [...OPERATIONAL_NOTIFICATION_EVENTS],
    }),
    getRecentNotificationFailures(admin, {
      sinceIso: sevenDaysAgoIso,
      eventTypes: [...OPERATIONAL_NOTIFICATION_EVENTS],
      limit: 20,
    }),
    admin
      .from('parent_link_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending'])
      .lt('created_at', threeDaysAgoIso),
    admin
      .from('compliance_documents')
      .select('id', { count: 'exact', head: true })
      .in('status', ['missing', 'expired']),
    admin
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'overdue'),
    admin
      .from('ecd_centres')
      .select('id,name,email')
      .eq('is_active', true)
      .eq('is_deleted', false),
    admin
      .from('children')
      .select('ecd_id')
      .eq('enrollment_status', 'active'),
    admin
      .from('attendance_records')
      .select('centre_id')
      .eq('date', todayKey),
    admin
      .from('attendance')
      .select('ecd_id')
      .eq('date', todayKey),
  ])

  const activeCentres = (centres.data ?? []) as Array<{ id: string; name: string | null; email: string | null }>
  const centreIds = new Set(activeCentres.map((c) => c.id))

  const activeChildrenByCentre = new Map<string, number>()
  for (const row of (children.data ?? []) as Array<{ ecd_id: string | null }>) {
    if (!row.ecd_id || !centreIds.has(row.ecd_id)) continue
    activeChildrenByCentre.set(row.ecd_id, (activeChildrenByCentre.get(row.ecd_id) ?? 0) + 1)
  }

  const centresWithAttendance = new Set<string>()
  for (const row of (attendanceRecords.data ?? []) as Array<{ centre_id: string | null }>) {
    if (row.centre_id) centresWithAttendance.add(row.centre_id)
  }
  for (const row of (legacyAttendance.data ?? []) as Array<{ ecd_id: string | null }>) {
    if (row.ecd_id) centresWithAttendance.add(row.ecd_id)
  }

  const registerOverdueCount = activeCentres.filter((centre) => {
    const hasChildren = (activeChildrenByCentre.get(centre.id) ?? 0) > 0
    if (!hasChildren) return false
    return !centresWithAttendance.has(centre.id)
  }).length

  return (
    <AdminPageLayout
      title="Notifications"
      description="Operational reminder reporting and next notification opportunities."
      roleLabel="Platform Admin"
      wide
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="admin-card p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-admin-text-muted">Ops notifications (24h)</p>
            <p className="mt-2 text-3xl font-black text-admin-text">{summary24h.total}</p>
            <p className="text-xs text-admin-text-muted">Sent {summary24h.sent} • Queued {summary24h.queued} • Failed {summary24h.failed}</p>
          </div>
          <div className="admin-card p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-admin-text-muted">Ops notifications (7d)</p>
            <p className="mt-2 text-3xl font-black text-admin-text">{summary7d.total}</p>
            <p className="text-xs text-admin-text-muted">Sent {summary7d.sent} • Queued {summary7d.queued} • Failed {summary7d.failed}</p>
          </div>
          <div className="admin-card p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-admin-text-muted">Overdue registers now</p>
            <p className="mt-2 text-3xl font-black text-admin-text">{registerOverdueCount}</p>
            <p className="text-xs text-admin-text-muted">Active children with no attendance marked today.</p>
          </div>
          <div className="admin-card p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-admin-text-muted">Failed ops notifications (7d)</p>
            <p className="mt-2 text-3xl font-black text-admin-text">{failures7d.length}</p>
            <p className="text-xs text-admin-text-muted">Needs resend or infra fix.</p>
          </div>
        </div>

        <div className="admin-card p-6 border-t-2 border-t-admin-warning">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-admin-warning">Recent failed deliveries</p>
              <p className="mt-1 text-xs text-admin-text-muted">Operational notifications only, last 7 days.</p>
            </div>
            <Link href="/admin/dashboard" className="text-xs font-black uppercase tracking-[0.16em] text-admin-accent hover:text-admin-accent/80">
              Open dashboard
            </Link>
          </div>

          {failures7d.length === 0 ? (
            <div className="rounded-xl border border-admin-border bg-admin-bg px-4 py-3 text-sm text-admin-text-muted">
              No failed operational notifications in the last 7 days.
            </div>
          ) : (
            <div className="space-y-2">
              {failures7d.map((row: any) => {
                const centre = Array.isArray(row.ecd_centres) ? row.ecd_centres[0] : row.ecd_centres
                return (
                  <div key={row.id} className="rounded-xl border border-admin-border bg-admin-bg px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-admin-text">{safe(centre?.name, 'Unknown centre')}</p>
                        <p className="text-xs text-admin-text-muted">{row.event_type} • {row.channel} • {safe(row.recipient, 'no recipient')}</p>
                        <p className="mt-1 text-xs text-admin-text-muted">{safe(row.provider, 'provider')} • {safe(row.error_message, 'no error message')}</p>
                      </div>
                      <p className="text-xs text-admin-text-muted">{fmtDate(row.created_at)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="admin-card p-6 border-t-2 border-t-admin-accent">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-admin-accent">P2 reminder candidates (not auto-sending yet)</p>
          <p className="mt-1 text-xs text-admin-text-muted">These are candidates to add only when they solve an operational problem, not as generic feature noise.</p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-admin-border bg-admin-bg px-4 py-3">
              <div className="flex items-center justify-between">
                <HeartHandshake className="h-4 w-4 text-admin-accent" />
                <p className="text-xl font-black text-admin-text">{parentLinkStale.count ?? 0}</p>
              </div>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-admin-text-muted">Parent link stale (72h+)</p>
              <p className="mt-1 text-xs text-admin-text-muted">Potential follow-up reminder queue.</p>
            </div>

            <div className="rounded-xl border border-admin-border bg-admin-bg px-4 py-3">
              <div className="flex items-center justify-between">
                <FileWarning className="h-4 w-4 text-admin-warning" />
                <p className="text-xl font-black text-admin-text">{complianceMissing.count ?? 0}</p>
              </div>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-admin-text-muted">Compliance missing/expired</p>
              <p className="mt-1 text-xs text-admin-text-muted">Candidate for targeted compliance nudges.</p>
            </div>

            <div className="rounded-xl border border-admin-border bg-admin-bg px-4 py-3">
              <div className="flex items-center justify-between">
                <ReceiptText className="h-4 w-4 text-admin-danger" />
                <p className="text-xl font-black text-admin-text">{invoiceOverdue.count ?? 0}</p>
              </div>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-admin-text-muted">Invoices overdue</p>
              <p className="mt-1 text-xs text-admin-text-muted">Candidate for billing reminder workflow.</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-admin-border bg-admin-bg px-4 py-3 text-xs text-admin-text-muted">
            Rule remains: <strong>register not marked → remind</strong>, <strong>account not activated → remind</strong>, everything else only if operationally justified.
          </div>
        </div>
      </div>
    </AdminPageLayout>
  )
}
