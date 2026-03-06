import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BrowserNotificationBridge } from '@/components/notifications/browser-notification-bridge'

export default async function ParentAuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const profileResult = await supabase
    .from('user_profiles')
    .select('role,full_name,phone')
    .eq('id', user.id)
    .maybeSingle()

  const existingProfile = profileResult.data
  const metadataRole =
    typeof user.user_metadata?.role === 'string' ? String(user.user_metadata.role).trim() : null
  const resolvedRole = existingProfile?.role ?? metadataRole

  if (resolvedRole && resolvedRole !== 'parent_user') {
    redirect('/login?error=unauthorized')
  }

  if (!existingProfile || !existingProfile.role) {
    const fallbackName =
      typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name.trim()
        : typeof user.user_metadata?.first_name === 'string'
          ? user.user_metadata.first_name.trim()
          : null
    const fallbackPhone =
      typeof user.user_metadata?.phone === 'string' ? user.user_metadata.phone.trim() : null

    await supabase.from('user_profiles').upsert(
      {
        id: user.id,
        role: 'parent_user',
        full_name: fallbackName || null,
        phone: fallbackPhone || null,
      },
      { onConflict: 'id' }
    )
  }

  const { error: parentBootstrapError } = await supabase
    .from('parents')
    .upsert({ id: user.id }, { onConflict: 'id' })
  if (parentBootstrapError) {
    console.error('[parent/layout] Failed to ensure parent record:', parentBootstrapError)
  }

  return (
    <div className="animate-in fade-in duration-200">
      <BrowserNotificationBridge mode="parent" parentId={user.id} />
      {children}
    </div>
  )
}
