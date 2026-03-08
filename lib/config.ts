const APP_URL_CONFIG_ERROR =
  'NEXT_PUBLIC_APP_URL is misconfigured. Set it to your app domain in Vercel.'

function parseConfiguredAppUrl(value: string | null | undefined) {
  const trimmed = (value ?? '').trim()
  if (!trimmed) {
    throw new Error(APP_URL_CONFIG_ERROR)
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  let parsed: URL
  try {
    parsed = new URL(withProtocol)
  } catch {
    throw new Error(APP_URL_CONFIG_ERROR)
  }

  if (parsed.hostname.includes('supabase.co')) {
    throw new Error(APP_URL_CONFIG_ERROR)
  }

  return parsed.origin.replace(/\/$/, '')
}

export function requireConfiguredAppUrl() {
  return parseConfiguredAppUrl(process.env.NEXT_PUBLIC_APP_URL)
}

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://centerconnect.co.za'

export const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'centerconnect.co.za'

export const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL ?? 'admin@centerconnect.co.za'

export const EMAIL_APP_URL =
  process.env.NEXT_PUBLIC_EMAIL_APP_URL ?? 'https://centerconnect.co.za'
