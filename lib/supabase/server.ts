import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { requireConfiguredAppUrl } from '@/lib/config'
import { requireSupabasePublicEnv } from './env'

export async function createClient() {
  requireConfiguredAppUrl()

  const cookieStore = cookies()
  const { supabaseUrl, supabaseAnonKey } = requireSupabasePublicEnv('server-client')

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            console.error(`[supabase] Failed to set cookie ${name}:`, error)
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            console.error(`[supabase] Failed to remove cookie ${name}:`, error)
          }
        },
      },
    }
  )
}
