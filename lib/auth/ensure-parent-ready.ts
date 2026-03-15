import { createClient } from '@/lib/supabase/client'

type EnsureParentReadyResult =
  | { ok: true; userId: string }
  | { ok: false; error: string }

let profileBootstrapDone = false
let profileBootstrapInFlight: Promise<{ ok: boolean; error?: string }> | null = null

async function ensureProfileBootstrap() {
  if (profileBootstrapDone) {
    return { ok: true as const }
  }

  if (!profileBootstrapInFlight) {
    profileBootstrapInFlight = (async () => {
      const response = await fetch('/api/auth/ensure-profile', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        return { ok: false as const, error: payload.error || 'Could not prepare your account.' }
      }
      profileBootstrapDone = true
      return { ok: true as const }
    })()
      .catch((error) => {
        const message =
          error instanceof Error && error.message.trim()
            ? error.message
            : 'Could not prepare your account.'
        return { ok: false as const, error: message }
      })
      .finally(() => {
        profileBootstrapInFlight = null
      })
  }

  return profileBootstrapInFlight
}

export async function ensureParentReady(
  supabase = createClient()
): Promise<EnsureParentReadyResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { ok: false, error: 'Please sign in again before continuing.' }
  }

  // Surgical check first to avoid heavy bootstrap/upsert if everything is already ready
  const { data: existingParent } = await supabase
    .from('parents')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (existingParent) {
    return { ok: true, userId: user.id }
  }

  const bootstrap = await ensureProfileBootstrap()
  if (!bootstrap.ok) {
    return { ok: false, error: bootstrap.error || 'Could not prepare your account.' }
  }

  const { error: parentError } = await supabase
    .from('parents')
    .upsert({ id: user.id }, { onConflict: 'id' })

  if (parentError) {
    return { ok: false, error: parentError.message || 'Could not prepare parent profile.' }
  }

  return { ok: true, userId: user.id }
}
