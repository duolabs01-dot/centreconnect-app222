import { createBrowserClient } from '@supabase/ssr'
import { requireSupabaseBrowserEnv } from './env'

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = requireSupabaseBrowserEnv('browser-client')

  if (browserClient) {
    return browserClient
  }

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return browserClient
}
