import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TenantAccessManager } from '@/components/admin/tenant-access-manager'
import { ActivateCentreButton } from '@/components/admin/ActivateCentreButton'
import { SendOwnerInviteButton } from '@/components/admin/send-owner-invite-button'
import { WhatsAppOwnerInviteButton } from '@/components/admin/whatsapp-owner-invite-button'
import { DisconnectCentreButton } from '@/components/admin/disconnect-centre-button'
import { APP_URL, ROOT_DOMAIN } from '@/lib/config'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Centre detail | Platform Admin',
  description: 'Operational profile for one centre workspace.',
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
}

type PageProps = { params: Promise<{ id: string }> }

export default async function AdminTenantDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'platform_admin') redirect('/login')

  const tenantId = (await params).id
  const [centreResult, adminsResult, invitationsResult, appsResult, analyticsResult, ticketResult, activityResult, adminTaskResult] = await Promise.all([
    admin
      .from('ecd_centres')
      .select('id,slug,name,email,phone,contact_phone,primary_contact_name,address,suburb,city,province,is_active,is_registered,created_at,onboarded_at,contract_signed,onboarding_fee_paid,owner_id,subscriptions(*)')
      .eq('id', tenantId)
      .maybeSingle(),
    admin
      .from('ecd_admins')
      .select('id,user_id,role,invited_at,accepted_at,user_profiles!ecd_admins_user_id_fkey(full_name,phone)')
      .eq('ecd_id', tenantId)
      .order('invited_at', { ascending: false }),
    admin
      .from('ecd_admin_invitations')
      .select('id,email,role,auth_user_id,invited_at,accepted_at')
      .eq('ecd_id', tenantId)
      .order('invited_at', { ascending: false })
      .limit(200),
    admin
      .from('applications')
      .select('id,status,submitted_at,reviewed_at,decided_at')
      .eq('ecd_id', tenantId)
      .order('submitted_at', { ascending: false })
      .limit(500),
    admin
      .from('ecd_analytics_events')
      .select('id,event_type,created_at')
      .eq('ecd_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(500),
    admin.from('support_tickets').select('id,status,created_at').eq('ecd_id', tenantId).order('created_at', { ascending: false }).limit(300),
    admin
      .from('platform_admin_activity_log')
      .select('id,actor_email,action,summary,created_at')
      .eq('entity_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(100),
    admin
      .from('admin_tasks')
      .select('id,type,status')
      .eq('ecd_id', tenantId)
      .eq('type', 'activate_tenant')
      .eq('status', 'pending')
      .maybeSingle(),
  ])

  const centre = centreResult.data as any
  if (!centre) redirect('/admin/tenants')

  const hasOwnerLink = Boolean(centre.owner_id)

  const subscription = normalizeOne(centre.subscriptions) as any
  const tenantAdmins = (adminsResult.data ?? []) as Array<{
    id: string
    user_id: string
    role: string
    invited_at: string
    accepted_at: string | null
    user_profiles: { full_name: string; phone: string | null } | Array<{ full_name: string; phone: string | null }> | null
  }>
  const invitationRows = (invitationsResult.data ?? []) as Array<{
    id: string
    email: string
    role: 'ecd_admin' | 'ecd_staff'
    auth_user_id: string | null
    invited_at: string
    accepted_at: string | null
  }>
  const lastInviteAt = invitationRows[0]?.invited_at ?? null

  const applications = (appsResult.data ?? []) as Array<{ status: string; submitted_at: string }>
  const analyticsEvents = (analyticsResult.data ?? []) as Array<{ event_type: string; created_at: string }>
  const tickets = (ticketResult.data ?? []) as Array<{ status: string; created_at: string }>
  const activity = (activityResult.data ?? []) as Array<{ id: string; actor_email: string | null; action: string; summary: string; created_at: string }>

  const appByStatus = {
    submitted: applications.filter((a) => a.status === 'submitted').length,
    in_review: applications.filter((a) => a.status === 'in_review').length,
    approved: applications.filter((a) => a.status === 'approved').length,
    waitlisted: applications.filter((a) => a.status === 'waitlisted').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  }

  const analyticsByType = {
    profile_view: analyticsEvents.filter((e) => e.event_type === 'profile_view').length,
    whatsapp_click: analyticsEvents.filter((e) => e.event_type === 'whatsapp_click').length,
    call_click: analyticsEvents.filter((e) => e.event_type === 'call_click').length,
    application_submitted: analyticsEvents.filter((e) => e.event_type === 'application_submitted').length,
  }

  const ticketByStatus = {
    open: tickets.filter((t) => t.status === 'open').length,
    in_progress: tickets.filter((t) => t.status === 'in_progress').length,
    waiting_response: tickets.filter((t) => t.status === 'waiting_response').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
    closed: tickets.filter((t) => t.status === 'closed').length,
  }
  const ownerPhone = centre.contact_phone?.trim() || centre.phone?.trim() || '-'
  const ownerEmail = centre.email?.trim() || '-'
  const totalOpenTickets = ticketByStatus.open + ticketByStatus.in_progress + ticketByStatus.waiting_response
  const appUrlRoot = APP_URL.replace(/\/$/, '')
  const slugSegment = centre.slug?.trim()
  const websiteHref = slugSegment ? `${appUrlRoot}/c/${slugSegment}` : appUrlRoot
  const activationReady = centre.onboarding_fee_paid && !!adminTaskResult.data

  return (
    <AdminPageLayout
      title={`Centre detail | ${centre.name}`}
      description="Billing, users, analytics, support, and setup for this centre."
      roleLabel="Platform Admin"
      wide
    >
      <div className="space-y-6 pb-10">
        <Card className="border-cyan-500/20 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-cyan-500/30 bg-cyan-500/15 text-cyan-200">Centre workspace</Badge>
              <Badge className={centre.is_active ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200' : 'border-rose-500/30 bg-rose-500/15 text-rose-200'}>
                {centre.is_active ? 'Enabled' : 'Disabled'}
              </Badge>
              <Badge className="border-slate-700 bg-slate-900 text-slate-300">
                {centre.is_registered ? 'Verified' : 'Unverified'}
              </Badge>
            </div>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <CardTitle className="text-3xl font-black tracking-tight text-white">{centre.name}</CardTitle>
                <CardDescription className="mt-2 text-slate-300">
                  {centre.slug}.{ROOT_DOMAIN}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" className="border-cyan-500/30 bg-slate-900 text-cyan-200 hover:bg-slate-800">
                  <Link href="/admin/tenants">Back to Tenants</Link>
                </Button>
                <Button asChild variant="outline" className="border-cyan-500/30 bg-slate-900 text-cyan-200 hover:bg-slate-800">
                  <a href={websiteHref} target="_blank" rel="noreferrer">
                    Open Centre Site
                  </a>
                </Button>
                <ActivateCentreButton
                  tenantId={tenantId}
                  onboardingFeePaid={centre.onboarding_fee_paid}
                  hasPendingTask={!!adminTaskResult.data}
                />
                {hasOwnerLink && <DisconnectCentreButton tenantId={tenantId} />}
              </div>
            </div>
          </CardHeader>
        </Card>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-cyan-500/20 bg-slate-950/70">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-[0.18em] text-slate-500">Package</CardDescription>
              <CardTitle className="text-white">{(subscription?.tier ?? 'none').toUpperCase()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300">{subscription?.status ?? 'none'}</p>
            </CardContent>
          </Card>
          <Card className="border-cyan-500/20 bg-slate-950/70">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-[0.18em] text-slate-500">Applications</CardDescription>
              <CardTitle className="text-white">{applications.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300">{appByStatus.in_review} currently in review</p>
            </CardContent>
          </Card>
          <Card className="border-cyan-500/20 bg-slate-950/70">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-[0.18em] text-slate-500">Analytics Events</CardDescription>
              <CardTitle className="text-white">{analyticsEvents.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300">{analyticsByType.profile_view} profile views logged</p>
            </CardContent>
          </Card>
          <Card className="border-cyan-500/20 bg-slate-950/70">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-[0.18em] text-slate-500">Support</CardDescription>
              <CardTitle className="text-white">{totalOpenTickets}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300">Open / active tickets</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <Card className="border-cyan-500/20 bg-slate-950/70">
            <CardHeader>
              <CardTitle className="text-white">Tenant Profile</CardTitle>
              <CardDescription className="text-slate-400">
                Core ownership, location and billing metadata.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Owner Email</p>
                  <p className="mt-1 break-all text-slate-100">{ownerEmail}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Owner Phone</p>
                  <p className="mt-1 text-slate-100">{ownerPhone}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Address</p>
                  <p className="mt-1 text-slate-100">
                    {[centre.address, centre.suburb, centre.city, centre.province].filter(Boolean).join(', ') || '-'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Created</p>
                  <p className="mt-1 text-slate-100">{formatDateTime(centre.created_at)}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Onboarded</p>
                  <p className="mt-1 text-slate-100">{formatDateTime(centre.onboarded_at)}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Billing Cycle End</p>
                  <p className="mt-1 text-slate-100">{formatDateTime(subscription?.current_period_end)}</p>
                </div>
              </div>
              <SendOwnerInviteButton
                centreId={tenantId}
                centreName={centre.name}
                ownerEmail={centre.email}
                ownerPhone={centre.contact_phone ?? centre.phone}
                lastInviteAt={lastInviteAt}
              />
              <WhatsAppOwnerInviteButton
                centreId={tenantId}
                centreName={centre.name}
                ownerEmail={centre.email}
                ownerPhone={centre.contact_phone ?? centre.phone}
                lastInviteAt={lastInviteAt}
              />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-cyan-500/20 bg-slate-950/70">
              <CardHeader>
                <CardTitle className="text-white">Application Funnel</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                <p className="text-slate-300">Submitted: <strong className="text-slate-100">{appByStatus.submitted}</strong></p>
                <p className="text-slate-300">In Review: <strong className="text-slate-100">{appByStatus.in_review}</strong></p>
                <p className="text-slate-300">Approved: <strong className="text-slate-100">{appByStatus.approved}</strong></p>
                <p className="text-slate-300">Waitlisted: <strong className="text-slate-100">{appByStatus.waitlisted}</strong></p>
                <p className="text-slate-300">Rejected: <strong className="text-slate-100">{appByStatus.rejected}</strong></p>
                <p className="text-slate-300">Total: <strong className="text-slate-100">{applications.length}</strong></p>
              </CardContent>
            </Card>
            <Card className="border-cyan-500/20 bg-slate-950/70">
              <CardHeader>
                <CardTitle className="text-white">Analytics Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-slate-300">
                <p>Profile Views: <strong className="text-slate-100">{analyticsByType.profile_view}</strong></p>
                <p>WhatsApp Clicks: <strong className="text-slate-100">{analyticsByType.whatsapp_click}</strong></p>
                <p>Call Clicks: <strong className="text-slate-100">{analyticsByType.call_click}</strong></p>
                <p>Application Events: <strong className="text-slate-100">{analyticsByType.application_submitted}</strong></p>
              </CardContent>
            </Card>
            <Card className="border-cyan-500/20 bg-slate-950/70">
              <CardHeader>
                <CardTitle className="text-white">Support Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-slate-300">
                <p>Open: <strong className="text-slate-100">{ticketByStatus.open}</strong></p>
                <p>In Progress: <strong className="text-slate-100">{ticketByStatus.in_progress}</strong></p>
                <p>Waiting Response: <strong className="text-slate-100">{ticketByStatus.waiting_response}</strong></p>
                <p>Resolved: <strong className="text-slate-100">{ticketByStatus.resolved}</strong></p>
                <p>Closed: <strong className="text-slate-100">{ticketByStatus.closed}</strong></p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <TenantAccessManager
            tenantId={tenantId}
            admins={tenantAdmins.map((adminRow) => {
              const profileRow = normalizeOne(adminRow.user_profiles as any) as { full_name: string; phone: string | null } | null
              return {
                id: adminRow.id,
                user_id: adminRow.user_id,
                role: adminRow.role as 'ecd_admin' | 'ecd_staff',
                invited_at: adminRow.invited_at,
                accepted_at: adminRow.accepted_at,
                full_name: profileRow?.full_name ?? null,
                phone: profileRow?.phone ?? null,
              }
            })}
            invitations={invitationRows}
          />
          <Card className="border-cyan-500/20 bg-slate-950/70">
            <CardHeader>
              <CardTitle className="text-white">Activation Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-slate-300">
                <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Contract Signed</p>
                <p className="mt-1 font-medium text-slate-100">{centre.contract_signed ? 'Yes' : 'No'}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-slate-300">
                <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Onboarding Fee Paid</p>
                <p className="mt-1 font-medium text-slate-100">{centre.onboarding_fee_paid ? 'Yes' : 'No'}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-slate-300">
                <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Pending Activation Task</p>
                <p className="mt-1 font-medium text-slate-100">{adminTaskResult.data ? 'Present' : 'Not found'}</p>
              </div>
              <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-3 text-cyan-100">
                {activationReady
                  ? 'Ready to activate. Use the Activate Centre action above.'
                  : 'Activation is blocked until onboarding fee and pending activation task requirements are met.'}
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="border-cyan-500/20 bg-slate-950/70">
            <CardHeader>
              <CardTitle className="text-white">Platform Activity (Tenant)</CardTitle>
              <CardDescription className="text-slate-400">
                Full tenant timeline for platform admin actions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/30">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-xs uppercase tracking-[0.15em] text-slate-500">Time</TableHead>
                      <TableHead className="text-xs uppercase tracking-[0.15em] text-slate-500">Actor</TableHead>
                      <TableHead className="text-xs uppercase tracking-[0.15em] text-slate-500">Action</TableHead>
                      <TableHead className="text-xs uppercase tracking-[0.15em] text-slate-500">Summary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activity.length === 0 ? (
                      <TableRow className="border-slate-800">
                        <TableCell colSpan={4} className="py-8 text-center text-slate-500">
                          No activity recorded yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      activity.map((entry) => (
                        <TableRow key={entry.id} className="border-slate-800">
                          <TableCell className="text-slate-300">{formatDateTime(entry.created_at)}</TableCell>
                          <TableCell className="text-slate-300">{entry.actor_email ?? 'platform-admin'}</TableCell>
                          <TableCell className="text-slate-200">{entry.action}</TableCell>
                          <TableCell className="max-w-[680px] whitespace-normal break-words text-slate-300">{entry.summary}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </AdminPageLayout>
  )
}
