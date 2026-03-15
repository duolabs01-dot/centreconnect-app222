import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

  // Only perform profile upsert if it's missing or incomplete
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

  // Check if parent record exists before upserting
  const { data: existingParent } = await supabase
    .from('parents')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!existingParent) {
    const { error: parentBootstrapError } = await supabase
      .from('parents')
      .upsert({ id: user.id }, { onConflict: 'id' })
    if (parentBootstrapError) {
      console.error('[parent/layout] Failed to ensure parent record:', parentBootstrapError)
    }
  }

  return <div className="animate-in fade-in duration-200">{children}</div>
}
