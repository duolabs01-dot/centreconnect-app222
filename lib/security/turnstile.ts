import 'server-only'

type TurnstileVerifyResponse = {
  success: boolean
  'error-codes'?: string[]
}

function getTurnstileSecretKey() {
  return process.env.TURNSTILE_SECRET_KEY?.trim() || null
}

export function isTurnstileEnabled() {
  return Boolean(getTurnstileSecretKey())
}

export async function verifyTurnstileToken(input: { token: string; remoteIp?: string | null }) {
  const secret = getTurnstileSecretKey()
  if (!secret) {
    // Warn in production but allow bypass (intended for dev)
    if (process.env.NODE_ENV === 'production') {
      console.warn('[turnstile] WARNING: TURNSTILE_SECRET_KEY not set - CAPTCHA disabled in production!')
    }
    return { ok: true as const, skipped: true as const }
  }

  const token = input.token?.trim()
  if (!token) {
    return { ok: false as const, error: 'missing-token' }
  }

  const body = new URLSearchParams()
  body.set('secret', secret)
  body.set('response', token)
  if (input.remoteIp) body.set('remoteip', input.remoteIp)

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    return { ok: false as const, error: `http-${response.status}` }
  }

  const payload = (await response.json()) as TurnstileVerifyResponse
  if (!payload.success) {
    return { ok: false as const, error: payload['error-codes']?.join(',') || 'verify-failed' }
  }

  return { ok: true as const, skipped: false as const }
}
