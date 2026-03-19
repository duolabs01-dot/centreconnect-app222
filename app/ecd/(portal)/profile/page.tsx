import type { Metadata } from 'next'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { getInternalTierLabel, toInternalTier } from '@/lib/billing/plans'
import { updateNotificationPreferencesAction } from '@/lib/actions/settings/update-notification-preferences'
import { requestCancellationAction } from '@/lib/actions/settings/cancel-subscription'
import { readAftercareConfig, sanitizeClassroomDrafts } from '@/lib/ecd/centre-public-profile'
import { readCentreLocationMetadata, writeCentreLocationMetadata, type CentreLocationMetadata } from '@/lib/geo/centre-location-metadata'
import { geocodeAddressWithPelias } from '@/lib/geo/pelias'
import { DangerZoneClient } from './danger-zone-client'
import { InviteStaffForm } from '@/components/ecd/invite-staff-form'

export const metadata: Metadata = {
  title: 'Settings - CentreConnect',
  description: 'Manage crèche, account, and operational settings.',
}

type ProfilePageProps = {
  searchParams?: {
    staffError?: string
  }
}

export default async function EcdProfilePage({ searchParams }: ProfilePageProps) {
  const { supabase, user, ecdId, role } = await requireEcdPortalSession()
  const { data: centre } = await supabase
    .from('ecd_centres')
    .select(
      'id,slug,name,tagline,description,logo_url,cover_image_url,phone,contact_phone,contact_whatsapp,fees_display_mode,email,address,suburb,city,province,postal_code,latitude,longitude,is_active,updated_at,communication_automation_settings'
    )
    .eq('id', ecdId)
    .maybeSingle()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name,phone')
    .eq('id', user.id)
    .maybeSingle()
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select(
      'email_announcements,email_applications,email_job_applications,push_announcements,push_applications,push_pickup,digest_frequency'
    )
    .eq('user_id', user.id)
    .maybeSingle()
  const { data: classes } = await supabase
    .from('ecd_classes')
    .select('id,name,age_group,practitioner_name')
    .eq('ecd_id', ecdId)
    .order('created_at', { ascending: true })

  const { data: staffMembers } = await supabase
    .from('ecd_admins')
    .select('user_id,role,can_approve_applications,can_publish_announcements,user_profiles!ecd_admins_user_id_fkey(full_name)')
    .eq('ecd_id', ecdId)
    .order('invited_at', { ascending: false })
    .limit(20)

  const [{ data: subscription }, { data: paymentMethod }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('tier,status,monthly_price,trial_ends_at,current_period_start,current_period_end')
      .eq('ecd_id', ecdId)
      .order('current_period_start', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('ecd_billing_payment_methods')
      .select('card_type,last4,bank,exp_month,exp_year,updated_at')
      .eq('ecd_id', ecdId)
      .maybeSingle(),
  ])

  const currentTier = toInternalTier(subscription?.tier ?? null, 'basic')
  const tierLabel = getInternalTierLabel(currentTier)

  const aftercare = readAftercareConfig(centre?.communication_automation_settings)
  const locationMetadata = readCentreLocationMetadata(centre?.communication_automation_settings)
  const classRows = (classes ?? []).map((row: any) => ({
    id: row.id as string,
    name: String(row.name ?? ''),
    ageGroup: String(row.age_group ?? ''),
    practitionerName: String(row.practitioner_name ?? ''),
  }))

  const checks = [
    { label: 'Crèche description', done: Boolean(centre?.description) },
    { label: 'Logo', done: Boolean(centre?.logo_url) },
    { label: 'Cover image', done: Boolean(centre?.cover_image_url) },
    { label: 'Contact phone', done: Boolean(centre?.contact_phone || centre?.phone) },
    { label: 'Fee mode configured', done: Boolean(centre?.fees_display_mode) },
    { label: 'Classes listed', done: classRows.length > 0 },
  ]
  const complete = checks.filter((item) => item.done).length
  const score = Math.round((complete / checks.length) * 100)

  async function saveCentreBasics(formData: FormData) {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })
    const patch = {
      name: String(formData.get('name') ?? '').trim() || 'My ECD Crèche',
      tagline: String(formData.get('tagline') ?? '').trim() || null,
      phone: String(formData.get('phone') ?? '').trim() || null,
      contact_phone: String(formData.get('contact_phone') ?? '').trim() || null,
      contact_whatsapp: String(formData.get('contact_whatsapp') ?? '').trim() || null,
      email: String(formData.get('email') ?? '').trim() || null,
      fees_display_mode: ['exact', 'range', 'contact'].includes(String(formData.get('fees_display_mode') ?? 'range'))
        ? String(formData.get('fees_display_mode'))
        : 'range',
    }
    await session.supabase.from('ecd_centres').update(patch).eq('id', session.ecdId)
    revalidatePath('/ecd/profile')
    revalidatePath('/ecd/dashboard')
  }

  async function saveCentreLocation(formData: FormData) {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })
    const address = String(formData.get('address') ?? '').trim() || null
    const suburb = String(formData.get('suburb') ?? '').trim() || null
    const city = String(formData.get('city') ?? '').trim() || null
    const province = String(formData.get('province') ?? '').trim() || null
    const postalCode = String(formData.get('postal_code') ?? '').trim() || null
    const rawLatitude = String(formData.get('latitude') ?? '').trim()
    const rawLongitude = String(formData.get('longitude') ?? '').trim()
    const parsedLatitude = rawLatitude ? Number(rawLatitude) : null
    const parsedLongitude = rawLongitude ? Number(rawLongitude) : null
    const hasManualPin = Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude)

    const { data: existingCentre } = await session.supabase
      .from('ecd_centres')
      .select('communication_automation_settings')
      .eq('id', session.ecdId)
      .maybeSingle()

    let settings =
      existingCentre?.communication_automation_settings &&
      typeof existingCentre.communication_automation_settings === 'object' &&
      !Array.isArray(existingCentre.communication_automation_settings)
        ? (existingCentre.communication_automation_settings as Record<string, unknown>)
        : {}

    let latitude = hasManualPin ? parsedLatitude : null
    let longitude = hasManualPin ? parsedLongitude : null
    let metadata: CentreLocationMetadata | null = hasManualPin
      ? {
          source: 'exact' as const,
          confidence: 'high' as const,
          provider: 'manual',
          label: [address, suburb, city].filter(Boolean).join(', ') || 'Exact pin saved',
          geocodedAt: new Date().toISOString(),
        }
      : null

    if (!hasManualPin && (address || suburb || city)) {
      const geocoded = await geocodeAddressWithPelias({
        address,
        suburb,
        city,
        country: 'South Africa',
      })
      if (geocoded) {
        latitude = geocoded.latitude
        longitude = geocoded.longitude
        metadata = {
          source: 'geocoded' as const,
          confidence: geocoded.confidence,
          provider: 'pelias',
          label: geocoded.label,
          geocodedAt: new Date().toISOString(),
        }
      }
    }

    settings = writeCentreLocationMetadata(
      settings,
      metadata ?? {
        source: 'missing',
        confidence: 'low',
        provider: 'pelias',
        label: null,
        geocodedAt: new Date().toISOString(),
      }
    )

    await session.supabase
      .from('ecd_centres')
      .update({
        address,
        suburb,
        city,
        province,
        postal_code: postalCode,
        latitude,
        longitude,
        communication_automation_settings: settings,
      })
      .eq('id', session.ecdId)
    revalidatePath('/ecd/profile')
  }

  async function saveClassroomsAndCare(formData: FormData) {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })

    const { data: settingsRow } = await session.supabase
      .from('ecd_centres')
      .select('communication_automation_settings,slug')
      .eq('id', session.ecdId)
      .maybeSingle()

    const existingSettings =
      settingsRow?.communication_automation_settings &&
      typeof settingsRow.communication_automation_settings === 'object' &&
      !Array.isArray(settingsRow.communication_automation_settings)
        ? (settingsRow.communication_automation_settings as Record<string, unknown>)
        : {}

    const tenantAdminOverrides =
      existingSettings.tenant_admin_overrides &&
      typeof existingSettings.tenant_admin_overrides === 'object' &&
      !Array.isArray(existingSettings.tenant_admin_overrides)
        ? { ...(existingSettings.tenant_admin_overrides as Record<string, unknown>) }
        : {}

    const aftercareAvailable = String(formData.get('aftercare_available') ?? 'false') === 'true'
    const aftercareEndTime = String(formData.get('aftercare_end_time') ?? '').trim()

    tenantAdminOverrides.aftercare = {
      available: aftercareAvailable,
      end_time: aftercareAvailable && /^\d{2}:\d{2}$/.test(aftercareEndTime) ? aftercareEndTime : null,
    }

    await session.supabase
      .from('ecd_centres')
      .update({
        communication_automation_settings: {
          ...existingSettings,
          tenant_admin_overrides: tenantAdminOverrides,
        },
      })
      .eq('id', session.ecdId)

    const classrooms = sanitizeClassroomDrafts(
      Array.from({ length: 5 }).map((_, index) => ({
        id: String(formData.get(`class_id_${index}`) ?? '').trim() || null,
        name: String(formData.get(`class_name_${index}`) ?? '').trim(),
        ageGroup: String(formData.get(`class_age_${index}`) ?? '').trim(),
        practitionerName: String(formData.get(`class_teacher_${index}`) ?? '').trim(),
      }))
    )

    const { data: existingClasses } = await session.supabase
      .from('ecd_classes')
      .select('id')
      .eq('ecd_id', session.ecdId)

    const existingIds = ((existingClasses ?? []) as Array<{ id: string }>).map((row) => row.id)
    const incomingIds = classrooms.map((room) => room.id).filter((value): value is string => Boolean(value))
    const idsToDelete = existingIds.filter((id) => !incomingIds.includes(id))

    if (idsToDelete.length > 0) {
      await session.supabase.from('ecd_classes').delete().in('id', idsToDelete)
    }

    if (classrooms.length > 0) {
      await session.supabase.from('ecd_classes').upsert(
        classrooms.map((room) => ({
          id: room.id ?? undefined,
          ecd_id: session.ecdId,
          name: room.name,
          age_group: room.ageGroup || null,
          practitioner_name: room.practitionerName || null,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'id' }
      )
    }

    revalidatePath('/ecd/profile')
    revalidatePath('/ecd/dashboard')
    if (settingsRow?.slug) {
      revalidatePath(`/c/${settingsRow.slug}`)
      revalidatePath(`/centre/${settingsRow.slug}`)
    }
  }

  async function saveAccountDetails(formData: FormData) {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })
    await session.supabase
      .from('user_profiles')
      .update({
        full_name: String(formData.get('full_name') ?? '').trim() || 'ECD Admin',
        phone: String(formData.get('profile_phone') ?? '').trim() || null,
      })
      .eq('id', session.user.id)
    revalidatePath('/ecd/profile')
  }

  async function setPublicVisibility(formData: FormData) {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })
    const nextActive = String(formData.get('next_active') ?? '') === 'true'
    await session.supabase.from('ecd_centres').update({ is_active: nextActive }).eq('id', session.ecdId)
    const { data: updatedCentre } = await session.supabase.from('ecd_centres').select('slug').eq('id', session.ecdId).maybeSingle()
    revalidatePath('/ecd/profile')
    if (updatedCentre?.slug) revalidatePath(`/centre/${updatedCentre.slug}`)
  }

  async function saveNotificationPreferences(formData: FormData) {
    'use server'
    await updateNotificationPreferencesAction({
      userId: user.id,
      email_announcements: formData.get('email_announcements') === 'on',
      email_applications: formData.get('email_applications') === 'on',
      email_job_applications: formData.get('email_job_applications') === 'on',
      push_announcements: formData.get('push_announcements') === 'on',
      push_applications: formData.get('push_applications') === 'on',
      push_pickup: formData.get('push_pickup') === 'on',
      digest_frequency: ['realtime', 'daily', 'weekly', 'off'].includes(String(formData.get('digest_frequency') ?? 'realtime'))
        ? String(formData.get('digest_frequency'))
        : 'realtime',
    })
    revalidatePath('/ecd/profile')
  }

  async function updateStaffRole(formData: FormData) {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })
    if (session.role !== 'ecd_admin') {
      redirect('/ecd/profile?staffError=Only%20centre%20admins%20can%20change%20roles.')
    }

    const staffUserId = String(formData.get('staff_user_id') ?? '').trim()
    const nextRole = String(formData.get('new_role') ?? 'ecd_staff').trim()
    if (!staffUserId || !['ecd_admin', 'ecd_supervisor', 'ecd_staff'].includes(nextRole)) {
      redirect('/ecd/profile?staffError=Invalid%20staff%20role%20change%20request.')
    }

    const { data: targetMembership } = await session.supabase
      .from('ecd_admins')
      .select('role')
      .eq('ecd_id', session.ecdId)
      .eq('user_id', staffUserId)
      .maybeSingle()

    if (!targetMembership) {
      redirect('/ecd/profile?staffError=Staff%20member%20not%20found.')
    }

    if (targetMembership.role === 'ecd_admin' && nextRole !== 'ecd_admin') {
      const { count: adminCount } = await session.supabase
        .from('ecd_admins')
        .select('user_id', { count: 'exact', head: true })
        .eq('ecd_id', session.ecdId)
        .eq('role', 'ecd_admin')

      if ((adminCount ?? 0) <= 1) {
        redirect('/ecd/profile?staffError=You%20cannot%20demote%20the%20last%20ECD%20admin.')
      }
    }

    await session.supabase
      .from('ecd_admins')
      .update({ role: nextRole })
      .eq('ecd_id', session.ecdId)
      .eq('user_id', staffUserId)

    await session.supabase.from('user_profiles').update({ role: nextRole }).eq('id', staffUserId)

    revalidatePath('/ecd/profile')
    revalidatePath('/ecd/dashboard')
    revalidatePath('/ecd/applications')
  }

  async function removeStaff(formData: FormData) {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })
    if (session.role !== 'ecd_admin') {
      redirect('/ecd/profile?staffError=Only%20centre%20admins%20can%20remove%20staff.')
    }

    const staffUserId = String(formData.get('staff_user_id') ?? '').trim()
    if (!staffUserId) {
      redirect('/ecd/profile?staffError=Invalid%20staff%20removal%20request.')
    }
    if (staffUserId === session.user.id) {
      redirect('/ecd/profile?staffError=You%20cannot%20remove%20yourself.')
    }

    const { data: targetMembership } = await session.supabase
      .from('ecd_admins')
      .select('role')
      .eq('ecd_id', session.ecdId)
      .eq('user_id', staffUserId)
      .maybeSingle()

    if (!targetMembership) {
      redirect('/ecd/profile?staffError=Staff%20member%20not%20found.')
    }

    if (targetMembership.role === 'ecd_admin') {
      const { count: adminCount } = await session.supabase
        .from('ecd_admins')
        .select('user_id', { count: 'exact', head: true })
        .eq('ecd_id', session.ecdId)
        .eq('role', 'ecd_admin')
      if ((adminCount ?? 0) <= 1) {
        redirect('/ecd/profile?staffError=You%20cannot%20remove%20the%20last%20ECD%20admin.')
      }
    }

    await session.supabase
      .from('ecd_admins')
      .delete()
      .eq('ecd_id', session.ecdId)
      .eq('user_id', staffUserId)

    revalidatePath('/ecd/profile')
    revalidatePath('/ecd/dashboard')
    revalidatePath('/ecd/applications')
  }

  async function updateSupervisorPermissions(formData: FormData) {
    'use server'
    const session = await requireEcdPortalSession({ cached: false })
    if (session.role !== 'ecd_admin') return

    const staffUserId = String(formData.get('staff_user_id') ?? '').trim()
    if (!staffUserId) return

    const canApproveApplications = String(formData.get('can_approve_applications') ?? 'false') === 'true'
    const canPublishAnnouncements = String(formData.get('can_publish_announcements') ?? 'false') === 'true'

    await session.supabase
      .from('ecd_admins')
      .update({
        can_approve_applications: canApproveApplications,
        can_publish_announcements: canPublishAnnouncements,
      })
      .eq('ecd_id', session.ecdId)
      .eq('user_id', staffUserId)
      .eq('role', 'ecd_supervisor')

    revalidatePath('/ecd/profile')
  }

  async function requestCancellation(formData: FormData) {
    'use server'
    await requestCancellationAction({
      ecdId,
      reason: String(formData.get('reason') ?? '').trim(),
      confirmation: String(formData.get('confirmation') ?? ''),
    })
    revalidatePath('/ecd/profile')
    revalidatePath('/ecd/billing')
    revalidatePath('/ecd/support')
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
      <Card className="border-slate-100 bg-white shadow-sm rounded-3xl overflow-hidden xl:col-span-2">
        <CardHeader className="bg-slate-50/50">
          <CardTitle className="text-base font-bold">Account Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Role</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{role === 'ecd_admin' ? 'ECD Admin' : role === 'ecd_supervisor' ? 'ECD Supervisor' : 'ECD Staff'}</p>
              <p className="mt-1 text-xs text-slate-500">Manage settings, billing, and support from one place.</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tier</p>
              <p className="mt-1 text-lg font-bold text-teal-700">{tierLabel}</p>
              <p className="mt-1 text-xs text-slate-500">
                {subscription?.status ? 'Subscription status: ' + subscription.status : 'No active subscription record yet.'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {subscription?.monthly_price != null ? 'R' + subscription.monthly_price + '/month' : 'Open Billing to confirm the active plan.'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment method</p>
              {paymentMethod ? (
                <>
                  <p className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-900">
                    <CreditCard className="h-4 w-4 shrink-0 text-slate-400" />
                    {paymentMethod.card_type ?? 'Card'} •••• {paymentMethod.last4 ?? '----'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {paymentMethod.bank ?? 'Bank'} · Exp {paymentMethod.exp_month ?? '--'}/{paymentMethod.exp_year ?? '--'}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm font-bold text-slate-900">No saved card yet</p>
                  <p className="mt-1 text-xs text-slate-500">Open Billing to add or refresh card details.</p>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 rounded-2xl shadow-sm">
              <Link href="/ecd/billing">Open Billing <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button variant="outline" asChild className="border-slate-200 text-slate-700 font-bold h-11 rounded-2xl">
              <Link href="/ecd/sessions">Device Sessions <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </CardContent>
      </Card>
        <Card className="border-slate-100 bg-white shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-base font-bold">Crèche Readiness</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-4 h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-teal-600 transition-[width] duration-700" style={{ width: `${score}%` }} />
            </div>
            <p className="text-sm font-bold text-slate-900">{score}% complete</p>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Crèche: {centre?.name ?? 'Your crèche'} | Role:{' '}
              {role === 'ecd_admin' ? 'ECD Admin' : role === 'ecd_supervisor' ? 'ECD Supervisor' : 'ECD Staff'}
            </p>
            <div className="mt-6 space-y-3">
              {checks.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-medium">{item.label}</span>
                  <span className={cn("font-bold px-2 py-0.5 rounded-2xl text-[10px] uppercase tracking-wider", item.done ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400')}>
                    {item.done ? 'Done' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-base font-bold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 pt-6">
            <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 rounded-2xl shadow-sm">
              <Link href="/ecd/website">Open Website Builder</Link>
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" asChild className="border-slate-200 text-slate-700 font-bold h-11 rounded-2xl">
                <Link href="/ecd/billing">Open Billing</Link>
              </Button>
              <Button variant="outline" asChild className="border-slate-200 text-slate-700 font-bold h-11 rounded-2xl">
                <Link href="/ecd/team-plans">Weekly Staff Plan</Link>
              </Button>
            </div>
            {centre?.slug ? (
              <Button variant="outline" asChild className="border-slate-200 text-slate-700 font-bold h-11 rounded-2xl">
                <Link href={`/centre/${centre.slug}`}>Invite Parents (Share Profile)</Link>
              </Button>
            ) : (
              <Button variant="outline" disabled className="border-slate-200 text-slate-400 font-bold h-11 rounded-2xl">
                Add a centre slug to invite parents
              </Button>
            )}
            <Button variant="outline" asChild className="border-slate-200 text-slate-700 font-bold h-11 rounded-2xl">
              <Link href="/ecd/dashboard">Back to Today</Link>
            </Button>
            <div className="mt-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs">
              <p className="font-bold text-slate-900 uppercase tracking-widest text-[10px]">Public visibility</p>
              <p className="mt-1.5 text-slate-500 font-medium">{centre?.is_active ? 'Visible on public pages' : 'Hidden from public pages'}</p>
              <form action={setPublicVisibility} className="mt-3">
                <input type="hidden" name="next_active" value={centre?.is_active ? 'false' : 'true'} />
                <Button size="sm" type="submit" variant="outline" className="border-slate-200 text-slate-700 font-bold rounded-2xl w-full">
                  {centre?.is_active ? 'Hide Public Profile' : 'Show Public Profile'}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-base font-bold">Crèche Basics</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form action={saveCentreBasics} className="grid gap-4 md:grid-cols-2">
              <input name="name" className="cc-native-field md:col-span-2 h-12 rounded-2xl" defaultValue={centre?.name ?? ''} placeholder="Crèche name" required />
              <input name="tagline" className="cc-native-field md:col-span-2 h-12 rounded-2xl" defaultValue={centre?.tagline ?? ''} placeholder="Tagline" />
              <input name="email" type="email" className="cc-native-field h-12 rounded-2xl" defaultValue={centre?.email ?? ''} placeholder="Crèche email" />
              <select name="fees_display_mode" className="cc-native-field h-12 rounded-2xl" defaultValue={centre?.fees_display_mode ?? 'range'}>
                <option value="range">Fee display: Range</option>
                <option value="exact">Fee display: Exact</option>
                <option value="contact">Fee display: Contact crèche</option>
              </select>
              <input name="phone" className="cc-native-field h-12 rounded-2xl" defaultValue={centre?.phone ?? ''} placeholder="Main phone" />
              <input name="contact_phone" className="cc-native-field h-12 rounded-2xl" defaultValue={centre?.contact_phone ?? ''} placeholder="Contact phone" />
              <input name="contact_whatsapp" className="cc-native-field md:col-span-2 h-12 rounded-2xl" defaultValue={centre?.contact_whatsapp ?? ''} placeholder="WhatsApp number" />
              <Button type="submit" className="w-fit bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 px-8 rounded-2xl transition-colors shadow-sm">
                Save Basics
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-base font-bold">Location & Address</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form action={saveCentreLocation} className="grid gap-4 md:grid-cols-2">
              <input name="address" className="cc-native-field md:col-span-2 h-12 rounded-2xl" defaultValue={centre?.address ?? ''} placeholder="Street address" />
              <input name="suburb" className="cc-native-field h-12 rounded-2xl" defaultValue={centre?.suburb ?? ''} placeholder="Suburb" />
              <input name="city" className="cc-native-field h-12 rounded-2xl" defaultValue={centre?.city ?? ''} placeholder="City" />
              <input name="province" className="cc-native-field h-12 rounded-2xl" defaultValue={centre?.province ?? ''} placeholder="Province" />
              <input name="postal_code" className="cc-native-field h-12 rounded-2xl" defaultValue={centre?.postal_code ?? ''} placeholder="Postal code" />
              <input name="latitude" className="cc-native-field h-12 rounded-2xl" defaultValue={centre?.latitude ?? ''} placeholder="Exact latitude e.g. -26.1038" />
              <input name="longitude" className="cc-native-field h-12 rounded-2xl" defaultValue={centre?.longitude ?? ''} placeholder="Exact longitude e.g. 28.0916" />
              <div className="md:col-span-2 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
                Distance accuracy: {locationMetadata?.source === 'exact' ? 'Exact location set.' : locationMetadata?.source === 'geocoded' ? 'Geocoded from your address.' : 'Approximate only until you save exact coordinates.'}
              </div>
              <div className="md:col-span-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-xs text-slate-600">
                Save your street address and CentreConnect will geocode it with Pelias. If you already know the exact pin, paste latitude and longitude to get the most accurate distance for parents.
                {centre?.latitude != null && centre?.longitude != null ? (
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${centre.latitude}&mlon=${centre.longitude}#map=18/${centre.latitude}/${centre.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex font-semibold text-teal-700 hover:text-teal-800"
                  >
                    Preview saved pin on OpenStreetMap
                  </a>
                ) : null}
              </div>
              <Button type="submit" className="w-fit bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 px-8 rounded-2xl transition-colors shadow-sm">
                Save Location
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white xl:col-span-2">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-base font-bold">Classes & Aftercare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <form action={saveClassroomsAndCare} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aftercare</label>
                  <select name="aftercare_available" className="cc-native-field h-12 rounded-2xl" defaultValue={aftercare.available ? 'true' : 'false'}>
                    <option value="false">Not offered</option>
                    <option value="true">Offered</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aftercare end time</label>
                  <input name="aftercare_end_time" type="time" className="cc-native-field h-12 rounded-2xl" defaultValue={aftercare.endTime ?? ''} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Public preview</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {aftercare.available ? `Aftercare is offered until ${aftercare.endTime ?? '17:30'}.` : 'Aftercare is not offered.'}
                </p>
              </div>

              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => {
                  const classroom = classRows[index] ?? { id: '', name: '', ageGroup: '', practitionerName: '' }
                  return (
                    <div key={index} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 md:grid-cols-3">
                      <input type="hidden" name={`class_id_${index}`} defaultValue={classroom.id ?? ''} />
                      <input name={`class_name_${index}`} className="cc-native-field h-12 rounded-2xl" defaultValue={classroom.name} placeholder={`Class ${index + 1} name`} />
                      <input name={`class_age_${index}`} className="cc-native-field h-12 rounded-2xl" defaultValue={classroom.ageGroup} placeholder="Age group e.g. 1-2 years" />
                      <input name={`class_teacher_${index}`} className="cc-native-field h-12 rounded-2xl" defaultValue={classroom.practitionerName} placeholder="Practitioner (optional)" />
                    </div>
                  )
                })}
              </div>

              <div className="flex flex-wrap gap-2">
                {classRows.length > 0 ? classRows.map((room) => (
                  <span key={room.id} className="inline-flex items-center rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
                    {room.name} • {room.ageGroup || 'All ages'}
                  </span>
                )) : <span className="text-sm text-slate-500">No classes listed yet.</span>}
              </div>

              <Button type="submit" className="w-fit bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 px-8 rounded-2xl shadow-sm transition-colors">
                Save Classes & Aftercare
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white xl:col-span-2">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-base font-bold">My Account</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form action={saveAccountDetails} className="grid gap-4 md:grid-cols-2">
              <input name="full_name" className="cc-native-field h-12 rounded-2xl" defaultValue={profile?.full_name ?? ''} placeholder="Full name" />
              <input name="profile_phone" className="cc-native-field h-12 rounded-2xl" defaultValue={profile?.phone ?? ''} placeholder="Phone number" />
              <Button type="submit" className="w-fit bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 px-8 rounded-2xl transition-colors shadow-sm">
                Save Account
              </Button>
            </form>
            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Security</p>
              <div className="mt-3 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900">Device sessions</p>
                  <p className="text-xs text-slate-500">Review where this account is signed in.</p>
                </div>
                <Link
                  href="/ecd/sessions"
                  className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-teal-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-teal-700"
                >
                  Open sessions
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            {centre?.updated_at ? (
              <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Last crèche update: {new Date(centre.updated_at).toLocaleString()}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white xl:col-span-2">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-base font-bold">Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form action={saveNotificationPreferences} className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <label className="flex items-center gap-3 text-sm text-slate-700 font-medium cursor-pointer group">
                  <input type="checkbox" name="email_announcements" className="h-5 w-5 rounded-2xl border-slate-300 text-teal-600 focus:ring-teal-500" defaultChecked={prefs?.email_announcements ?? true} />
                  <span className="group-hover:text-slate-900">Email: Announcements</span>
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-700 font-medium cursor-pointer group">
                  <input type="checkbox" name="email_applications" className="h-5 w-5 rounded-2xl border-slate-300 text-teal-600 focus:ring-teal-500" defaultChecked={prefs?.email_applications ?? true} />
                  <span className="group-hover:text-slate-900">Email: Applications</span>
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-700 font-medium cursor-pointer group">
                  <input type="checkbox" name="email_job_applications" className="h-5 w-5 rounded-2xl border-slate-300 text-teal-600 focus:ring-teal-500" defaultChecked={prefs?.email_job_applications ?? true} />
                  <span className="group-hover:text-slate-900">Email: Job applications</span>
                </label>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-3 text-sm text-slate-700 font-medium cursor-pointer group">
                  <input type="checkbox" name="push_announcements" className="h-5 w-5 rounded-2xl border-slate-300 text-teal-600 focus:ring-teal-500" defaultChecked={prefs?.push_announcements ?? true} />
                  <span className="group-hover:text-slate-900">In-app: Announcements</span>
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-700 font-medium cursor-pointer group">
                  <input type="checkbox" name="push_applications" className="h-5 w-5 rounded-2xl border-slate-300 text-teal-600 focus:ring-teal-500" defaultChecked={prefs?.push_applications ?? true} />
                  <span className="group-hover:text-slate-900">In-app: Applications</span>
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-700 font-medium cursor-pointer group">
                  <input type="checkbox" name="push_pickup" className="h-5 w-5 rounded-2xl border-slate-300 text-teal-600 focus:ring-teal-500" defaultChecked={prefs?.push_pickup ?? true} />
                  <span className="group-hover:text-slate-900">In-app: Pickup</span>
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Digest frequency</label>
                <select name="digest_frequency" className="cc-native-field h-12 rounded-2xl" defaultValue={prefs?.digest_frequency ?? 'realtime'}>
                  <option value="realtime">Realtime</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="off">Off</option>
                </select>
              </div>
              <Button type="submit" className="w-fit bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 px-8 rounded-2xl transition-colors shadow-sm">Save Notification Preferences</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white xl:col-span-2">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-base font-bold">Staff Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {searchParams?.staffError ? (
              <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 uppercase tracking-tight">
                {searchParams.staffError}
              </p>
            ) : null}
            <InviteStaffForm ecdId={ecdId} />

            <div className="space-y-3">
              {(staffMembers ?? []).length === 0 ? (
                <p className="text-sm text-slate-500 py-4 italic">No staff members listed yet.</p>
              ) : (
                (staffMembers ?? []).map((member: any) => (
                  <div
                    key={member.user_id}
                    className="tile rounded-2xl border border-slate-100 p-5 shadow-sm transition-colors duration-200 hover:border-teal-100"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {Array.isArray(member.user_profiles) ? member.user_profiles[0]?.full_name ?? member.user_id : member.user_profiles?.full_name ?? member.user_id}
                        </p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Role: {member.role.replace('ecd_', '')}</p>
                      </div>
                      {role === 'ecd_admin' ? (
                        <div className="flex items-center gap-2">
                          <form action={updateStaffRole} className="flex items-center gap-2">
                            <input type="hidden" name="staff_user_id" value={member.user_id} />
                            <select name="new_role" className="cc-native-field h-10 rounded-2xl w-40 text-xs border-slate-300 bg-white text-slate-800 font-semibold">
                              <option value="ecd_staff">Staff member</option>
                              <option value="ecd_supervisor">Supervisor</option>
                              <option value="ecd_admin">ECD admin</option>
                            </select>
                            <Button size="sm" variant="outline" className="h-10 px-4 border-slate-200 text-slate-700 font-bold rounded-2xl shadow-sm hover:bg-slate-50" type="submit">Change Role</Button>
                          </form>
                          <form action={removeStaff}>
                            <input type="hidden" name="staff_user_id" value={member.user_id} />
                            <Button size="sm" variant="outline" className="h-10 px-4 border-rose-100 text-rose-600 font-bold rounded-2xl shadow-sm hover:bg-rose-50" type="submit">Remove</Button>
                          </form>
                        </div>
                      ) : null}
                    </div>
                    {member.role === 'ecd_supervisor' && role === 'ecd_admin' ? (
                      <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-slate-50">
                        <form action={updateSupervisorPermissions}>
                          <input type="hidden" name="staff_user_id" value={member.user_id} />
                          <input
                            type="hidden"
                            name="can_approve_applications"
                            value={member.can_approve_applications ? 'false' : 'true'}
                          />
                          <input
                            type="hidden"
                            name="can_publish_announcements"
                            value={member.can_publish_announcements ? 'true' : 'false'}
                          />
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className={`inline-flex items-center rounded-3xl border px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                              member.can_approve_applications
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-slate-50 text-slate-400'
                            }`}
                          >
                            Approve Applications: {member.can_approve_applications ? 'On' : 'Off'}
                          </Button>
                        </form>
                        <form action={updateSupervisorPermissions}>
                          <input type="hidden" name="staff_user_id" value={member.user_id} />
                          <input
                            type="hidden"
                            name="can_approve_applications"
                            value={member.can_approve_applications ? 'true' : 'false'}
                          />
                          <input
                            type="hidden"
                            name="can_publish_announcements"
                            value={member.can_publish_announcements ? 'false' : 'true'}
                          />
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className={`inline-flex items-center rounded-3xl border px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                              member.can_publish_announcements
                                ? 'border-teal-200 bg-teal-50 text-teal-700'
                                : 'border-slate-200 bg-slate-50 text-slate-400'
                            }`}
                          >
                            Publish Announcements: {member.can_publish_announcements ? 'On' : 'Off'}
                          </Button>
                        </form>
                      </div>
                    ) : member.role === 'ecd_supervisor' ? (
                      <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-slate-50">
                        <span
                          className={`inline-flex items-center rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-widest ${
                            member.can_approve_applications
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-slate-50 text-slate-400'
                          }`}
                        >
                          Approve Applications: {member.can_approve_applications ? 'On' : 'Off'}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-widest ${
                            member.can_publish_announcements
                              ? 'border-teal-200 bg-teal-50 text-teal-700'
                              : 'border-slate-200 bg-slate-50 text-slate-400'
                          }`}
                        >
                          Publish Announcements: {member.can_publish_announcements ? 'On' : 'Off'}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="xl:col-span-2">
          <DangerZoneClient action={requestCancellation} />
        </div>
      </section>
  )
}



