'use client'

type TelemetryValue = string | number | boolean | null

type ParentSubmitFailureInput = {
  route: string
  form: string
  failureType: string
  message: string
  code?: string | null
  source?: 'client' | 'server'
  context?: Record<string, TelemetryValue>
}

function clamp(value: string, max: number) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed.slice(0, max)
}

export function reportParentSubmitFailure(input: ParentSubmitFailureInput) {
  if (typeof window === 'undefined') return

  const route = clamp(input.route, 160)
  const form = clamp(input.form, 80)
  const failureType = clamp(input.failureType, 80)
  const message = clamp(input.message, 600)

  if (!route || !form || !failureType || !message) return

  const payload = JSON.stringify({
    route,
    form,
    failureType,
    message,
    code: input.code ? clamp(input.code, 80) : undefined,
    source: input.source ?? 'client',
    context: input.context ?? {},
  })

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([payload], { type: 'application/json' })
    navigator.sendBeacon('/api/parent/submit-failures', blob)
    return
  }

  void fetch('/api/parent/submit-failures', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Telemetry should never block parent UX.
  })
}
