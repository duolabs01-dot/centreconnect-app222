import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type AllowedRole = 'platform_admin' | 'ecd_admin' | 'ecd_staff' | 'ecd_supervisor' | 'parent_user'

function sanitizeRole(role: unknown): AllowedRole {
  if (role === 'platform_admin' || role === 'ecd_admin' || role === 'ecd_staff' || role === 'ecd_supervisor' || role === 'parent_user') {
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

async function verifyWithTokenHash(input: {
  supabase: Awaited<ReturnType<typeof createClient>>
  tokenHash: string
  type: EmailOtpType | null
}) {
  const candidateTypes: EmailOtpType[] = []
  if (input.type) candidateTypes.push(input.type)
  if (!candidateTypes.includes('signup')) candidateTypes.push('signup')

  let lastError: { message: string } | null = null
  for (const otpType of candidateTypes) {
    const { error } = await input.supabase.auth.verifyOtp({
      token_hash: input.tokenHash,
      type: otpType,
    })
    if (!error) return { error: null }
    lastError = error
  }

  return { error: lastError ?? { message: 'Invalid confirmation link' } }
}

async function provisionProfileWithAdmin(input: {
  userId: string
  role: AllowedRole
  fullName: string
  phone: string | null
}) {
  try {
    const admin = createAdminClient()
    const { error: profileError } = await admin.from('user_profiles').upsert(
      {
        id: input.userId,
        role: input.role,
        full_name: input.fullName,
        phone: input.phone,
      },
      { onConflict: 'id' }
    )
    if (profileError) throw profileError

    if (input.role === 'parent_user') {
      const { error: parentError } = await admin.from('parents').upsert({ id: input.userId }, { onConflict: 'id' })
      if (parentError) throw parentError
    }

    return true
  } catch (error) {
    console.error('[auth/confirm] Admin profile provisioning failed:', error)
    return false
  }
}

async function provisionProfileWithUserClient(input: {
  userId: string
  role: AllowedRole
  fullName: string
  phone: string | null
  supabase: Awaited<ReturnType<typeof createClient>>
}) {
  try {
    const { error: profileError } = await input.supabase.from('user_profiles').upsert(
      {
        id: input.userId,
        role: input.role,
        full_name: input.fullName,
        phone: input.phone,
      },
      { onConflict: 'id' }
    )
    if (profileError) throw profileError

    if (input.role === 'parent_user') {
      const { error: parentError } = await input.supabase.from('parents').upsert({ id: input.userId }, { onConflict: 'id' })
      if (parentError) throw parentError
    }
    return true
  } catch (error) {
    console.error('[auth/confirm] Fallback profile provisioning failed:', error)
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
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
      if (codeError && tokenHash) {
        const { error: otpError } = await verifyWithTokenHash({
          supabase,
          tokenHash,
          type,
        })
        error = otpError
      } else if (codeError) {
        error = codeError
      }
    } else if (tokenHash) {
      const { error: otpError } = await verifyWithTokenHash({
        supabase,
        tokenHash,
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
    const userId = user.id

    const provisionedWithAdmin = await provisionProfileWithAdmin({
      userId,
      role: desiredRole,
      fullName,
      phone,
    })
    const provisioned = provisionedWithAdmin
      ? true
      : await provisionProfileWithUserClient({
        userId,
        role: desiredRole,
        fullName,
        phone,
        supabase,
      })

    if (!provisioned) {
      console.warn('[auth/confirm] Profile provisioning deferred until first authenticated request')
    }

    return NextResponse.redirect(buildRedirectUrl(next, request))
  } catch (error) {
    console.error('[auth/confirm] Unexpected confirmation error:', error)
    return NextResponse.redirect(buildRedirectUrl('/login?error=confirmation-failed', request))
  }
}
