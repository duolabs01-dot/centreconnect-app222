import { createBrowserClient } from '@supabase/ssr'
import { requireSupabasePublicEnv } from './env'

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = requireSupabasePublicEnv('browser-client')

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
}
