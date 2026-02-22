import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type AllowedRole = 'platform_admin' | 'ecd_admin' | 'ecd_staff' | 'parent_user'

function sanitizeRole(role: unknown): AllowedRole {
  if (role === 'platform_admin' || role === 'ecd_admin' || role === 'ecd_staff' || role === 'parent_user') {
    return role
  }
  return 'parent_user'
}

function fallbackName(email?: string | null) {
  const local = (email ?? '').split('@')[0]?.trim()
  if (!local) return 'New User'
  const clean = local.replace(/[._-]+/g, ' ').trim()
  return clean || 'New User'
}

function sanitizeNextPath(value: string | null | undefined) {
  if (!value) return '/parent/dashboard'
  if (!value.startsWith('/')) return '/parent/dashboard'
  if (value.startsWith('//')) return '/parent/dashboard'
  if (value.startsWith('/login') || value.startsWith('/register') || value.startsWith('/auth')) {
    return '/parent/dashboard'
  }
  return value
}

function getSafeRedirectBase(request: NextRequest) {
  const base = new URL(request.url)
  if (base.hostname === '0.0.0.0') {
    base.hostname = 'localhost'
  }
  return base
}

function buildRedirectUrl(path: string, request: NextRequest) {
  return new URL(path, getSafeRedirectBase(request))
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null
  const next = sanitizeNextPath(url.searchParams.get('next'))

  if (!code && (!tokenHash || !type)) {
    return NextResponse.redirect(buildRedirectUrl('/login?error=invalid-confirmation-link', request))
  }

  const supabase = await createClient()
  let error: { message: string } | null = null
  if (code) {
    const { error: codeError } = await supabase.auth.exchangeCodeForSession(code)
    if (codeError) error = codeError
  } else if (tokenHash && type) {
    const { error: otpError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    })
    if (otpError) error = otpError
  }

  if (error) {
    return NextResponse.redirect(buildRedirectUrl('/login?error=confirmation-failed', request))
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(buildRedirectUrl('/login?error=confirmation-session-missing', request))
  }

  const desiredRole = sanitizeRole(user.user_metadata?.role)
  const fullName = user.user_metadata?.full_name ?? fallbackName(user.email)
  const phone = user.user_metadata?.phone ?? null
  const admin = createAdminClient()

  await admin.from('user_profiles').upsert(
    {
      id: user.id,
      role: desiredRole,
      full_name: fullName,
      phone,
    },
    { onConflict: 'id' }
  )

  if (desiredRole === 'parent_user') {
    await admin.from('parents').upsert({ id: user.id }, { onConflict: 'id' })
  }

  return NextResponse.redirect(buildRedirectUrl(next, request))
}
