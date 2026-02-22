import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export type PlatformAdminIdentity = {
  userId: string
  email: string | null
}

function getBearerToken(request?: Request): string | null {
  if (!request) return null
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const [scheme, token] = authHeader.split(' ')
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return null
  }
  return token
}

async function getUserFromBearerToken(token: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)
  const {
    data: { user },
  } = await supabase.auth.getUser(token)

  return user
}

export async function requirePlatformAdmin(
  request?: Request
): Promise<PlatformAdminIdentity | null> {
  const bearerToken = getBearerToken(request)

  let userId: string | null = null
  let email: string | null = null

  if (bearerToken) {
    const tokenUser = await getUserFromBearerToken(bearerToken)
    userId = tokenUser?.id ?? null
    email = tokenUser?.email ?? null
  } else {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    userId = user?.id ?? null
    email = user?.email ?? null
  }

  if (!userId) {
    return null
  }

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.role !== 'platform_admin') {
    return null
  }

  return {
    userId,
    email,
  }
}
