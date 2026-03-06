export function isNavigatorLockTimeoutError(error: unknown) {
  const message =
    typeof error === 'string'
      ? error
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: unknown }).message ?? '')
        : ''

  const normalized = message.toLowerCase()
  return (
    normalized.includes('lockmanager') &&
    normalized.includes('auth-token') &&
    normalized.includes('timed out')
  )
}

export function toFriendlyClientError(error: unknown, fallback: string) {
  if (isNavigatorLockTimeoutError(error)) {
    return 'Your session is busy right now. Please wait a few seconds and try again.'
  }

  if (typeof error === 'string' && error.trim()) return error
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }

  return fallback
}
