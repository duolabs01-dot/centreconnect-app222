import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => null)) as { email?: unknown } | null
    const email = typeof payload?.email === 'string' ? normalizeEmail(payload.email) : ''

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .schema('auth')
      .from('users')
      .select('id')
      .ilike('email', email)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[auth/account-exists] Query failed:', error)
      return NextResponse.json({ error: 'Unable to verify account email right now' }, { status: 500 })
    }

    return NextResponse.json({ exists: Boolean(data?.id) })
  } catch (error) {
    console.error('[auth/account-exists] Unexpected error:', error)
    return NextResponse.json({ error: 'Unable to verify account email right now' }, { status: 500 })
  }
}

