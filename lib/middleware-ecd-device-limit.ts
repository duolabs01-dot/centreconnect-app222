import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { readSupabasePublicEnv } from '@/lib/supabase/env'
import { validateSession } from '@/lib/session-guard'

/**
 * Middleware guard to enforce ECD Admin 2-device limit.
 * This runs after the main middleware and checks that the current session token is still valid.
 */
export async function enforceEcdAdminDeviceLimit(request: NextRequest) {
  const { supabaseUrl, supabaseAnonKey } = readSupabasePublicEnv()
  if (!supabaseUrl || !supabaseAnonKey) return NextResponse.next()

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set() {
        // No-op; we only read
      },
      remove() {
        // No-op
      },
    },
  })

  // Extract user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (!user || userError) return NextResponse.next()

  // Quick role lookup (cached in main middleware)
  const role = request.cookies.get('cc_role')?.value
  if (role !== 'ecd_admin') return NextResponse.next()

  // Validate that this session token is still in the allowed sessions table
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()
  if (!session?.access_token || sessionError) return NextResponse.next()

  const isValid = await validateSession(user.id, session.access_token)
  if (!isValid) {
    // Session not found (pruned or revoked); force logout
    const loginUrl = new URL('/ecd/login', request.url)
    loginUrl.searchParams.set('error', 'session_revoked')
    loginUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}
