import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/cc-admin/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/cc-admin/Table'
import { TenantAccessManager } from '@/components/admin/tenant-access-manager'
import { ActivateCentreButton } from '@/components/admin/ActivateCentreButton'
import { SendOwnerInviteButton } from '@/components/admin/send-owner-invite-button'
import { ROOT_DOMAIN } from '@/lib/config'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'CentreConnect - Tenant 360',
  description: 'Complete operational profile for one tenant workspace.',
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
}

type PageProps = { params: { id: string } }

export default async function AdminTenantDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'platform_admin') redirect('/login')

  const tenantId = params.id
  const [centreResult, adminsResult, invitationsResult, appsResult, analyticsResult, ticketResult, activityResult, adminTaskResult] = await Promise.all([
    admin
      .from('ecd_centres')
      .select('id,slug,name,email,phone,contact_phone,primary_contact_name,address,suburb,city,province,is_active,is_registered,created_at,onboarded_at,contract_signed,onboarding_fee_paid,subscriptions(*)')
      .eq('id', tenantId)
      .maybeSingle(),
    admin
      .from('ecd_admins')
      .select('id,user_id,role,invited_at,accepted_at,user_profiles(full_name,phone)')
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

  return (
    <AdminPageLayout
      title={`Tenant 360 | ${centre.name}`}
      description="Operational, billing, user access, analytics, and support view for one tenant."
      roleLabel="Architect Console"
      wide
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Subdomain</CardTitle></CardHeader><CardContent><p className="font-mono text-sm">{centre.slug}.{ROOT_DOMAIN}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Tenant Status</CardTitle></CardHeader><CardContent><p>{centre.is_active ? 'Enabled' : 'Disabled'}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Verification</CardTitle></CardHeader><CardContent><p>{centre.is_registered ? 'Verified badge active' : 'Not verified'}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Package</CardTitle></CardHeader><CardContent><p className="uppercase">{subscription?.tier ?? 'none'} | {subscription?.status ?? 'none'}</p></CardContent></Card>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Tenant Profile</CardTitle>
            <ActivateCentreButton
              tenantId={tenantId}
              onboardingFeePaid={centre.onboarding_fee_paid}
              hasPendingTask={!!adminTaskResult.data}
            />
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="text-slate-400">Name:</span> {centre.name}</p>
            <p><span className="text-slate-400">Email:</span> {centre.email}</p>
            <p><span className="text-slate-400">Phone:</span> {centre.phone}</p>
            <p><span className="text-slate-400">Address:</span> {centre.address}, {centre.suburb}, {centre.city}, {centre.province}</p>
            <p><span className="text-slate-400">Created:</span> {formatDateTime(centre.created_at)}</p>
            <p><span className="text-slate-400">Onboarded:</span> {formatDateTime(centre.onboarded_at)}</p>
            <p><span className="text-slate-400">Billing cycle end:</span> {formatDateTime(subscription?.current_period_end)}</p>
            <SendOwnerInviteButton
              centreId={tenantId}
              centreName={centre.name}
              ownerEmail={centre.email}
              ownerPhone={centre.contact_phone ?? centre.phone}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Application Funnel</CardTitle></CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <p>Submitted: <strong>{appByStatus.submitted}</strong></p>
            <p>In Review: <strong>{appByStatus.in_review}</strong></p>
            <p>Approved: <strong>{appByStatus.approved}</strong></p>
            <p>Waitlisted: <strong>{appByStatus.waitlisted}</strong></p>
            <p>Rejected: <strong>{appByStatus.rejected}</strong></p>
            <p>Total: <strong>{applications.length}</strong></p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
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
        <Card>
          <CardHeader><CardTitle>Analytics Snapshot</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Profile Views: <strong>{analyticsByType.profile_view}</strong></p>
            <p>WhatsApp Clicks: <strong>{analyticsByType.whatsapp_click}</strong></p>
            <p>Call Clicks: <strong>{analyticsByType.call_click}</strong></p>
            <p>Application Events: <strong>{analyticsByType.application_submitted}</strong></p>
            <p>Total Events: <strong>{analyticsEvents.length}</strong></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Support Snapshot</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Open: <strong>{ticketByStatus.open}</strong></p>
            <p>In Progress: <strong>{ticketByStatus.in_progress}</strong></p>
            <p>Waiting Response: <strong>{ticketByStatus.waiting_response}</strong></p>
            <p>Resolved: <strong>{ticketByStatus.resolved}</strong></p>
            <p>Closed: <strong>{ticketByStatus.closed}</strong></p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-4">
        <Card>
          <CardHeader><CardTitle>Platform Activity (Tenant)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-cyber-cyan/30 scrollbar-track-transparent">
              <div className="overflow-x-auto rounded-md border border-slate-700/80 bg-slate-950/30">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Summary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activity.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{formatDateTime(entry.created_at)}</TableCell>
                        <TableCell>{entry.actor_email ?? 'platform-admin'}</TableCell>
                        <TableCell>{entry.action}</TableCell>
                        <TableCell>{entry.summary}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </AdminPageLayout>
  )
}
