import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ParentAppShell } from '@/components/layout/parent-app-shell'

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
    .select('role')
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

  return (
    <div className="min-h-screen pb-24">
      <ParentAppShell userEmail={user.email ?? 'Unknown email'}>{children}</ParentAppShell>
    </div>
  )
}
