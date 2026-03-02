export type AuthRole =
  | 'platform_admin'
  | 'ecd_admin'
  | 'ecd_staff'
  | 'ecd_supervisor'
  | 'parent_user'

type PasswordSignInArgs = {
  email: string
  password: string
}

type PasswordSignInResult = {
  data: {
    user: {
      id: string
      user_metadata?: Record<string, unknown>
    } | null
  }
  error: {
    message?: string
    status?: number
    code?: string
  } | null
}

type PasswordAuthClient = {
  auth: {
    signInWithPassword: (credentials: PasswordSignInArgs) => Promise<PasswordSignInResult>
  }
}

type EnsureProfileResponse = {
  ok?: boolean
  role?: string
  error?: string
}

const RETRY_DELAY_MS = 350

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isTransientAuthMessage(message: string) {
  const lowered = message.toLowerCase()
  return (
    lowered.includes('network') ||
    lowered.includes('fetch') ||
    lowered.includes('timeout') ||
    lowered.includes('gateway') ||
    lowered.includes('temporar')
  )
}

function isRetryableHttpStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504
}

export async function signInWithPasswordRetry(
  client: PasswordAuthClient,
  credentials: PasswordSignInArgs,
  maxAttempts = 2
) {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const { data, error } = await client.auth.signInWithPassword(credentials)
      if (!error) {
        if (!data?.user?.id) throw new Error('Sign in returned no user')
        return data.user
      }

      const status = typeof error.status === 'number' ? error.status : 0
      const message = (error.message ?? 'Failed to sign in').trim()
      const shouldRetry = attempt < maxAttempts && (isRetryableHttpStatus(status) || isTransientAuthMessage(message))

      if (!shouldRetry) throw new Error(message)

      lastError = new Error(message)
      await sleep(RETRY_DELAY_MS * attempt)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign in'
      const shouldRetry = attempt < maxAttempts && isTransientAuthMessage(message)
      if (!shouldRetry) throw new Error(message)
      lastError = new Error(message)
      await sleep(RETRY_DELAY_MS * attempt)
    }
  }

  throw lastError ?? new Error('Failed to sign in')
}

function parseAuthRole(value: unknown): AuthRole | null {
  if (
    value === 'platform_admin' ||
    value === 'ecd_admin' ||
    value === 'ecd_staff' ||
    value === 'ecd_supervisor' ||
    value === 'parent_user'
  ) {
    return value
  }
  return null
}

export async function ensureProfileWithRetry(maxAttempts = 2): Promise<{ role: AuthRole | null }> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch('/api/auth/ensure-profile', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
      })

      const payload = (await response.json().catch(() => ({}))) as EnsureProfileResponse
      if (response.ok) {
        return { role: parseAuthRole(payload.role) }
      }

      const message = payload.error || `Account setup failed (${response.status})`
      const shouldRetry = attempt < maxAttempts && isRetryableHttpStatus(response.status)
      if (!shouldRetry) throw new Error(message)
      lastError = new Error(message)
      await sleep(RETRY_DELAY_MS * attempt)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Account setup failed'
      const shouldRetry = attempt < maxAttempts && isTransientAuthMessage(message)
      if (!shouldRetry) throw new Error(message)
      lastError = new Error(message)
      await sleep(RETRY_DELAY_MS * attempt)
    }
  }

  throw lastError ?? new Error('Account setup failed')
}

export function isEcdRole(role: unknown): role is 'ecd_admin' | 'ecd_staff' | 'ecd_supervisor' {
  return role === 'ecd_admin' || role === 'ecd_staff' || role === 'ecd_supervisor'
}

export function destinationForRole(role: AuthRole | null | undefined) {
  if (role === 'platform_admin') return '/admin/command'
  if (role === 'ecd_admin' || role === 'ecd_staff' || role === 'ecd_supervisor') return '/ecd/dashboard'
  return '/parent/dashboard'
}
