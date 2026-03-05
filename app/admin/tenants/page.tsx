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

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tenants & Onboarding | Platform Admin',
  description: 'Create new centres (single or bulk) and manage the full tenant directory.',
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

export default async function AdminTenantsPage() {
  const { admin } = await requirePlatformAdmin()

  const [centresResult, invitationsResult, inviteLogsResult] = await Promise.all([
    admin
      .from('ecd_centres')
      .eq('is_deleted', false)
      .select(
        'id,slug,name,email,phone,contact_phone,contact_whatsapp,primary_contact_name,address,suburb,city,province,postal_code,is_active,is_registered,owner_id,created_at,logo_url,cover_image_url,fees_display_mode,monthly_fee_min,monthly_fee_max,subsidy_accepted,age_group_pricing,communication_automation_settings,subscriptions(tier,status,monthly_price)'
      )
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

  return (
    <main className="space-y-12 px-4 py-10 lg:px-8">
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Create Tenant</p>
          <h1 className="text-3xl font-black text-white">Single + Bulk Workspace Setup</h1>
          <p className="max-w-3xl text-sm text-slate-400">
            Launch a new centre either as a single owner or with a bulk team list, then let the welcome pack and owner
            invite run automatically.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4 shadow-[0_25px_100px_rgba(2,6,23,0.65)]">
          <AdminTenantsOnboarding existingCentres={existingCentres} />
        </div>
        <div className="flex justify-end">
          <Link href="/admin/tenants/bin">
            <Button className="border-amber-400 text-amber-200 hover:bg-amber-500/10" variant="outline">
              View deleted centres
            </Button>
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Tenant Directory</p>
          <h2 className="text-3xl font-black text-white">All Centres</h2>
          <p className="max-w-3xl text-sm text-slate-400">
            TanStack-powered directory with a fully featured edit modal that touches package, pricing, branding, and the
            marketplace toggles.
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
