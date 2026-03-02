type SignOutAuthClient = {
  auth: {
    signOut: (options?: { scope?: 'global' | 'local' | 'others' }) => Promise<{ error: { message?: string } | null }>
  }
}

export type RobustSignOutResult = {
  clientError: string | null
  serverError: string | null
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

  return { clientError, serverError }
}
