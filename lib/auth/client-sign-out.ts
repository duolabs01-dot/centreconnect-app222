type SignOutAuthClient = {
  auth: {
    signOut: (options?: { scope?: 'global' | 'local' | 'others' }) => Promise<{ error: { message?: string } | null }>
  }
}

export type RobustSignOutResult = {
  clientError: string | null
  serverError: string | null
}

const ROLE_CACHE_COOKIES = ['cc_role', 'cc_role_uid', 'cc_role_exp', 'cc_last_activity']

function clearClientAuthArtifacts() {
  if (typeof window === 'undefined') {
    return
  }

  const storages: Array<Storage | null> = [window.localStorage, window.sessionStorage]

  for (const storage of storages) {
    if (!storage) continue

    const keysToRemove: string[] = []
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (!key) continue

      if (key === 'supabase.auth.token' || key.startsWith('sb-') || key.includes('supabase')) {
        keysToRemove.push(key)
      }
    }

    for (const key of keysToRemove) {
      storage.removeItem(key)
    }
  }

  const cookieNames = document.cookie
    .split(';')
    .map((cookie) => cookie.trim().split('=')[0])
    .filter(Boolean)

  for (const cookieName of cookieNames) {
    if (cookieName.startsWith('sb-') || ROLE_CACHE_COOKIES.includes(cookieName)) {
      document.cookie = `${cookieName}=; Max-Age=0; path=/; SameSite=Lax`
    }
  }
}

export async function robustSignOut(authClient: SignOutAuthClient): Promise<RobustSignOutResult> {
  let clientError: string | null = null
  let serverError: string | null = null

  try {
    const { error } = await authClient.auth.signOut({ scope: 'global' })
    if (error) {
      clientError = error.message ?? 'Client sign out failed'
    }
  } catch (error) {
    clientError = error instanceof Error ? error.message : 'Client sign out failed'
  }

  try {
    const response = await fetch('/api/auth/sign-out', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      let message = `Server sign out failed (${response.status})`
      try {
        const payload = (await response.json()) as { error?: string } | null
        if (payload?.error) {
          message = payload.error
        }
      } catch {
        // no-op: keep status-based message
      }
      serverError = message
    }
  } catch (error) {
    serverError = error instanceof Error ? error.message : 'Server sign out failed'
  }

  clearClientAuthArtifacts()

  return { clientError, serverError }
}
