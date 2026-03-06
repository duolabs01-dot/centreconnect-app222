import type { SupabaseClient } from '@supabase/supabase-js'

type RevokeUserSessionsResult = {
  ok: boolean
  warning?: string
}

export async function revokeUserSessionsByUserId(
  admin: SupabaseClient,
  userId: string
): Promise<RevokeUserSessionsResult> {
  if (!userId) return { ok: false, warning: 'Missing user id for session revocation.' }

  const errors: string[] = []

  const refreshTokensResult = await admin
    .schema('auth')
    .from('refresh_tokens')
    .delete()
    .eq('user_id', userId)
  if (refreshTokensResult.error) {
    errors.push(`refresh_tokens: ${refreshTokensResult.error.message}`)
  }

  const sessionsResult = await admin.schema('auth').from('sessions').delete().eq('user_id', userId)
  if (sessionsResult.error) {
    errors.push(`sessions: ${sessionsResult.error.message}`)
  }

  const userSessionsResult = await admin.from('user_sessions').delete().eq('user_id', userId)
  if (userSessionsResult.error) {
    errors.push(`user_sessions: ${userSessionsResult.error.message}`)
  }

  if (errors.length > 0) {
    return {
      ok: false,
      warning: `Could not fully revoke active sessions (${errors.join(' | ')})`,
    }
  }

  return { ok: true }
}

