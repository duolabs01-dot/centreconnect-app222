// ECD portal shell
// Allowed imports: components/ecd/* + components/ui/*
// Never import from components/cc-admin/*

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { EcdPortalSidebar } from '@/components/layout/ecd-portal-sidebar'
import { EcdMainScrollMemory } from '@/components/layout/ecd-main-scroll-memory'
import { createAdminClient } from '@/lib/supabase/admin'
import { BrowserNotificationBridge } from '@/components/notifications/browser-notification-bridge'
import { AppBreadcrumbs } from '@/components/layout/app-breadcrumbs'
import { getBreadcrumbClassName, shouldShowBreadcrumbs } from '@/lib/navigation/breadcrumb-visibility'
import '../ecd-theme.css'

type EcdLayoutProps = {
  children: React.ReactNode
}

export default async function EcdLayout({ children }: EcdLayoutProps) {
  const requestHeaders = await headers()
  const pathname = requestHeaders.get('x-cc-pathname') ?? ''
  const showBreadcrumbs = shouldShowBreadcrumbs(pathname, 'ecd')

  const { user, role, ecdId } = await requireEcdPortalSession()
  const admin = createAdminClient()

  const { data: centreWithOnboarding, error: centreWithOnboardingError } = await admin
    .from('ecd_centres')
    .select('id, name, owner_id, onboarding_complete, primary_contact_name')
    .eq('id', ecdId)
    .maybeSingle()

  let centre = centreWithOnboarding as {
    id: string
    name?: string | null
    owner_id?: string | null
    onboarding_complete?: boolean | null
    primary_contact_name?: string | null
  } | null

  if (!centre && centreWithOnboardingError) {
    const { data: centreFallback } = await admin.from('ecd_centres').select('id').eq('id', ecdId).maybeSingle()
    centre = centreFallback as {
      id: string
      name?: string | null
      owner_id?: string | null
      onboarding_complete?: boolean | null
      primary_contact_name?: string | null
    } | null
  }

  if (!centre?.id) {
    redirect('/ecd/login?error=centre-link')
  }

  const onboardingComplete =
    typeof centre.onboarding_complete === 'boolean' ? centre.onboarding_complete : true
  const isOwner = role === 'ecd_admin' && centre.owner_id === user.id
  const ownerDisplayName = centre?.primary_contact_name?.trim() || null
  const roleLabel =
    role === 'ecd_staff'
      ? 'Staff Member'
      : role === 'ecd_supervisor'
        ? 'Supervisor'
        : isOwner
          ? (ownerDisplayName ?? 'Crèche Owner')
          : 'ECD Admin'

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
    subscriptionTier,
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
      .contains('metadata', { kind: 'parent_message' })
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
    admin
      .from('subscriptions')
      .select('tier')
      .eq('ecd_id', ecdId)
      .maybeSingle()
      .then(({ data }) => data?.tier ?? null),
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
        roleLabel={roleLabel}
        userRole={role}
        subscriptionTier={subscriptionTier}
        attentionBadges={attentionBadges}
        centreName={centre?.name?.trim() ?? null}
      />
      <main
        id="ecd-portal-main-scroll"
        className="flex-1 overflow-y-auto bg-card md:ml-72 [scrollbar-width:none] hover:[scrollbar-width:thin] [&::-webkit-scrollbar]:w-0 hover:[&::-webkit-scrollbar]:w-2 hover:[&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300/80"
      >
        <EcdMainScrollMemory />
        <div className="mx-auto w-full max-w-[1600px] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-20 sm:px-6 md:pb-10 md:pt-12 lg:px-8 xl:px-10">
          <BrowserNotificationBridge mode="ecd" ecdId={ecdId} />
          {showBreadcrumbs ? (
            <AppBreadcrumbs
              rootHref="/ecd/dashboard"
              rootLabel="ECD"
              className={getBreadcrumbClassName('ecd')}
            />
          ) : null}
          <div className="text-foreground">{children}</div>
        </div>
      </main>
    </div>
  )
}
