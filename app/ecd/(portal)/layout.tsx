// ⚠️ ECD ADMIN ONLY
// Allowed imports: components/ecd/* + components/ui/*
// NEVER import from components/cc-admin/*

import { redirect } from 'next/navigation'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { EcdPortalSidebar } from '@/components/layout/ecd-portal-sidebar'
import { createAdminClient } from '@/lib/supabase/admin'
import { BrowserNotificationBridge } from '@/components/notifications/browser-notification-bridge'
import '../ecd-theme.css'

type EcdLayoutProps = {
  children: React.ReactNode
}

export default async function EcdLayout({ children }: EcdLayoutProps) {
  const { user, role, ecdId } = await requireEcdPortalSession()
  const admin = createAdminClient()

  const { data: centreWithOnboarding, error: centreWithOnboardingError } = await admin
    .from('ecd_centres')
    .select('id, onboarding_complete')
    .eq('id', ecdId)
    .maybeSingle()

  let centre = centreWithOnboarding as { id: string; onboarding_complete?: boolean | null } | null
  if (!centre && centreWithOnboardingError) {
    // Backward compatible fallback if onboarding_complete is not yet migrated in the target DB.
    const { data: centreFallback } = await admin.from('ecd_centres').select('id').eq('id', ecdId).maybeSingle()
    centre = centreFallback as { id: string; onboarding_complete?: boolean | null } | null
  }

  if (!centre?.id) {
    redirect('/ecd/login?error=centre-link')
  }

  const onboardingComplete =
    typeof centre.onboarding_complete === 'boolean' ? centre.onboarding_complete : true

  if (!onboardingComplete) {
    redirect('/ecd/onboarding')
  }

  return (
    <div className="ecd-premium-shell h-screen overflow-hidden flex">
      <EcdPortalSidebar userEmail={user.email ?? null} userRole={role} />
      <main className="flex-1 overflow-y-auto [scrollbar-width:none] hover:[scrollbar-width:thin] [&::-webkit-scrollbar]:w-0 hover:[&::-webkit-scrollbar]:w-2 hover:[&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300/80">
        <div className="mx-auto max-w-[1600px] px-6 pb-6 pt-20 lg:p-10">
          <BrowserNotificationBridge mode="ecd" ecdId={ecdId} />
          {children}
        </div>
      </main>
    </div>
  )
}
