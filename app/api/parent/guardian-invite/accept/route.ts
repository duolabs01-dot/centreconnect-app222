import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type GuardianInviteRow = {
  id: string
  child_id: string
  parent_id: string
  linked_user_id: string | null
  invite_token_expires_at: string | null
  children:
    | {
        first_name: string
        last_name: string
        parent_id: string
      }
    | Array<{
        first_name: string
        last_name: string
        parent_id: string
      }>
    | null
}

export async function POST(request: Request) {
  try {
    const { token } = await request.json()
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token is required.' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'You must be signed in to accept an invite.' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: rows } = await admin
      .from('guardians')
      .select('id, child_id, parent_id, linked_user_id, invite_token_expires_at, children(first_name, last_name, parent_id)')
      .eq('invite_token', token)
      .limit(50)

    const guardians = (rows ?? []) as GuardianInviteRow[]
    if (guardians.length === 0) {
      return NextResponse.json({ error: 'This invite link is invalid.' }, { status: 404 })
    }

    if (guardians.some((guardian) => guardian.linked_user_id && guardian.linked_user_id !== user.id)) {
      return NextResponse.json({ error: 'This invite has already been used.' }, { status: 409 })
    }

    const validRows = guardians.filter(
      (guardian) => guardian.invite_token_expires_at && new Date(guardian.invite_token_expires_at) >= new Date()
    )
    if (validRows.length === 0) {
      return NextResponse.json(
        { error: 'This invite link has expired. Ask the main account holder to resend it.' },
        { status: 410 }
      )
    }

    if (
      validRows.some((guardian) => {
        const rawChild = guardian.children
        const child = Array.isArray(rawChild) ? rawChild[0] : rawChild
        return child?.parent_id === user.id || guardian.parent_id === user.id
      })
    ) {
      return NextResponse.json({ error: 'You cannot accept your own invite.' }, { status: 400 })
    }

    const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role && profile.role !== 'parent_user') {
      return NextResponse.json({ error: 'This invite is for parent accounts only.' }, { status: 400 })
    }

    if (!profile?.role) {
      await admin.from('user_profiles').upsert(
        {
          id: user.id,
          role: 'parent_user',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
    }

    await admin.from('parents').upsert(
      {
        id: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

    const rowIds = validRows.map((row) => row.id)
    const { error: linkError } = await admin
      .from('guardians')
      .update({
        linked_user_id: user.id,
        invite_accepted_at: new Date().toISOString(),
        invite_token: null,
        invite_token_expires_at: null,
      })
      .in('id', rowIds)

    if (linkError) {
      return NextResponse.json({ error: 'Failed to link account. Please try again.' }, { status: 500 })
    }

    const linkedChildren = Array.from(
      new Set(
        validRows
          .map((guardian) => {
            const rawChild = guardian.children
            const child = Array.isArray(rawChild) ? rawChild[0] : rawChild
            if (!child) return null
            return `${child.first_name} ${child.last_name}`.trim()
          })
          .filter((name): name is string => Boolean(name))
      )
    )

    return NextResponse.json({
      success: true,
      child_names: linkedChildren,
      linked_count: rowIds.length,
    })
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}

