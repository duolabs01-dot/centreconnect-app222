import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ROLE_CACHE_COOKIES = ['cc_role', 'cc_role_uid', 'cc_role_exp', 'cc_last_activity']

function clearCookie(response: NextResponse, name: string, secure: boolean) {
  response.cookies.set({
    name,
    value: '',
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
    secure,
  })

  response.cookies.set({
    name,
    value: '',
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
    secure,
    httpOnly: true,
  })
}

export async function POST(request: NextRequest) {
  let signOutError: string | null = null

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut({ scope: 'global' })
    if (error) {
      signOutError = error.message ?? 'Supabase sign out failed'
    }
  } catch (error) {
    signOutError = error instanceof Error ? error.message : 'Supabase sign out failed'
  }

  const response = NextResponse.json(
    {
      ok: true,
      warning: signOutError,
    },
    { status: 200 }
  )

  response.headers.set('Cache-Control', 'no-store, max-age=0')

  const secure = request.nextUrl.protocol === 'https:' || process.env.NODE_ENV === 'production'
  const requestCookies = request.cookies.getAll()

  for (const cookie of requestCookies) {
    if (cookie.name.startsWith('sb-')) {
      clearCookie(response, cookie.name, secure)
    }
  }

  for (const cookieName of ROLE_CACHE_COOKIES) {
    clearCookie(response, cookieName, secure)
  }

  return response
}
