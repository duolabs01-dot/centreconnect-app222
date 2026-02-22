import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type EcdPortalRole = 'ecd_admin' | 'ecd_staff'

export type EcdPortalSession = {
  supabase: Awaited<ReturnType<typeof createClient>>
  user: {
    id: string
    email: string | null
  }
  role: EcdPortalRole
  ecdId: string
}

async function resolveEcdPortalSession(): Promise<EcdPortalSession | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || (profile.role !== 'ecd_admin' && profile.role !== 'ecd_staff')) {
    return null
  }

  const { data: membership } = await supabase
    .from('ecd_admins')
    .select('ecd_id')
    .eq('user_id', user.id)
    .order('invited_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!membership?.ecd_id) return null

  return {
    supabase,
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    role: profile.role,
    ecdId: membership.ecd_id,
  }
}

const getEcdPortalSessionCached = cache(resolveEcdPortalSession)

type SessionOptions = {
  cached?: boolean
}

export async function requireEcdPortalSession(options: SessionOptions = {}): Promise<EcdPortalSession> {
  const session = options.cached === false ? await resolveEcdPortalSession() : await getEcdPortalSessionCached()
  if (!session) {
    redirect('/ecd/login')
  }
  return session
}
