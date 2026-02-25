import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ParentAppShell } from '@/components/layout/parent-app-shell'
import { BrowserNotificationBridge } from '@/components/notifications/browser-notification-bridge'
import { evaluateParentIntakeReadiness } from '@/lib/admissions/intake-readiness'

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('role,full_name,phone')
    .eq('id', user.id)
    .maybeSingle()

  let role = existingProfile?.role ?? null
  if (!role) {
    const fullName =
      (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
      (user.email?.split('@')[0]?.replace(/[._-]+/g, ' ').trim() || 'New User')
    const phone = typeof user.user_metadata?.phone === 'string' ? user.user_metadata.phone : null

    const { error: profileUpsertError } = await supabase.from('user_profiles').upsert(
      {
        id: user.id,
        role: 'parent_user',
        full_name: fullName,
        phone,
      },
      { onConflict: 'id' }
    )

    if (profileUpsertError) {
      redirect('/login')
    }

    const { error: parentUpsertError } = await supabase
      .from('parents')
      .upsert({ id: user.id }, { onConflict: 'id' })

    if (parentUpsertError) {
      redirect('/login')
    }

    role = 'parent_user'
  }

  if (role !== 'parent_user') {
    redirect('/login')
  }

  const [parentProfileResult, parentDocsCountResult, childrenCountResult] = await Promise.all([
    supabase
      .from('parents')
      .select('id_verification_status,guardian_relationship,emergency_contact_name,emergency_contact_phone')
      .eq('id', user.id)
      .maybeSingle(),
    supabase.from('parent_documents').select('id,doc_type').eq('parent_id', user.id).limit(100),
    supabase.from('children').select('id', { count: 'exact', head: true }).eq('parent_id', user.id),
  ])

  const verificationStatus = parentProfileResult.data?.id_verification_status?.trim().toLowerCase() ?? ''
  const isVerifiedByDocuments = verificationStatus === 'verified'
  const isVerified = isVerifiedByDocuments
  const readiness = evaluateParentIntakeReadiness({
    parent: {
      fullName: existingProfile?.full_name,
      phone: existingProfile?.phone,
      guardianRelationship: parentProfileResult.data?.guardian_relationship,
      emergencyContactName: parentProfileResult.data?.emergency_contact_name,
      emergencyContactPhone: parentProfileResult.data?.emergency_contact_phone,
      idVerificationStatus: parentProfileResult.data?.id_verification_status,
    },
    docTypes: (parentDocsCountResult.data ?? []).map((item) => item.doc_type),
    hasAtLeastOneChild: (childrenCountResult.count ?? 0) > 0,
  })
  const userName =
    existingProfile?.full_name?.trim() ||
    (typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : '') ||
    (user.email?.split('@')[0]?.replace(/[._-]+/g, ' ').trim() || 'Parent')

  return (
    <div className="min-h-screen">
      <ParentAppShell
        userName={userName}
        isVerified={isVerified}
        profileNudge={
          readiness.ready
            ? null
            : {
                completionPct: readiness.completionPct,
                missing: readiness.missing.slice(0, 4),
              }
        }
      >
        <BrowserNotificationBridge mode="parent" parentId={user.id} />
        {children}
      </ParentAppShell>
    </div>
  )
}
