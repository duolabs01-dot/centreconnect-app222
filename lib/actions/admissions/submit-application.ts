'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  ecd_id: z.string().uuid(),
  child_id: z.string().uuid(),
  share_multiple_flag: z.boolean().default(false),
  parent_message: z.string().max(1000).optional(),
  access_token: z.string().min(16).optional(),
})

function createApplicationNumber() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const nonce = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()
  return `APP-${y}${m}${d}-${nonce}`
}

export async function submitApplicationAction(input: unknown) {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid application data' }
  }

  const supabase = await createClient()

  const [{ data: userData }, { data: sessionData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ])
  let user = userData.user ?? sessionData.session?.user ?? null

  if (!user && parsed.data.access_token) {
    const { data: tokenUserData } = await supabase.auth.getUser(parsed.data.access_token)
    user = tokenUserData.user ?? null
  }

  if (!user) {
    return { error: 'Please log in to apply' }
  }

  const hasSessionContext = Boolean(userData.user || sessionData.session?.user)
  const usingTokenScopedClient = !hasSessionContext && Boolean(parsed.data.access_token)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (usingTokenScopedClient && (!supabaseUrl || !supabaseAnonKey)) {
    return { error: 'Server configuration error. Please contact support.' }
  }

  const db = usingTokenScopedClient
    ? createSupabaseClient(supabaseUrl as string, supabaseAnonKey as string, {
        global: {
          headers: {
            Authorization: `Bearer ${parsed.data.access_token}`,
          },
        },
      })
    : supabase

  const { data: child } = await db
    .from('children')
    .select('id,parent_id')
    .eq('id', parsed.data.child_id)
    .eq('parent_id', user.id)
    .maybeSingle()

  if (!child) {
    return { error: 'Child not found' }
  }

  const { data: duplicate } = await db
    .from('applications')
    .select('id,status')
    .eq('parent_id', user.id)
    .eq('child_id', parsed.data.child_id)
    .eq('ecd_id', parsed.data.ecd_id)
    .not('status', 'in', '(withdrawn,rejected)')
    .limit(1)
    .maybeSingle()

  if (duplicate?.id) {
    return { error: 'An active application already exists for this child at this centre' }
  }

  let applicationId: string | null = null
  let insertError: { code?: string; message?: string } | null = null

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await db
      .from('applications')
      .insert({
        application_number: createApplicationNumber(),
        ecd_id: parsed.data.ecd_id,
        parent_id: user.id,
        child_id: parsed.data.child_id,
        status: 'submitted',
        share_multiple_flag: parsed.data.share_multiple_flag,
        parent_message: parsed.data.parent_message ?? null,
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (!error) {
      applicationId = data?.id ?? null
      insertError = null
      break
    }

    insertError = error
    if (error.code !== '23505') {
      break
    }
  }

  if (insertError) {
    console.error('submitApplicationAction failed:', insertError)
    if (insertError.message?.includes('infinite recursion')) {
      return { error: 'Server configuration error. Please contact support.' }
    }
    if (insertError.message?.toLowerCase().includes('row-level security')) {
      return { error: 'Your session expired. Please sign in again and retry.' }
    }
    return { error: 'Could not submit application. Please try again.' }
  }

  return { success: true, applicationId }
}
