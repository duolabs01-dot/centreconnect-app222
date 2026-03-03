// ECD portal shell
// Allowed imports: components/ecd/* + components/ui/*
// Never import from components/cc-admin/*

import { redirect } from 'next/navigation'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { EcdPortalSidebar } from '@/components/layout/ecd-portal-sidebar'
import { EcdMainScrollMemory } from '@/components/layout/ecd-main-scroll-memory'
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
    staleApplications72hCount,
    partialApplicationsCount,
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
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('ecd_id', ecdId)
      .in('status', ['submitted', 'in_review'])
      .lt('submitted_at', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString())
      .then(({ count, error }) => (error ? 0 : count ?? 0)),
    admin
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('ecd_id', ecdId)
      .in('status', ['partial', 'draft'])
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
    '/ecd/applications:stale72h': staleApplications72hCount,
    '/ecd/applications:partial': partialApplicationsCount,
    '/ecd/communications': unreadEcdNotificationsCount,
    '/ecd/transport': pendingTransportCount,
    '/ecd/compliance': complianceOutstandingCount,
  }

  return (
    <div className="ecd-premium-shell ecd-light-shell flex h-screen overflow-hidden bg-card text-foreground">
      <EcdPortalSidebar
        userEmail={user.email ?? null}
        userRole={role}
        attentionBadges={attentionBadges}
      />
      <main
        id="ecd-portal-main-scroll"
        className="flex-1 overflow-y-auto bg-card md:ml-72 [scrollbar-width:none] hover:[scrollbar-width:thin] [&::-webkit-scrollbar]:w-0 hover:[&::-webkit-scrollbar]:w-2 hover:[&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300/80"
      >
        <EcdMainScrollMemory />
        <div className="mx-auto w-full max-w-[1600px] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-20 sm:px-6 md:pb-10 md:pt-6 lg:px-8 xl:px-10">
          <BrowserNotificationBridge mode="ecd" ecdId={ecdId} />
          <div className="text-foreground">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
