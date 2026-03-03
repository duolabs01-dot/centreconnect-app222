import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type ActivationPayload = {
  active?: boolean
}

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: applicationId } = await context.params
    const body = (await request.json().catch(() => ({}))) as ActivationPayload
    const active = body.active === true

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: application, error: applicationError } = await supabase
      .from('applications')
      .select('id,parent_id,ecd_id,status,application_number,children(first_name,last_name)')
      .eq('id', applicationId)
      .eq('parent_id', user.id)
      .maybeSingle()

    if (applicationError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (application.status !== 'enrolled') {
      return NextResponse.json({ error: 'Pickup codes are only available for enrolled children.' }, { status: 400 })
    }

    if (!active) {
      return NextResponse.json({ ok: true })
    }

    const child = normalizeOne(
      application.children as { first_name: string | null; last_name: string | null } | Array<{ first_name: string | null; last_name: string | null }> | null
    )
    const childName = [child?.first_name, child?.last_name].filter(Boolean).join(' ').trim() || 'a child'
    const admin = createAdminClient()

    const { error: insertError } = await admin.from('ecd_notifications').insert({
      ecd_id: application.ecd_id,
      application_id: application.id,
      title: 'Pickup code activated',
      message: `Parent activated pickup code for ${childName}.`,
      metadata: {
        kind: 'pickup_code_activated',
        application_number: application.application_number,
        child_name: childName,
        activated_by_parent_id: user.id,
      },
    })

    if (insertError) {
      return NextResponse.json({ error: insertError.message || 'Failed to notify centre' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

