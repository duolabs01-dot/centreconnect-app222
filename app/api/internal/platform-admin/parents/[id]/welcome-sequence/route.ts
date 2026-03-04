import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { enqueueParentWelcomeSequence } from '@/lib/notifications/parent-welcome-sequence'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await requirePlatformAdmin(request)
  if (!identity) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: parentId } = await context.params
  if (!parentId) return NextResponse.json({ error: 'Missing parent id' }, { status: 400 })

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('user_profiles')
    .select('id,role,full_name')
    .eq('id', parentId)
    .maybeSingle()

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })
  if (!profile) return NextResponse.json({ error: 'Parent profile not found.' }, { status: 404 })
  if (profile.role !== 'parent_user') {
    return NextResponse.json({ error: 'User is not a parent account.' }, { status: 400 })
  }

  const result = await enqueueParentWelcomeSequence(admin as any, {
    parentId,
    parentName: profile.full_name,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'Failed to ensure welcome sequence.' }, { status: 400 })
  }

  return NextResponse.json({ ok: true, inserted: result.inserted })
}

