function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return { supabaseUrl, supabaseAnonKey }
}

function withAuthHeaders(sessionToken?: string, includeJson = false) {
  const { supabaseAnonKey } = getSupabaseConfig()
  const headers = new Headers()
  if (supabaseAnonKey) {
    headers.set('apikey', supabaseAnonKey)
  }
  if (sessionToken) {
    headers.set('Authorization', `Bearer ${sessionToken}`)
  }
  if (includeJson) {
    headers.set('Content-Type', 'application/json')
  }
  return headers
}

export async function registerSession(
  userId: string,
  sessionToken: string,
  deviceHint?: string
) {
  const { supabaseUrl } = getSupabaseConfig()
  if (!supabaseUrl || !userId || !sessionToken) return

  await fetch(`${supabaseUrl}/rest/v1/user_sessions?on_conflict=user_id`, {
    method: 'POST',
    headers: (() => {
      const headers = withAuthHeaders(sessionToken, true)
      headers.set('Prefer', 'resolution=merge-duplicates,return=minimal')
      return headers
    })(),
    body: JSON.stringify({
      user_id: userId,
      session_token: sessionToken,
      device_hint: deviceHint ?? 'unknown',
      last_seen_at: new Date().toISOString(),
    }),
    cache: 'no-store',
  })
}

export async function validateSession(
  userId: string,
  sessionToken: string
): Promise<boolean> {
  const { supabaseUrl } = getSupabaseConfig()
  if (!supabaseUrl || !userId) return true
  if (!sessionToken) return false

  const response = await fetch(
    `${supabaseUrl}/rest/v1/user_sessions?user_id=eq.${encodeURIComponent(userId)}&select=session_token`,
    {
      method: 'GET',
      headers: withAuthHeaders(sessionToken),
      cache: 'no-store',
    }
  )

  if (!response.ok) return true

  const data = (await response.json().catch(() => [])) as Array<{ session_token?: string }>
  if (!Array.isArray(data) || data.length === 0) return true

  return data[0]?.session_token === sessionToken
}

export async function clearSession(userId: string) {
  const { supabaseUrl } = getSupabaseConfig()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey || !userId) return

  await fetch(`${supabaseUrl}/rest/v1/user_sessions?user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: (() => {
      const headers = new Headers()
      headers.set('apikey', serviceRoleKey)
      headers.set('Authorization', `Bearer ${serviceRoleKey}`)
      headers.set('Prefer', 'return=minimal')
      return headers
    })(),
    cache: 'no-store',
  })
}
