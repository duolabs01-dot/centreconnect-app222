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
import { deriveAgeRangeFromGroups } from '@/lib/ecd/age-groups'
import { readAftercareConfig, type CentreClassroomDraft } from '@/lib/ecd/centre-public-profile'
import { defaultConfidenceForSource, readCentreLocationMetadata } from '@/lib/geo/centre-location-metadata'
import {
  buildDefaultOperatingSchedule,
  getOperatingScheduleSummary,
  readOperatingHoursSummaryFromSettings,
  readOperatingScheduleFromSettings,
} from '@/lib/time/centre-operating-schedule'

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

type PilotPriorityAction = {
  centreId: string
  centreName: string
  status: AdminTenantTableRow['status']
  isPilotCentre: boolean
  actionLabel: string
  detail: string
  href: string
  hrefLabel: string
  tone: 'rose' | 'amber' | 'cyan' | 'emerald'
  truthNote: string
}

function pilotToneClass(tone: PilotPriorityAction['tone']) {
  if (tone === 'rose') return 'border-rose-500/30 bg-rose-950/30'
  if (tone === 'amber') return 'border-amber-500/30 bg-amber-950/20'
  if (tone === 'emerald') return 'border-emerald-500/30 bg-emerald-950/20'
  return 'border-cyan-500/30 bg-cyan-950/20'
}

function pilotToneBadgeClass(tone: PilotPriorityAction['tone']) {
  if (tone === 'rose') return 'border-rose-500/30 bg-rose-500/10 text-rose-200'
  if (tone === 'amber') return 'border-amber-500/30 bg-amber-500/10 text-amber-200'
  if (tone === 'emerald') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
  return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
}

function buildPilotPriorityAction(
  tenant: AdminTenantTableRow,
  latestOwnerInvite: AdminTenantInviteLog | null
): PilotPriorityAction {
  const isPilotCentre = /bajabulile|sakhisizwe/i.test(tenant.name)
  const latestInviteState = latestOwnerInvite?.status?.toUpperCase() ?? 'NO OWNER INVITE YET'

  if (latestOwnerInvite?.status === 'failed') {
    return {
      centreId: tenant.id,
      centreName: tenant.name,
      status: tenant.status,
      isPilotCentre,
      actionLabel: 'Repair the owner invite before the next onboarding call',
      detail: 'The latest owner invite failed. Fix delivery first so the centre is not asked to repeat a broken step.',
      href: `/admin/tenants/${tenant.id}#invite`,
      hrefLabel: 'Fix invite',
      tone: 'rose',
      truthNote: `Truth source: latest owner invite is ${latestInviteState}.`,
    }
  }

  if (tenant.status === 'Unclaimed') {
    const detail =
      tenant.ownerEmail === '-'
        ? 'Owner contact details still look incomplete. Clean those up before you resend access.'
        : latestOwnerInvite?.status === 'opened'
        ? 'The owner invite was opened but there is no claim yet. Follow up while they are on the same phone so the setup finishes.'
        : latestOwnerInvite?.status === 'sent'
        ? 'The owner invite went out but has not been claimed yet. Follow up before you send another message.'
        : 'No owner claim is recorded yet. Send or resend the owner path before the onboarding session starts.'

    return {
      centreId: tenant.id,
      centreName: tenant.name,
      status: tenant.status,
      isPilotCentre,
      actionLabel: 'Get the owner access path completed',
      detail,
      href: latestOwnerInvite ? '/admin/invites' : `/admin/tenants/${tenant.id}`,
      hrefLabel: latestOwnerInvite ? 'Open invite log' : 'Open centre',
      tone: 'amber',
      truthNote: `Truth source: latest owner invite is ${latestInviteState}.`,
    }
  }

  if (!tenant.logoUrl || !tenant.coverImageUrl) {
    return {
      centreId: tenant.id,
      centreName: tenant.name,
      status: tenant.status,
      isPilotCentre,
      actionLabel: 'Finish the basic centre profile',
      detail: 'Logo or cover image is still missing, so the profile and welcome materials still look unfinished.',
      href: `/admin/tenants/${tenant.id}`,
      hrefLabel: 'Finish profile',
      tone: 'cyan',
      truthNote: 'Truth source: centre branding fields are still incomplete.',
    }
  }

  if (!tenant.isActive) {
    return {
      centreId: tenant.id,
      centreName: tenant.name,
      status: tenant.status,
      isPilotCentre,
      actionLabel: 'Review go-live readiness with the centre',
      detail: 'The centre has owner access, but the workspace is still inactive. Confirm setup basics before you tell them they are live.',
      href: `/admin/tenants/${tenant.id}`,
      hrefLabel: 'Review readiness',
      tone: 'cyan',
      truthNote: 'Truth source: the centre record is still inactive.',
    }
  }

  return {
    centreId: tenant.id,
    centreName: tenant.name,
    status: tenant.status,
    isPilotCentre,
    actionLabel: 'Support first-week usage, not more setup',
    detail: 'The centre is live. If register photos fail, use the new attendance CSV/manual fallback instead of blocking the day.',
    href: `/admin/tenants/${tenant.id}`,
    hrefLabel: 'Open centre',
    tone: 'emerald',
    truthNote: 'Truth source: the centre is live and the attendance fallback is already shipped in the ECD flow.',
  }
}

export default async function AdminTenantsPage() {
  const { admin } = await requirePlatformAdmin()

  const [centresResult, invitationsResult, inviteLogsResult, classesResult] = await Promise.all([
    admin
      .from('ecd_centres')
      .select(
        'id,slug,name,email,phone,contact_phone,contact_whatsapp,primary_contact_name,primary_contact_first_name,primary_contact_surname,address,suburb,city,province,postal_code,latitude,longitude,is_active,is_registered,owner_id,created_at,logo_url,cover_image_url,fees_display_mode,monthly_fee_min,monthly_fee_max,registration_fee,subsidy_accepted,age_groups,age_group_pricing,communication_automation_settings,subscriptions(tier,status,monthly_price)'
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
    admin
      .from('ecd_classes')
      .select('id,ecd_id,name,age_group,practitioner_name')
      .limit(5000),
  ])

  const classRows = (classesResult.data ?? []) as Array<{
    id: string
    ecd_id: string | null
    name: string | null
    age_group: string | null
    practitioner_name: string | null
  }>

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
    latitude: number | string | null
    longitude: number | string | null
    is_active: boolean | null
    is_registered: boolean | null
    owner_id: string | null
    created_at: string
    logo_url: string | null
    cover_image_url: string | null
    fees_display_mode: 'exact' | 'range' | 'contact' | null
    monthly_fee_min: number | null
    monthly_fee_max: number | null
    registration_fee: number | null
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
  const classesByCentre = new Map<string, CentreClassroomDraft[]>()
  classRows.forEach((row: any) => {
    const centreId = row.ecd_id ?? ''
    if (!centreId) return
    const next = classesByCentre.get(centreId) ?? []
    if (row.name?.trim()) {
      next.push({
        id: row.id,
        name: row.name.trim(),
        ageGroup: row.age_group?.trim() ?? '',
        practitionerName: row.practitioner_name?.trim() ?? '',
      })
      classesByCentre.set(centreId, next)
    }
  })

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
    const operatingSchedule = readOperatingScheduleFromSettings(centre.communication_automation_settings) ?? buildDefaultOperatingSchedule()
    const operatingHoursSummary = getOperatingScheduleSummary(
      operatingSchedule,
      readOperatingHoursSummaryFromSettings(centre.communication_automation_settings)
    )
    const aftercare = readAftercareConfig(centre.communication_automation_settings)
    const classrooms = classesByCentre.get(centre.id) ?? []
    const ageRange = deriveAgeRangeFromGroups(centre.age_groups)
    const locationMetadata = readCentreLocationMetadata(centre.communication_automation_settings)
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
      latitude: toRandString(centre.latitude),
      longitude: toRandString(centre.longitude),
      coordinateSource: locationMetadata?.source ?? (centre.latitude != null && centre.longitude != null ? 'exact' : 'missing'),
      coordinateConfidence: locationMetadata?.confidence ?? defaultConfidenceForSource(centre.latitude != null && centre.longitude != null ? 'exact' : 'missing'),
      logoUrl: centre.logo_url?.trim() || '',
      coverImageUrl: centre.cover_image_url?.trim() || '',
      feesDisplayMode: centre.fees_display_mode ?? 'range',
      monthlyFeeMin: toRandString(centre.monthly_fee_min),
      monthlyFeeMax: toRandString(centre.monthly_fee_max),
      registrationFee: toRandString(centre.registration_fee),
      subsidyAccepted: Boolean(centre.subsidy_accepted),
      age0to2: extractAgeFee(centre.age_group_pricing, '0-2'),
      age2to4: extractAgeFee(centre.age_group_pricing, '2-4'),
      age4to6: extractAgeFee(centre.age_group_pricing, '4-6'),
      age6plus: extractAgeFee(centre.age_group_pricing, '6+'),
      ageRangeStart: ageRange.start,
      ageRangeEnd: ageRange.end,
      operatingSchedule,
      operatingHoursSummary,
      aftercareAvailable: aftercare.available,
      aftercareEndTime: aftercare.endTime ?? '',
      classrooms,
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
  const latestOwnerInviteByCentre = new Map<string, AdminTenantInviteLog>()
  inviteLogs.forEach((log) => {
    if (!log.centreId || log.eventType !== 'owner_invite' || latestOwnerInviteByCentre.has(log.centreId)) return
    latestOwnerInviteByCentre.set(log.centreId, log)
  })
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
  const ownerAcceptedCount = invitationRows.filter((row: any) => Boolean(row.accepted_at)).length
  const ownerPendingCount = Math.max(invitationRows.length - ownerAcceptedCount, 0)
  const pendingClaimCount = tenants.filter((tenant) => tenant.status !== 'Claimed').length
  const missingBrandingCount = tenants.filter((tenant) => !tenant.logoUrl || !tenant.coverImageUrl).length
  const failedInviteCount = inviteLogs.filter((log) => log.status === 'failed').length
  const pilotPriorityCentres = tenants
    .filter(
      (tenant) =>
        /bajabulile|sakhisizwe/i.test(tenant.name) ||
        tenant.status !== 'Claimed' ||
        !tenant.logoUrl ||
        !tenant.coverImageUrl ||
        !tenant.isActive
    )
    .map((tenant) => buildPilotPriorityAction(tenant, latestOwnerInviteByCentre.get(tenant.id) ?? null))
    .sort((left, right) => {
      if (left.isPilotCentre !== right.isPilotCentre) return left.isPilotCentre ? -1 : 1
      const toneRank: Record<PilotPriorityAction['tone'], number> = {
        rose: 0,
        amber: 1,
        cyan: 2,
        emerald: 3,
      }
      if (toneRank[left.tone] !== toneRank[right.tone]) {
        return toneRank[left.tone] - toneRank[right.tone]
      }
      return left.centreName.localeCompare(right.centreName)
    })
    .slice(0, 5)

  return (
    <main className="space-y-12 px-4 py-10 lg:px-8">
      <section className="rounded-3xl border border-cyan-500/30 bg-cyan-950/20 p-5 shadow-[0_20px_60px_rgba(6,182,212,0.18)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Pilot readiness</p>
            <h2 className="mt-1 text-2xl font-black text-white">Pilot centre next actions</h2>
            <p className="mt-1 max-w-3xl text-sm text-cyan-50/90">
              The founder actions most likely to unblock real onboarding today. This section stays grounded in live invite and profile truth, not payment guesses.
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">Priority centres</p>
              <p className="mt-1 text-sm text-slate-400">
                Attendance CSV/manual fallback is already live for first-week support if photo register import fails.
              </p>
            </div>
          </div>
          {pilotPriorityCentres.length === 0 ? (
            <p className="mt-2 text-sm text-slate-300">No priority centres pending right now.</p>
          ) : (
            <ul className="mt-4 grid gap-3 xl:grid-cols-2">
              {pilotPriorityCentres.map((centre) => (
                <li key={centre.centreId} className={`rounded-2xl border p-4 ${pilotToneClass(centre.tone)}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-white">{centre.centreName}</span>
                        {centre.isPilotCentre ? (
                          <span className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-200">
                            Pilot centre
                          </span>
                        ) : null}
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${pilotToneBadgeClass(centre.tone)}`}>
                          {centre.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-white">{centre.actionLabel}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">{centre.detail}</p>
                    </div>
                    <Link href={centre.href}>
                      <Button
                        variant="outline"
                        className="border-white/10 bg-black/20 text-slate-100 hover:bg-white/10 hover:text-white"
                      >
                        {centre.hrefLabel}
                      </Button>
                    </Link>
                  </div>
                  <p className="mt-3 text-[11px] text-slate-400">{centre.truthNote}</p>
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
