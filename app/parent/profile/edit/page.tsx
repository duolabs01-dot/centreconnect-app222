import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
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
    )
  } finally {
    logRoutePerf(perf)
  }
}
