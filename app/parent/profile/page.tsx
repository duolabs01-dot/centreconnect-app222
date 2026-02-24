import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { ParentProfileHub } from '@/components/parent/ParentProfileEditor'
import { createClient } from '@/lib/supabase/server'
import { startRoutePerf, logRoutePerf } from '@/lib/perf/server-timing'

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
      .select('emergency_contact_name,emergency_contact_phone')
      .eq('id', user.id)
      .maybeSingle()

    const parentProfile = (parentProfileResult.error ? null : parentProfileResult.data) as
      | { emergency_contact_name: string | null; emergency_contact_phone: string | null }
      | null

    async function handleSignOut() {
      'use server'
      const serverClient = await createClient()
      await serverClient.auth.signOut()
      redirect('/')
    }

    return (
      <div className="cc-page space-y-4">
        <ParentProfileHub
          initial={{
            full_name: parentName,
            phone: userProfile?.phone?.trim() ?? '',
            email: userEmail,
            avatar_url: avatarUrl,
            emergency_contact_name: parentProfile?.emergency_contact_name?.trim() ?? '',
            emergency_contact_phone: parentProfile?.emergency_contact_phone?.trim() ?? '',
          }}
        />

        <form action={handleSignOut}>
          <button
            type="submit"
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 p-4 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </form>
      </div>
    )
  } finally {
    logRoutePerf(perf)
  }
}


