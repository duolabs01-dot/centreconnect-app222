import { createClient } from '@/lib/supabase/server'
import { getParentProgress } from '@/lib/parent/progress'
import { ParentAppShell } from '@/components/layout/parent-app-shell'
import { evaluateParentIntakeReadiness } from '@/lib/admissions/intake-readiness'
import { ParentLayoutProvider } from '@/components/layout/parent-layout-provider'
import { PublicShell } from '@/components/layout/public-shell'
import { headers } from 'next/headers'

export default async function JourneyLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers()
  const pathname = requestHeaders.get('x-cc-pathname') ?? ''
  const isEcdWelcomeRoute = pathname === '/ecd/welcome' || pathname.startsWith('/ecd/welcome/')
  if (isEcdWelcomeRoute) {
    return <>{children}</>
  }

  let supabase: Awaited<ReturnType<typeof createClient>> | null = null
  let user: { id: string; email?: string | null } | null = null

  try {
    supabase = await createClient()
    const userResult = await supabase.auth.getUser()
    user = (userResult.data?.user as { id: string; email?: string | null } | null) ?? null
  } catch (error) {
    console.error('[journey/layout] Falling back to public shell:', error)
    return (
      <PublicShell>
        {children}
      </PublicShell>
    )
  }

  if (!user) {
    return (
      <PublicShell>
        {children}
      </PublicShell>
    )
  }

  // Fetch parent profile if user exists
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role,full_name,avatar_url,phone')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'parent_user') {
    return (
      <PublicShell>
        {children}
      </PublicShell>
    )
  }

  const { error: parentBootstrapError } = await supabase
    .from('parents')
    .upsert({ id: user.id }, { onConflict: 'id' })
  if (parentBootstrapError) {
    console.error('[journey/layout] Failed to ensure parent record:', parentBootstrapError)
  }

  // Only proceed with full parent layout data if they are indeed a parent
  const [parentDetails, parentDocs, childrenCount] = await Promise.all([
    supabase
      .from('parents')
      .select('id_verification_status,guardian_relationship,emergency_contact_name,emergency_contact_phone')
      .eq('id', user.id)
      .maybeSingle(),
    supabase.from('parent_documents').select('doc_type').eq('parent_id', user.id).limit(100),
    supabase.from('children').select('id', { count: 'exact', head: true }).eq('parent_id', user.id),
  ])

  const verificationStatus = parentDetails.data?.id_verification_status?.trim().toLowerCase() ?? ''
  const isVerified = verificationStatus === 'verified'
  
  const progress = await getParentProgress(user.id)

  const parentLayoutData = {
    userName: profile?.full_name?.trim() || user.email?.split('@')[0] || 'Parent',
    avatarUrl: profile?.avatar_url,
    isVerified: isVerified,
    profileNudge: progress.profileCompleteness === 100
      ? null
      : {
          completionPct: progress.profileCompleteness,
          missing: progress.nextAction.missingProfileFields.slice(0, 4),
        },
    userId: user.id,
    homeState: progress.homeState,
  }

  return (
    <ParentLayoutProvider data={parentLayoutData}>
      <ParentAppShell>
        {children}
      </ParentAppShell>
    </ParentLayoutProvider>
  )
}
