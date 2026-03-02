import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { requireSupabaseAdminEnv } from './env'

export function createAdminClient() {
  const { supabaseUrl, serviceRoleKey } = requireSupabaseAdminEnv('admin-client')

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
