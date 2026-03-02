import { createBrowserClient } from '@supabase/ssr'
import { requireSupabaseBrowserEnv } from './env'

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = requireSupabaseBrowserEnv('browser-client')

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
}
