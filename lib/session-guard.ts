import { readSupabasePublicEnv, readSupabaseServiceRoleKey } from '@/lib/supabase/env'

function getSupabaseConfig() {
  const { supabaseUrl, supabaseAnonKey } = readSupabasePublicEnv()
  return { supabaseUrl, supabaseAnonKey }
}

function hashDeviceFingerprint(deviceHint: string, userAgent: string, ipAddress?: string): string {
  const crypto = require('crypto')
  const base = `${deviceHint}|${userAgent}|${ipAddress || ''}`
  return crypto.createHash('sha256').update(base).digest('hex').slice(0, 32)
}

async function getUserRole(userId: string): Promise<string | null> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
  if (!supabaseAnonKey) return null
  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${userId}&select=role`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
      cache: 'no-store',
    })
    if (!resp.ok) return null
    const data = await resp.json().catch(() => [])
    return Array.isArray(data) && data[0]?.role ? data[0].role : null
  } catch {
    return null
  }
}

async function pruneOldestSessions(userId: string, maxSessions: number, sessionToken: string) {
  const { supabaseUrl } = getSupabaseConfig()
  const serviceRoleKey = readSupabaseServiceRoleKey()
  if (!supabaseUrl || !serviceRoleKey) return

  try {
    // List current sessions sorted by created_at DESC, exclude current token
    const listResp = await fetch(
      `${supabaseUrl}/rest/v1/user_sessions?user_id=eq.${userId}&select=id,created_at&order=created_at.desc`,
      {
        headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
        cache: 'no-store',
      }
    )
    if (!listResp.ok) return
    const sessions = await listResp.json().catch(() => [])
    if (!Array.isArray(sessions)) return

    const toDelete = sessions.slice(maxSessions).map((s: any) => s.id)
    if (toDelete.length === 0) return

    // Delete the oldest beyond the limit
    await fetch(`${supabaseUrl}/rest/v1/user_sessions?id=in.(${toDelete.join(',')})`, {
      method: 'DELETE',
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
      cache: 'no-store',
    })
  } catch {
    // ignore pruning errors
  }
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
  deviceHint?: string,
  ipAddress?: string,
  region?: string,
  userAgent?: string
) {
  const { supabaseUrl } = getSupabaseConfig()
  if (!supabaseUrl || !userId || !sessionToken) return false

  const role = await getUserRole(userId)
  const isEcdAdmin = role === 'ecd_admin'
  const maxSessions = isEcdAdmin ? 2 : 10 // generous default for non-admins
  const fingerprint = hashDeviceFingerprint(deviceHint ?? 'unknown', userAgent ?? 'unknown', ipAddress)

  try {
    // Upsert this session with device fingerprint
    await fetch(`${supabaseUrl}/rest/v1/user_sessions`, {
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
        device_fingerprint: fingerprint,
        ip_address: ipAddress,
        region: region,
        user_agent: userAgent,
        last_seen_at: new Date().toISOString(),
      }),
      cache: 'no-store',
    })

    // Enforce per-user session limit for ECD Admins
    if (isEcdAdmin) {
      await pruneOldestSessions(userId, maxSessions, sessionToken)
    }

    return true
  } catch {
    return false
  }
}

export async function validateSession(
  userId: string,
  sessionToken: string
): Promise<boolean> {
  const { supabaseUrl } = getSupabaseConfig()
  if (!supabaseUrl || !userId) return false
  if (!sessionToken) return false

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/user_sessions?user_id=eq.${encodeURIComponent(userId)}&select=session_token`,
      {
        method: 'GET',
        headers: withAuthHeaders(sessionToken),
        cache: 'no-store',
      }
    )

    if (!response.ok) return false

    const data = (await response.json().catch(() => [])) as Array<{ session_token?: string }>
    if (!Array.isArray(data) || data.length === 0) return false

    // Accept if any row matches the token (multi-session support)
    return data.some((row) => row.session_token === sessionToken)
  } catch {
    return false
  }
}

export async function clearSession(userId: string) {
  const { supabaseUrl } = getSupabaseConfig()
  const serviceRoleKey = readSupabaseServiceRoleKey()

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

export async function getActiveSessions(userId: string): Promise<Array<{ id: string; device_fingerprint: string; device_hint: string; ip_address: string; user_agent: string; created_at: string; last_seen_at: string }>> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
  if (!supabaseAnonKey) return []

  try {
    const resp = await fetch(
      `${supabaseUrl}/rest/v1/user_sessions?user_id=eq.${userId}&select=id,device_fingerprint,device_hint,ip_address,user_agent,created_at,last_seen_at&order=created_at.desc`,
      {
        headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
        cache: 'no-store',
      }
    )
    if (!resp.ok) return []
    const data = await resp.json().catch(() => [])
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export async function revokeSessionById(userId: string, sessionId: string): Promise<boolean> {
  const { supabaseUrl } = getSupabaseConfig()
  const serviceRoleKey = readSupabaseServiceRoleKey()
  if (!supabaseUrl || !serviceRoleKey) return false

  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/user_sessions?id=eq.${sessionId}&user_id=eq.${userId}`, {
      method: 'DELETE',
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
      cache: 'no-store',
    })
    return resp.ok
  } catch {
    return false
  }
}
