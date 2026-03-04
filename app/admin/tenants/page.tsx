import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AdminTenantsOnboarding } from '@/components/admin/admin-tenants-onboarding'
import { AdminTenantsTable, type AdminTenantTableRow } from '@/components/admin/admin-tenants-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tenant Onboarding | CC Admin',
  description: 'Hybrid onboarding and tenant operations console.',
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

  return { user, admin }
}

type PageSearchParams = Record<string, string | string[] | undefined>

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function noticeText(value: string | undefined) {
  return null
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

export default async function AdminTenantsPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>
}) {
  const { admin } = await requirePlatformAdmin()
  const resolved = (await searchParams) ?? {}
  const audience = one(resolved.audience) === 'parent' ? 'parent' : 'ecd'
  const notice = noticeText(one(resolved.notice))

  const [centresResult, invitationsResult] = await Promise.all([
    admin
      .from('ecd_centres')
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

  return (
    <div className="space-y-8 pb-16">
      <Card className="border-cyan-500/20 bg-gradient-to-br from-[#040913] via-[#061021] to-[#03111f]">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="border-cyan-500/30 bg-cyan-500/15 text-cyan-200">CC Admin</Badge>
            <Badge className="border-slate-700 bg-slate-900 text-slate-300">Hybrid Onboarding</Badge>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-black tracking-tight text-white">Tenants</CardTitle>
            <CardDescription className="text-slate-300">
              Single centre onboarding, bulk team invites, and full tenant operations in one place.
            </CardDescription>
          </div>
          <div className="inline-flex rounded-2xl border border-cyan-500/20 bg-slate-900/70 p-1">
            <Button
              asChild
              size="sm"
              className={audience === 'parent' ? 'bg-transparent text-slate-300 hover:bg-slate-800' : 'bg-cyan-500 text-black hover:bg-cyan-400'}
            >
              <Link href="/admin/tenants?audience=ecd">ECD</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className={audience === 'parent' ? 'bg-cyan-500 text-black hover:bg-cyan-400' : 'bg-transparent text-slate-300 hover:bg-slate-800'}
            >
              <Link href="/admin/tenants?audience=parent">Parent</Link>
            </Button>
          </div>
          {notice ? (
            <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100">{notice}</div>
          ) : null}
          {audience === 'parent' ? (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
              Parent mode selected. Tenant onboarding below remains ECD-focused.
            </div>
          ) : null}
        </CardHeader>
      </Card>

      <AdminTenantsOnboarding existingCentres={existingCentres} />

      <AdminTenantsTable tenants={tenants} />
    </div>
  )
}
