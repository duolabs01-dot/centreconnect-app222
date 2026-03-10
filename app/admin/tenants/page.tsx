import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AdminTenantsOnboarding } from '@/components/admin/admin-tenants-onboarding'
import {
  AdminTenantInviteTracking,
  type AdminTenantInviteLog,
  } from '@/components/admin/admin-tenant-invite-tracking'
import { AdminTenantsTable, type AdminTenantTableRow } from '@/components/admin/admin-tenants-table'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { splitFullName } from '@/lib/utils/name'
import { assertInviteDomainHealth } from '@/lib/auth/onboarding-links'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Centres | Platform Admin',
  description: 'Add centres, fix onboarding, and manage the full centre directory.',
}

async function requirePlatformAdmin() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'platform_admin') redirect('/login')

  return { admin }
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function toRandString(value: number | string | null | undefined) {
  if (value == null) return ''
  const parsed = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(parsed)) return ''
  return String(parsed)
}

function extractAgeFee(ageGroupPricing: any, key: string) {
  const bucket = ageGroupPricing?.[key]
  if (!bucket || typeof bucket !== 'object') return ''
  const cents = Number(bucket.monthly_fee_cents ?? bucket.monthlyFeeCents ?? 0)
  if (!Number.isFinite(cents) || cents <= 0) return ''
  return String(Math.round(cents / 100))
}

function deriveAgeRange(ageGroups: string[] | null | undefined) {
  const values = (ageGroups ?? [])
    .flatMap((group) => group.match(/\d+/g) ?? [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))

  if (values.length === 0) {
    return { start: '0', end: '6' }
  }

  return {
    start: String(Math.min(...values)),
    end: String(Math.max(...values)),
  }
}

export default async function AdminTenantsPage() {
  const { admin } = await requirePlatformAdmin()

  const [centresResult, invitationsResult, inviteLogsResult] = await Promise.all([
    admin
      .from('ecd_centres')
      .select(
        'id,slug,name,email,phone,contact_phone,contact_whatsapp,primary_contact_name,primary_contact_first_name,primary_contact_surname,address,suburb,city,province,postal_code,is_active,is_registered,owner_id,created_at,logo_url,cover_image_url,fees_display_mode,monthly_fee_min,monthly_fee_max,subsidy_accepted,age_groups,age_group_pricing,communication_automation_settings,subscriptions(tier,status,monthly_price)'
      )
      .or('is_deleted.is.null,is_deleted.eq.false')
      .order('created_at', { ascending: false })
      .limit(1000),
    admin
      .from('ecd_admin_invitations')
      .select('ecd_id,accepted_at,invited_at')
      .eq('role', 'ecd_admin')
      .order('invited_at', { ascending: false })
      .limit(5000),
    admin
      .from('notification_logs')
      .select('id,centre_id,event_key,event_type,channel,status,recipient,created_at,ecd_centres(name)')
      .in('event_type', ['owner_invite', 'admin_access_invite', 'welcome_pack', 'centre_bootstrap_created'])
      .order('created_at', { ascending: false })
      .limit(150),
  ])

  const centres = (centresResult.data ?? []) as Array<{
    id: string
    slug: string | null
    name: string | null
    email: string | null
    phone: string | null
    contact_phone: string | null
    contact_whatsapp: string | null
    primary_contact_name: string | null
    primary_contact_first_name: string | null
    primary_contact_surname: string | null
    address: string | null
    suburb: string | null
    city: string | null
    province: string | null
    postal_code: string | null
    is_active: boolean | null
    is_registered: boolean | null
    owner_id: string | null
    created_at: string
    logo_url: string | null
    cover_image_url: string | null
    fees_display_mode: 'exact' | 'range' | 'contact' | null
    monthly_fee_min: number | null
    monthly_fee_max: number | null
    subsidy_accepted: boolean | null
    age_groups: string[] | null
    age_group_pricing: Record<string, any> | null
    communication_automation_settings: Record<string, any> | null
    subscriptions:
      | {
          tier: 'basic' | 'standard' | 'premium'
          status: 'trial' | 'active' | 'past_due' | 'canceled' | 'suspended'
          monthly_price: number
        }
      | Array<{
          tier: 'basic' | 'standard' | 'premium'
          status: 'trial' | 'active' | 'past_due' | 'canceled' | 'suspended'
          monthly_price: number
        }>
      | null
  }>
  const invitationRows = (invitationsResult.data ?? []) as Array<{
    ecd_id: string
    accepted_at: string | null
    invited_at: string | null
  }>

  const claimedByCentre = new Map<string, string>()
  for (const row of invitationRows) {
    if (!row.accepted_at) continue
    const existing = claimedByCentre.get(row.ecd_id)
    if (!existing || new Date(row.accepted_at).getTime() > new Date(existing).getTime()) {
      claimedByCentre.set(row.ecd_id, row.accepted_at)
    }
  }

  const tenants: AdminTenantTableRow[] = centres.map((centre) => {
    const splitContactName = splitFullName(centre.primary_contact_name)
    const subscription = normalizeOne(centre.subscriptions)
    const claimedDate = claimedByCentre.get(centre.id) ?? null
    const ownerPhone = centre.contact_phone?.trim() || centre.phone?.trim() || '-'
    const ownerEmail = centre.email?.trim() || '-'
    const isClaimed = Boolean(centre.owner_id) || Boolean(claimedDate)
    const status: AdminTenantTableRow['status'] = !centre.is_active ? 'Inactive' : isClaimed ? 'Claimed' : 'Unclaimed'
    const tenantOverrides =
      centre.communication_automation_settings &&
      typeof centre.communication_automation_settings === 'object' &&
      !Array.isArray(centre.communication_automation_settings)
        ? (centre.communication_automation_settings.tenant_admin_overrides as Record<string, unknown> | undefined)
        : undefined
    const marketplaceUpgrades = Array.isArray(tenantOverrides?.marketplace_upgrades)
      ? (tenantOverrides?.marketplace_upgrades as string[]).join(', ')
      : ''
    const ageRange = deriveAgeRange(centre.age_groups)
    const dsdStatus = (() => {
      const raw = typeof tenantOverrides?.dsd_status === 'string' ? tenantOverrides.dsd_status : null
      if (raw === 'pending' || raw === 'registered' || raw === 'expired' || raw === 'suspended' || raw === 'not_required') {
        return raw
      }
      return centre.is_registered ? 'registered' : 'pending'
    })()
    return {
      id: centre.id,
      name: centre.name?.trim() || 'Untitled Centre',
      slug: centre.slug?.trim() || '',
      ownerEmail,
      ownerPhone,
      status,
      claimedDate: claimedDate ?? (isClaimed ? centre.created_at : null),
      primaryContactName: centre.primary_contact_name?.trim() || '',
      primaryContactFirstName: centre.primary_contact_first_name?.trim() || splitContactName.firstName || '',
      primaryContactSurname: centre.primary_contact_surname?.trim() || splitContactName.surname || '',
      email: centre.email?.trim() || '',
      phone: centre.phone?.trim() || '',
      contactPhone: centre.contact_phone?.trim() || '',
      contactWhatsapp: centre.contact_whatsapp?.trim() || '',
      address: centre.address?.trim() || '',
      suburb: centre.suburb?.trim() || '',
      city: centre.city?.trim() || 'Johannesburg',
      province: centre.province?.trim() || 'Gauteng',
      postalCode: centre.postal_code?.trim() || '',
      logoUrl: centre.logo_url?.trim() || '',
      coverImageUrl: centre.cover_image_url?.trim() || '',
      feesDisplayMode: centre.fees_display_mode ?? 'range',
      monthlyFeeMin: toRandString(centre.monthly_fee_min),
      monthlyFeeMax: toRandString(centre.monthly_fee_max),
      subsidyAccepted: Boolean(centre.subsidy_accepted),
      age0to2: extractAgeFee(centre.age_group_pricing, '0-2'),
      age2to4: extractAgeFee(centre.age_group_pricing, '2-4'),
      age4to6: extractAgeFee(centre.age_group_pricing, '4-6'),
      age6plus: extractAgeFee(centre.age_group_pricing, '6+'),
      ageRangeStart: ageRange.start,
      ageRangeEnd: ageRange.end,
      operatingHours: typeof tenantOverrides?.operating_hours === 'string' ? tenantOverrides.operating_hours : '',
      dsdStatus,
      marketplaceUpgrades,
      isActive: Boolean(centre.is_active),
      isRegistered: Boolean(centre.is_registered),
      subscriptionTier: (subscription?.tier as 'basic' | 'standard' | 'premium' | undefined) ?? 'none',
      subscriptionStatus: subscription?.status ?? 'trial',
      subscriptionMonthlyPrice: toRandString(subscription?.monthly_price),
    }
  })
  const existingCentres = tenants.map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    ownerEmail: tenant.ownerEmail === '-' ? null : tenant.ownerEmail,
  }))

  const inviteLogs = (inviteLogsResult.data ?? []).map((log) => ({
    id: log.id,
    centreId: log.centre_id,
    centreName: normalizeOne(log.ecd_centres)?.name ?? 'Unknown centre',
    eventType: log.event_type,
    channel: log.channel,
    status: log.status,
    recipient: log.recipient,
    createdAt: log.created_at,
    eventKey: log.event_key ?? null,
  })) as AdminTenantInviteLog[]
  const inviteDomainHealth = assertInviteDomainHealth()
  const latestOwnerEmailInvite = inviteLogs.find((log) => log.eventType === 'owner_invite' && log.channel === 'email')
  const latestFailedOwnerInvite = inviteLogs.find(
    (log) => log.eventType === 'owner_invite' && log.channel === 'email' && log.status === 'failed'
  )
  const inviteFailuresLast24Hours = inviteLogs.filter((log) => {
    const created = new Date(log.createdAt).getTime()
    if (!Number.isFinite(created)) return false
    const ageMs = Date.now() - created
    return ageMs <= 24 * 60 * 60 * 1000 && log.status === 'failed'
  }).length
  const ownerAcceptedCount = invitationRows.filter((row) => Boolean(row.accepted_at)).length
  const ownerPendingCount = Math.max(invitationRows.length - ownerAcceptedCount, 0)
  const pendingClaimCount = tenants.filter((tenant) => tenant.status !== 'Claimed').length
  const missingBrandingCount = tenants.filter((tenant) => !tenant.logoUrl || !tenant.coverImageUrl).length
  const failedInviteCount = inviteLogs.filter((log) => log.status === 'failed').length
  const pilotPriorityCentres = tenants
    .filter((tenant) => /bajabulile|sakhisizwe/i.test(tenant.name) || tenant.status !== 'Claimed')
    .slice(0, 5)

  return (
    <main className="space-y-12 px-4 py-10 lg:px-8">
      <section className="rounded-3xl border border-cyan-500/30 bg-cyan-950/20 p-5 shadow-[0_20px_60px_rgba(6,182,212,0.18)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Today&apos;s Action Queue</p>
            <h2 className="mt-1 text-2xl font-black text-white">Today&apos;s centre actions</h2>
            <p className="mt-1 max-w-3xl text-sm text-cyan-50/90">
              The centres that need attention first so you can unblock onboarding quickly.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/invites">
              <Button className="bg-cyan-500 text-black hover:bg-cyan-400">Open Invite Tracking</Button>
            </Link>
            <Link href="/admin/tenants">
              <Button variant="outline" className="border-cyan-200/50 bg-white/10 text-cyan-50 hover:bg-cyan-900/40">
                Open centre directory
              </Button>
            </Link>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Pending owner claim</p>
            <p className="mt-1 text-2xl font-black text-white">{pendingClaimCount}</p>
            <p className="mt-1 text-xs text-slate-400">Centres still not fully claimed by owner account.</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Missing branding</p>
            <p className="mt-1 text-2xl font-black text-white">{missingBrandingCount}</p>
            <p className="mt-1 text-xs text-slate-400">Centres missing logo or hero image in onboarding flow.</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Failed invites</p>
            <p className="mt-1 text-2xl font-black text-white">{failedInviteCount}</p>
            <p className="mt-1 text-xs text-slate-400">Any failed owner/admin/welcome-pack delivery records.</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">Priority centres</p>
          {pilotPriorityCentres.length === 0 ? (
            <p className="mt-2 text-sm text-slate-300">No priority centres pending right now.</p>
          ) : (
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {pilotPriorityCentres.map((centre) => (
                <li key={centre.id} className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white">
                  <span className="font-semibold">{centre.name}</span>
                  <span className="ml-2 text-xs uppercase tracking-[0.08em] text-cyan-300">{centre.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Create Tenant</p>
          <h1 className="text-3xl font-black text-white">Add or update centres</h1>
          <p className="max-w-3xl text-sm text-slate-400">
            Add one centre or load a list, then send the right welcome and access messages without extra steps.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4 shadow-[0_25px_100px_rgba(2,6,23,0.65)]">
          <AdminTenantsOnboarding existingCentres={existingCentres} />
        </div>
        <div className="flex justify-end">
        <Link href="/admin/tenants/bin">
          <Button
            className="inline-flex items-center justify-center rounded-full border border-slate-800 bg-slate-950 px-5 py-2 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(2,6,23,0.6)] transition hover:border-slate-300 hover:bg-slate-900/80 hover:shadow-[0_20px_60px_rgba(15,118,110,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            variant="outline"
          >
            View deleted centres
          </Button>
        </Link>
      </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Invite health</p>
          <h2 className="text-3xl font-black text-white">Invite Reliability</h2>
          <p className="max-w-3xl text-sm text-slate-400">
            Live checks for domain safety, invite delivery, and owner acceptance so you can catch onboarding failures
            before they hit centre owners.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Domain Guard</p>
            <p className={`mt-2 text-lg font-bold ${inviteDomainHealth.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
              {inviteDomainHealth.ok ? 'Healthy' : 'Action Required'}
            </p>
            <p className="mt-1 text-xs text-slate-300">{inviteDomainHealth.message}</p>
            {inviteDomainHealth.details.length > 0 ? (
              <div className="mt-2 space-y-1">
                {inviteDomainHealth.details.slice(0, 4).map((detail) => (
                  <p key={`${detail.key}:${detail.value}`} className="text-[11px] text-slate-400">
                    {detail.key}: {detail.value}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Email Delivery</p>
            <p className="mt-2 text-lg font-bold text-white">
              {latestOwnerEmailInvite ? latestOwnerEmailInvite.status.toUpperCase() : 'NO INVITES'}
            </p>
            <p className="mt-1 text-xs text-slate-300">
              Latest owner invite: {latestOwnerEmailInvite ? new Date(latestOwnerEmailInvite.createdAt).toLocaleString('en-ZA') : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-400">Failures in last 24h: {inviteFailuresLast24Hours}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Owner Acceptance</p>
            <p className="mt-2 text-lg font-bold text-white">
              {ownerAcceptedCount} claimed / {ownerPendingCount} pending
            </p>
            <p className="mt-1 text-xs text-slate-300">
              Tracks ECD owner invite acceptance from the `ecd_admin_invitations` log.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/invites">
            <Button variant="outline" className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800">
              Open invite tracking
            </Button>
          </Link>
          {latestFailedOwnerInvite?.centreId ? (
            <Link href={`/admin/tenants/${latestFailedOwnerInvite.centreId}#invite`}>
              <Button
                variant="outline"
                className="border-rose-700 bg-rose-950/40 text-rose-100 hover:bg-rose-900/60"
              >
                Fix latest failed owner invite
              </Button>
            </Link>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Centre directory</p>
          <h2 className="text-3xl font-black text-white">All Centres</h2>
          <p className="max-w-3xl text-sm text-slate-400">
            Edit centre details, pricing, branding, access, and onboarding settings from one place.
          </p>
        </div>
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">User roles</p>
          <p className="mt-1 text-sm text-cyan-50">
            Upgrade or downgrade users manually from <strong>Tenant Edit {'>'} Access & Team</strong>. Parent downgrade requires re-activation before login.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70">
          <AdminTenantsTable tenants={tenants} />
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Invite Tracking</p>
          <h2 className="text-3xl font-black text-white">Owner & Team Invites</h2>
          <p className="max-w-3xl text-sm text-slate-400">
            Recent notification log records for owner, admin, and welcome-pack channels plus one-click resend for owner
            invites.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70">
          <AdminTenantInviteTracking logs={inviteLogs} />
        </div>
      </section>
    </main>
  )
}
