import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminTenantsOnboarding } from '@/components/admin/admin-tenants-onboarding'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tenant Onboarding | CC Admin',
  description: 'Create and onboard new centres with owner and team invites.',
}

export default async function AdminTenantsPage() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'platform_admin') redirect('/login')

  return <AdminTenantsOnboarding />
}
