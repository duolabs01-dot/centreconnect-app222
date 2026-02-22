import type { Metadata } from 'next'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { EcdOsShell } from '@/components/layout/ecd-os-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ecd/Card'
import { Button } from '@/components/ecd/Button'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { updateNotificationPreferencesAction } from '@/lib/actions/settings/update-notification-preferences'
import {
  inviteStaffAction,
  removeStaffAction,
  changeStaffRoleAction,
} from '@/lib/actions/settings/staff-management'
import { requestCancellationAction } from '@/lib/actions/settings/cancel-subscription'

export const metadata: Metadata = {
  title: 'Settings - CentreConnect',
  description: 'Manage centre, account, and operational settings.',
}

export default async function EcdProfilePage() {
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
    .select('user_id,role,user_profiles(full_name)')
    .eq('ecd_id', ecdId)
    .order('invited_at', { ascending: false })
    .limit(20)

  const checks = [
    { label: 'Centre description', done: Boolean(centre?.description) },
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
      name: String(formData.get('name') ?? '').trim() || 'My ECD Centre',
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

  async function requestRoleChange(formData: FormData) {
    'use server'
    await changeStaffRoleAction({
      ecdId,
      staffUserId: String(formData.get('staff_user_id') ?? ''),
      role: String(formData.get('new_role') ?? 'ecd_staff'),
    })
    revalidatePath('/ecd/profile')
    revalidatePath('/ecd/support')
  }

  async function requestStaffRemoval(formData: FormData) {
    'use server'
    await removeStaffAction({
      ecdId,
      staffUserId: String(formData.get('staff_user_id') ?? ''),
    })
    revalidatePath('/ecd/profile')
    revalidatePath('/ecd/support')
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
      description="Update centre, account, and operational settings from one place."
      roleLabel="ECD Portal"
      userEmail={user.email ?? 'Unknown email'}
    >
      <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card className="border-border bg-gradient-to-br from-blue-50/80 via-white/80 to-emerald-50/80">
          <CardHeader>
            <CardTitle>Centre Readiness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 h-3 w-full overflow-hidden rounded-full bg-card/80">
              <div className="h-full bg-blue-600" style={{ width: `${score}%` }} />
            </div>
            <p className="text-sm font-semibold text-foreground">{score}% complete</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Centre: {centre?.name ?? 'Your centre'} | Role: {role === 'ecd_admin' ? 'ECD Admin' : 'ECD Staff'}
            </p>
            <div className="mt-3 space-y-2">
              {checks.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{item.label}</span>
                  <span className={item.done ? 'text-emerald-700' : 'text-slate-400'}>
                    {item.done ? 'Done' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button asChild>
              <Link href="/ecd/website">Open Website Builder</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/ecd/billing">Open Billing</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/ecd/support">Open Support</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/ecd/dashboard">Back to Today</Link>
            </Button>
            <div className="rounded-md border border-border bg-card/80 p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Public visibility</p>
              <p className="mt-1">{centre?.is_active ? 'Visible on public pages' : 'Hidden from public pages'}</p>
              <form action={setPublicVisibility} className="mt-2">
                <input type="hidden" name="next_active" value={centre?.is_active ? 'false' : 'true'} />
                <Button size="sm" type="submit" variant="outline">
                  {centre?.is_active ? 'Hide Public Profile' : 'Show Public Profile'}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Centre Basics</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveCentreBasics} className="grid gap-3 md:grid-cols-2">
              <input name="name" className="cc-native-field md:col-span-2" defaultValue={centre?.name ?? ''} placeholder="Centre name" required />
              <input name="tagline" className="cc-native-field md:col-span-2" defaultValue={centre?.tagline ?? ''} placeholder="Tagline" />
              <input name="email" type="email" className="cc-native-field" defaultValue={centre?.email ?? ''} placeholder="Centre email" />
              <select name="fees_display_mode" className="cc-native-field" defaultValue={centre?.fees_display_mode ?? 'range'}>
                <option value="range">Fee display: Range</option>
                <option value="exact">Fee display: Exact</option>
                <option value="contact">Fee display: Contact centre</option>
              </select>
              <input name="phone" className="cc-native-field" defaultValue={centre?.phone ?? ''} placeholder="Main phone" />
              <input name="contact_phone" className="cc-native-field" defaultValue={centre?.contact_phone ?? ''} placeholder="Contact phone" />
              <input name="contact_whatsapp" className="cc-native-field md:col-span-2" defaultValue={centre?.contact_whatsapp ?? ''} placeholder="WhatsApp number" />
              <Button type="submit" className="w-fit">
                Save Basics
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Location & Address</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveCentreLocation} className="grid gap-3 md:grid-cols-2">
              <input name="address" className="cc-native-field md:col-span-2" defaultValue={centre?.address ?? ''} placeholder="Street address" />
              <input name="suburb" className="cc-native-field" defaultValue={centre?.suburb ?? ''} placeholder="Suburb" />
              <input name="city" className="cc-native-field" defaultValue={centre?.city ?? ''} placeholder="City" />
              <input name="province" className="cc-native-field" defaultValue={centre?.province ?? ''} placeholder="Province" />
              <input name="postal_code" className="cc-native-field" defaultValue={centre?.postal_code ?? ''} placeholder="Postal code" />
              <Button type="submit" className="w-fit">
                Save Location
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-slate-200 xl:col-span-2">
          <CardHeader>
            <CardTitle>My Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveAccountDetails} className="grid gap-3 md:grid-cols-2">
              <input name="full_name" className="cc-native-field" defaultValue={profile?.full_name ?? ''} placeholder="Full name" />
              <input name="profile_phone" className="cc-native-field" defaultValue={profile?.phone ?? ''} placeholder="Phone number" />
              <Button type="submit" className="w-fit">
                Save Account
              </Button>
            </form>
            {centre?.updated_at ? (
              <p className="mt-3 text-xs text-slate-500">
                Last centre update: {new Date(centre.updated_at).toLocaleString()}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-slate-200 xl:col-span-2">
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveNotificationPreferences} className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="email_announcements" defaultChecked={prefs?.email_announcements ?? true} />
                Email: Announcements
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="email_applications" defaultChecked={prefs?.email_applications ?? true} />
                Email: Applications
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="email_job_applications" defaultChecked={prefs?.email_job_applications ?? true} />
                Email: Job applications
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="push_announcements" defaultChecked={prefs?.push_announcements ?? true} />
                In-app: Announcements
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="push_applications" defaultChecked={prefs?.push_applications ?? true} />
                In-app: Applications
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="push_pickup" defaultChecked={prefs?.push_pickup ?? true} />
                In-app: Pickup
              </label>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Digest frequency</label>
                <select name="digest_frequency" className="cc-native-field" defaultValue={prefs?.digest_frequency ?? 'realtime'}>
                  <option value="realtime">Realtime</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="off">Off</option>
                </select>
              </div>
              <Button type="submit" className="w-fit">Save Notification Preferences</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-slate-200 xl:col-span-2">
          <CardHeader>
            <CardTitle>Staff Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={inviteStaff} className="grid gap-3 md:grid-cols-3">
              <input name="name" className="cc-native-field" placeholder="Staff full name" required />
              <input name="email" type="email" className="cc-native-field" placeholder="Staff email" required />
              <select name="role" className="cc-native-field">
                <option value="ecd_staff">ECD Staff</option>
                <option value="ecd_admin">ECD Admin</option>
              </select>
              <Button type="submit" className="w-fit md:col-span-3">Invite Staff (Support-assisted)</Button>
            </form>

            <div className="space-y-2">
              {(staffMembers ?? []).length === 0 ? (
                <p className="text-sm text-slate-600">No staff members listed yet.</p>
              ) : (
                (staffMembers ?? []).map((member: any) => (
                  <div key={member.user_id} className="rounded-md border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {Array.isArray(member.user_profiles) ? member.user_profiles[0]?.full_name ?? member.user_id : member.user_profiles?.full_name ?? member.user_id}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">Role: {member.role}</p>
                    {role === 'ecd_admin' ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <form action={requestRoleChange} className="flex items-center gap-2">
                          <input type="hidden" name="staff_user_id" value={member.user_id} />
                          <select name="new_role" className="cc-native-field h-9">
                            <option value="ecd_staff">Set staff</option>
                            <option value="ecd_admin">Set admin</option>
                          </select>
                          <Button size="sm" variant="outline" type="submit">Request Role Change</Button>
                        </form>
                        <form action={requestStaffRemoval}>
                          <input type="hidden" name="staff_user_id" value={member.user_id} />
                          <Button size="sm" variant="outline" type="submit">Request Removal</Button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-200 bg-rose-50/50 xl:col-span-2">
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={requestCancellation} className="grid gap-3 md:grid-cols-2">
              <textarea
                name="reason"
                className="cc-native-field md:col-span-2 h-auto min-h-24 py-2"
                placeholder="Reason for cancellation"
                required
              />
              <input
                name="confirmation"
                className="cc-native-field"
                placeholder='Type "CANCEL" to confirm'
                required
              />
              <Button type="submit" variant="outline" className="w-fit border-rose-300 text-rose-800">
                Request Subscription Cancellation
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </EcdOsShell>
  )
}
