// ECD portal shell
// Allowed imports: components/ecd/* + components/ui/*
// Never import from components/cc-admin/*

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

  const [
    pendingApplicationsCount,
    unreadEcdNotificationsCount,
    pendingTransportCount,
    complianceOutstandingCount,
  ] = await Promise.all([
    admin
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('ecd_id', ecdId)
      .in('status', ['submitted', 'in_review', 'partial', 'draft'])
      .then(({ count, error }) => (error ? 0 : count ?? 0)),
    admin
      .from('ecd_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('ecd_id', ecdId)
      .eq('is_read', false)
      .then(({ count, error }) => (error ? 0 : count ?? 0)),
    admin
      .from('transport_enquiries')
      .select('id', { count: 'exact', head: true })
      .eq('ecd_id', ecdId)
      .eq('status', 'pending')
      .then(({ count, error }) => (error ? 0 : count ?? 0)),
    admin
      .from('compliance_documents')
      .select('id', { count: 'exact', head: true })
      .eq('ecd_id', ecdId)
      .in('status', ['missing', 'expired'])
      .then(({ count, error }) => (error ? 0 : count ?? 0)),
  ])

  const attentionBadges: Partial<Record<string, number>> = {
    '/ecd/applications': pendingApplicationsCount,
    '/ecd/communications': unreadEcdNotificationsCount,
    '/ecd/transport': pendingTransportCount,
    '/ecd/compliance': complianceOutstandingCount,
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">
      <EcdPortalSidebar
        userEmail={user.email ?? null}
        userRole={role}
        attentionBadges={attentionBadges}
      />
      <main className="flex-1 overflow-y-auto [scrollbar-width:none] hover:[scrollbar-width:thin] [&::-webkit-scrollbar]:w-0 hover:[&::-webkit-scrollbar]:w-2 hover:[&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300/80">
        <div className="mx-auto max-w-[1600px] px-6 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-20 lg:pt-6 lg:pb-10 lg:p-10">
          <BrowserNotificationBridge mode="ecd" ecdId={ecdId} />
          <div>
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
