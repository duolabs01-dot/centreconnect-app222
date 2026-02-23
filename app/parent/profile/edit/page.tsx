import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ParentProfileEditor } from '@/components/parent/ParentProfileEditor'
import { startRoutePerf, logRoutePerf } from '@/lib/perf/server-timing'

export const metadata: Metadata = {
  title: 'Profile Studio | Parent Portal | CentreConnect',
  description: 'Update parent details, communication preferences, and family information.',
}

export default async function ParentProfileEditPage() {
  const perf = startRoutePerf('/parent/profile/edit')
  const supabase = await createClient()
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    const userProfileResult = await supabase
      .from('user_profiles')
      .select('full_name,phone,avatar_url')
      .eq('id', user.id)
      .maybeSingle()

    const userProfileFallback =
      userProfileResult.error &&
      typeof userProfileResult.error.message === 'string' &&
      userProfileResult.error.message.includes("'avatar_url' column")
        ? await supabase.from('user_profiles').select('full_name,phone').eq('id', user.id).maybeSingle()
        : null

    const userProfile = (userProfileFallback?.data ?? userProfileResult.data) as
      | { full_name: string | null; phone: string | null; avatar_url?: string | null }
      | null

    const parentProfileResult = await supabase
      .from('parents')
      .select(
        'alt_phone,address,suburb,city,province,emergency_contact_name,emergency_contact_phone,preferred_contact_method,preferred_contact_times,home_language,guardian_relationship,preferred_start_month,max_monthly_budget,transport_needed,preferred_radius_km,preferred_suburbs,id_verification_status,medical_aid_name,medical_aid_number,consent_data_sharing,consent_notifications,notifications_application_updates,notifications_reminders,notifications_marketing,quiet_hours_start,quiet_hours_end,billing_email,auto_pay_enabled'
      )
      .eq('id', user.id)
      .maybeSingle()

    const parentProfileFallback =
      parentProfileResult.error &&
      typeof parentProfileResult.error.message === 'string' &&
      (parentProfileResult.error.message.includes('schema cache') ||
        parentProfileResult.error.message.includes('Could not find the'))
        ? await supabase
            .from('parents')
            .select('alt_phone,address,suburb,city,province,emergency_contact_name,emergency_contact_phone')
            .eq('id', user.id)
            .maybeSingle()
        : null

    const parentProfile = (parentProfileFallback?.data ?? parentProfileResult.data) as
      | {
          alt_phone?: string | null
          address?: string | null
          suburb?: string | null
          city?: string | null
          province?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          preferred_contact_method?: string | null
          preferred_contact_times?: string | null
          home_language?: string | null
          guardian_relationship?: string | null
          preferred_start_month?: string | null
          max_monthly_budget?: number | null
          transport_needed?: boolean | null
          preferred_radius_km?: number | null
          preferred_suburbs?: string[] | null
          id_verification_status?: string | null
          medical_aid_name?: string | null
          medical_aid_number?: string | null
          consent_data_sharing?: boolean | null
          consent_notifications?: boolean | null
          notifications_application_updates?: boolean | null
          notifications_reminders?: boolean | null
          notifications_marketing?: boolean | null
          quiet_hours_start?: string | null
          quiet_hours_end?: string | null
          billing_email?: string | null
          auto_pay_enabled?: boolean | null
        }
      | null

    return (
      <div className="cc-page">
        <div className="space-y-4">
          <div className="mb-6 flex items-center gap-3">
            <Link
              href="/parent/profile"
              className="rounded-xl p-2 transition-colors hover:bg-slate-100"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                Edit Profile
              </h1>
              <p className="text-xs text-slate-400">
                Your details are private and secure
              </p>
            </div>
          </div>

          <div
            className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 p-4 shadow-[var(--shadow-elevation-1)] sm:p-6
                       [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-slate-200 [&_input]:bg-white [&_input]:px-4 [&_input]:py-3 [&_input]:text-sm [&_input]:text-slate-900 [&_input]:transition-colors [&_input]:focus:border-cyan-400 [&_input]:focus:outline-none [&_input]:focus:ring-2 [&_input]:focus:ring-cyan-500/30
                       [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-slate-200 [&_textarea]:bg-white [&_textarea]:px-4 [&_textarea]:py-3 [&_textarea]:text-sm [&_textarea]:text-slate-900 [&_textarea]:transition-colors [&_textarea]:focus:border-cyan-400 [&_textarea]:focus:outline-none [&_textarea]:focus:ring-2 [&_textarea]:focus:ring-cyan-500/30
                       [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-slate-200 [&_select]:bg-white [&_select]:px-4 [&_select]:py-3 [&_select]:text-sm [&_select]:text-slate-900 [&_select]:transition-colors [&_select]:focus:border-cyan-400 [&_select]:focus:outline-none [&_select]:focus:ring-2 [&_select]:focus:ring-cyan-500/30
                       [&_button[type=submit]]:w-full [&_button[type=submit]]:rounded-2xl [&_button[type=submit]]:bg-cyan-600 [&_button[type=submit]]:py-4 [&_button[type=submit]]:font-semibold [&_button[type=submit]]:text-white [&_button[type=submit]]:transition-colors [&_button[type=submit]]:shadow-[var(--shadow-elevation-3)] [&_button[type=submit]]:shadow-cyan-200/50 [&_button[type=submit]]:hover:bg-cyan-700"
          >
            <ParentProfileEditor
              initial={{
                full_name: userProfile?.full_name ?? '',
                phone: userProfile?.phone ?? '',
                avatar_url: userProfile?.avatar_url ?? '',
                alt_phone: parentProfile?.alt_phone ?? '',
                address: parentProfile?.address ?? '',
                suburb: parentProfile?.suburb ?? '',
                city: parentProfile?.city ?? '',
                province: parentProfile?.province ?? '',
                emergency_contact_name: parentProfile?.emergency_contact_name ?? '',
                emergency_contact_phone: parentProfile?.emergency_contact_phone ?? '',
                preferred_contact_method: parentProfile?.preferred_contact_method ?? '',
                preferred_contact_times: parentProfile?.preferred_contact_times ?? '',
                home_language: parentProfile?.home_language ?? '',
                guardian_relationship: parentProfile?.guardian_relationship ?? '',
                preferred_start_month: parentProfile?.preferred_start_month ?? '',
                max_monthly_budget: parentProfile?.max_monthly_budget?.toString() ?? '',
                transport_needed: parentProfile?.transport_needed ?? false,
                preferred_radius_km: parentProfile?.preferred_radius_km?.toString() ?? '',
                preferred_suburbs: (parentProfile?.preferred_suburbs ?? []).join(', '),
                id_verification_status: parentProfile?.id_verification_status ?? '',
                medical_aid_name: parentProfile?.medical_aid_name ?? '',
                medical_aid_number: parentProfile?.medical_aid_number ?? '',
                consent_data_sharing: parentProfile?.consent_data_sharing ?? false,
                consent_notifications: parentProfile?.consent_notifications ?? true,
                notifications_application_updates: parentProfile?.notifications_application_updates ?? true,
                notifications_reminders: parentProfile?.notifications_reminders ?? true,
                notifications_marketing: parentProfile?.notifications_marketing ?? false,
                quiet_hours_start: parentProfile?.quiet_hours_start ?? '',
                quiet_hours_end: parentProfile?.quiet_hours_end ?? '',
                billing_email: parentProfile?.billing_email ?? '',
                auto_pay_enabled: parentProfile?.auto_pay_enabled ?? false,
              }}
            />
          </div>
        </div>
      </div>
    )
  } finally {
    logRoutePerf(perf)
  }
}


