import 'server-only'

type BillingLogLevel = 'info' | 'warn' | 'error'

export function logBillingEvent(
  event: string,
  payload: Record<string, unknown> = {},
  level: BillingLogLevel = 'info'
) {
  const entry = {
    ts: new Date().toISOString(),
    domain: 'billing',
    event,
    ...payload,
  }
  const line = JSON.stringify(entry)
  if (level === 'error') {
    console.error(line)
    return
  }
  if (level === 'warn') {
    console.warn(line)
    return
  }
  console.info(line)
}
