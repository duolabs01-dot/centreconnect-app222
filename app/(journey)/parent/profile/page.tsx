import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ParentProfileHub } from '@/components/parent/ParentProfileEditor'
import { createClient } from '@/lib/supabase/server'
import { startRoutePerf, logRoutePerf } from '@/lib/perf/server-timing'
import { getParentProgress } from '@/lib/parent/progress'

export const metadata: Metadata = {
  title: 'Parent Profile Hub | CentreConnect',
  description: 'Review your profile, update essentials inline, and access account sections.',
}

export default async function ParentProfilePage() {
  const perf = startRoutePerf('/parent/profile')
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

    const parentName =
      userProfile?.full_name?.trim() ||
      (typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : '') ||
      'Parent'
    const userEmail = user.email ?? 'No email'
    const avatarUrl = userProfile?.avatar_url?.trim() ?? ''

    const parentProfileResult = await supabase
      .from('parents')
      .select(
        'guardian_relationship,emergency_contact_name,emergency_contact_phone,notifications_application_updates,notifications_reminders'
      )
      .eq('id', user.id)
      .maybeSingle()

    const parentProfile = (parentProfileResult.error ? null : parentProfileResult.data) as
      | {
          guardian_relationship: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          notifications_application_updates: boolean | null
          notifications_reminders: boolean | null
        }
      | null

    // Use unified progress function
    const progress = await getParentProgress(user.id)

    return (
      <div className="bg-surface-secondary px-4 pt-4 min-h-screen">
        <ParentProfileHub
          initial={{
            full_name: parentName,
            phone: userProfile?.phone?.trim() ?? '',
            email: userEmail,
            avatar_url: avatarUrl,
            guardian_relationship: parentProfile?.guardian_relationship?.trim() ?? '',
            emergency_contact_name: parentProfile?.emergency_contact_name?.trim() ?? '',
            emergency_contact_phone: parentProfile?.emergency_contact_phone?.trim() ?? '',
            notifications_application_updates: parentProfile?.notifications_application_updates ?? true,
            notifications_reminders: parentProfile?.notifications_reminders ?? true,
            child_count: progress.childrenCount,
            enrolled_child_count: progress.enrolledCount,
            // New unified fields
            profile_completeness: progress.profileCompleteness,
            next_action: progress.nextAction,
          }}
        />
      </div>
    )
  } finally {
    logRoutePerf(perf)
  }
}
