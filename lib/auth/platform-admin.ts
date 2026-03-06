import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

function getPlatformAdminEmailAllowlist() {
  const raw = [
    process.env.PLATFORM_ADMIN_EMAIL,
    process.env.UAT_PLATFORM_ADMIN_EMAIL,
    process.env.PLATFORM_ADMIN_EMAILS,
  ]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(',')

  return new Set(
    raw
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  )
}

async function getUserFromBearerToken(
  token: string,
  adminClient: ReturnType<typeof createAdminClient>
) {
  const {
    data: { user },
    error,
  } = await adminClient.auth.getUser(token)

  if (error) return null
  return user ?? null
}

export async function requirePlatformAdmin(
  request?: Request
): Promise<PlatformAdminIdentity | null> {
  const bearerToken = getBearerToken(request)
  const adminClient = createAdminClient()
  const allowlistedEmails = getPlatformAdminEmailAllowlist()

  let userId: string | null = null
  let email: string | null = null

  if (bearerToken) {
    const tokenUser = await getUserFromBearerToken(bearerToken, adminClient)
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

  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.role !== 'platform_admin') {
    const normalizedEmail = (email ?? '').trim().toLowerCase()
    const allowlisted = normalizedEmail.length > 0 && allowlistedEmails.has(normalizedEmail)
    if (!allowlisted) {
      return null
    }

    await adminClient.from('user_profiles').upsert(
      {
        id: userId,
        role: 'platform_admin',
      },
      { onConflict: 'id' }
    )
  }

  return {
    userId,
    email,
  }
}
