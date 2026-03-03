import type { Metadata } from 'next'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { updateNotificationPreferencesAction } from '@/lib/actions/settings/update-notification-preferences'
import { inviteStaffAction } from '@/lib/actions/settings/staff-management'
import { requestCancellationAction } from '@/lib/actions/settings/cancel-subscription'
import { DangerZoneClient } from './danger-zone-client'

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
      'id,slug,name,tagline,description,logo_url,cover_image_url,phone,contact_phone,contact_whatsapp,fees_display_mode,email,address,suburb,city,province,postal_code,is_active,updated_at'
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
  const { data: staffMembers } = await supabase
    .from('ecd_admins')
    .select('user_id,role,can_approve_applications,can_publish_announcements,user_profiles(full_name)')
    .eq('ecd_id', ecdId)
    .order('invited_at', { ascending: false })
    .limit(20)

  const checks = [
    { label: 'Crèche description', done: Boolean(centre?.description) },
    { label: 'Logo', done: Boolean(centre?.logo_url) },
    { label: 'Cover image', done: Boolean(centre?.cover_image_url) },
    { label: 'Contact phone', done: Boolean(centre?.contact_phone || centre?.phone) },
    { label: 'Fee mode configured', done: Boolean(centre?.fees_display_mode) },
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
    await session.supabase
      .from('ecd_centres')
      .update({
        address: String(formData.get('address') ?? '').trim() || null,
        suburb: String(formData.get('suburb') ?? '').trim() || null,
        city: String(formData.get('city') ?? '').trim() || null,
        province: String(formData.get('province') ?? '').trim() || null,
        postal_code: String(formData.get('postal_code') ?? '').trim() || null,
      })
      .eq('id', session.ecdId)
    revalidatePath('/ecd/profile')
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

  async function inviteStaff(formData: FormData) {
    'use server'
    await inviteStaffAction({
      ecdId,
      name: String(formData.get('name') ?? '').trim(),
      email: String(formData.get('email') ?? '').trim(),
      role: String(formData.get('role') ?? 'ecd_staff'),
    })
    revalidatePath('/ecd/profile')
    revalidatePath('/ecd/support')
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
    <EcdOsShell
      title="Settings"
      description="Update crèche, account, and operational settings from one place."
      roleLabel={role === 'ecd_admin' ? 'Crèche Admin' : role === 'ecd_supervisor' ? 'Supervisor' : 'Staff Member'}
      userEmail={user.email ?? 'Unknown email'}
      userRole={role}
    >
      <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card className="border-slate-100 bg-white shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-base font-bold">Crèche Readiness</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-4 h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-teal-600 transition-all duration-700" style={{ width: `${score}%` }} />
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
                <Link href="/ecd/support">Open Support</Link>
              </Button>
            </div>
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
              <Button type="submit" className="w-fit bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 px-8 rounded-2xl transition-all active:scale-95 shadow-sm">
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
              <Button type="submit" className="w-fit bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 px-8 rounded-2xl transition-all active:scale-95 shadow-sm">
                Save Location
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
              <Button type="submit" className="w-fit bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 px-8 rounded-2xl transition-all active:scale-95 shadow-sm">
                Save Account
              </Button>
            </form>
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
              <Button type="submit" className="w-fit bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 px-8 rounded-2xl transition-all active:scale-95 shadow-sm">Save Notification Preferences</Button>
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
            <form action={inviteStaff} className="grid gap-4 md:grid-cols-3">
              <input name="name" className="cc-native-field h-12 rounded-2xl" placeholder="Staff full name" required />
              <input name="email" type="email" className="cc-native-field h-12 rounded-2xl" placeholder="Staff email" required />
              <select name="role" className="cc-native-field h-12 rounded-2xl">
                <option value="ecd_staff">ECD Staff</option>
                <option value="ecd_supervisor">ECD Supervisor</option>
                <option value="ecd_admin">ECD Admin</option>
              </select>
              <Button type="submit" className="w-fit md:col-span-3 bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 px-8 rounded-2xl shadow-sm transition-all active:scale-95">Invite Staff (Support-assisted)</Button>
            </form>

            <div className="space-y-3">
              {(staffMembers ?? []).length === 0 ? (
                <p className="text-sm text-slate-500 py-4 italic">No staff members listed yet.</p>
              ) : (
                (staffMembers ?? []).map((member: any) => (
                  <div
                    key={member.user_id}
                    className="tile transform-gpu [will-change:transform] rounded-2xl border border-slate-100 p-5 shadow-sm transition-transform duration-200 hover:border-teal-100"
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
                            <select name="new_role" className="cc-native-field h-10 rounded-2xl w-32 text-xs">
                              <option value="ecd_staff">Set staff</option>
                              <option value="ecd_supervisor">Set supervisor</option>
                              <option value="ecd_admin">Set admin</option>
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
                            className={`inline-flex items-center rounded-3xl border px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
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
                            className={`inline-flex items-center rounded-3xl border px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
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
    </EcdOsShell>
  )
}



