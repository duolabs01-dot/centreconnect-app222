const PUBLIC_URL_KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'] as const
const PUBLIC_ANON_KEYS = ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY'] as const
const BROWSER_PUBLIC_URL_KEYS = ['NEXT_PUBLIC_SUPABASE_URL'] as const
const BROWSER_PUBLIC_ANON_KEYS = ['NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const
const SERVICE_ROLE_KEYS = ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY'] as const

function readFirstEnv(keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = process.env[key]
    if (value && value.trim().length > 0) {
      return value.trim()
    }
  }
  return null
}

function buildMissingEnvError(context: string, missing: string[]): Error {
  return new Error(
    `[supabase:${context}] Missing required environment variable(s): ${missing.join(', ')}. ` +
      'Configure these in your deployment provider (Netlify/Vercel) environment settings.'
  )
}

export function readSupabasePublicEnv() {
  return {
    supabaseUrl: readFirstEnv(PUBLIC_URL_KEYS),
    supabaseAnonKey: readFirstEnv(PUBLIC_ANON_KEYS),
  }
}

export function readSupabaseBrowserEnv() {
  return {
    supabaseUrl: readFirstEnv(BROWSER_PUBLIC_URL_KEYS),
    supabaseAnonKey: readFirstEnv(BROWSER_PUBLIC_ANON_KEYS),
  }
}

export function readSupabaseServiceRoleKey() {
  return readFirstEnv(SERVICE_ROLE_KEYS)
}

export function requireSupabasePublicEnv(context: string): {
  supabaseUrl: string
  supabaseAnonKey: string
} {
  const { supabaseUrl, supabaseAnonKey } = readSupabasePublicEnv()
  const missing: string[] = []

  if (!supabaseUrl) missing.push(`${PUBLIC_URL_KEYS[0]} (or ${PUBLIC_URL_KEYS[1]})`)
  if (!supabaseAnonKey) missing.push(`${PUBLIC_ANON_KEYS[0]} (or ${PUBLIC_ANON_KEYS[1]})`)

  if (missing.length > 0) {
    throw buildMissingEnvError(context, missing)
  }

  return { supabaseUrl: supabaseUrl as string, supabaseAnonKey: supabaseAnonKey as string }
}

export function requireSupabaseBrowserEnv(context: string): {
  supabaseUrl: string
  supabaseAnonKey: string
} {
  const { supabaseUrl, supabaseAnonKey } = readSupabaseBrowserEnv()
  const missing: string[] = []

  if (!supabaseUrl) missing.push(BROWSER_PUBLIC_URL_KEYS[0])
  if (!supabaseAnonKey) missing.push(BROWSER_PUBLIC_ANON_KEYS[0])

  if (missing.length > 0) {
    throw buildMissingEnvError(context, missing)
  }

  return { supabaseUrl: supabaseUrl as string, supabaseAnonKey: supabaseAnonKey as string }
}

export function requireSupabaseAdminEnv(context: string): {
  supabaseUrl: string
  serviceRoleKey: string
} {
  const { supabaseUrl } = requireSupabasePublicEnv(context)
  const serviceRoleKey = readSupabaseServiceRoleKey()

  if (!serviceRoleKey) {
    throw buildMissingEnvError(context, [
      `${SERVICE_ROLE_KEYS[0]} (or ${SERVICE_ROLE_KEYS[1]})`,
    ])
  }

  return { supabaseUrl, serviceRoleKey: serviceRoleKey as string }
}
