import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token is required.' }, { status: 400 })
    }

    // The accepting user must be signed in at this point
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'You must be signed in to accept an invite.' }, { status: 401 })
    }

    // Use admin client to bypass RLS for the lookup + update
    const admin = createAdminClient()

    const { data: guardian } = await admin
      .from('guardians')
      .select('id, child_id, parent_id, linked_user_id, invite_token_expires_at, children(first_name, last_name, parent_id)')
      .eq('invite_token', token)
      .maybeSingle()

    if (!guardian) {
      return NextResponse.json({ error: 'This invite link is invalid.' }, { status: 404 })
    }

    if (guardian.linked_user_id && guardian.linked_user_id !== user.id) {
      return NextResponse.json({ error: 'This invite has already been used.' }, { status: 409 })
    }

    if (guardian.linked_user_id === user.id) {
      // Already linked — idempotent, just redirect
      return NextResponse.json({ success: true, already_linked: true })
    }

    if (!guardian.invite_token_expires_at || new Date(guardian.invite_token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invite link has expired. Ask the main account holder to resend it.' }, { status: 410 })
    }

    // Don't allow the original parent to accept their own invite
    const rawChild = guardian.children
    const child = Array.isArray(rawChild) ? rawChild[0] : rawChild
    if (child?.parent_id === user.id || guardian.parent_id === user.id) {
      return NextResponse.json({ error: 'You cannot accept your own invite.' }, { status: 400 })
    }

    // Ensure the accepting user has a parent_user role
    const { data: profile } = await admin
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role && profile.role !== 'parent_user') {
      return NextResponse.json({ error: 'This invite is for parent accounts only.' }, { status: 400 })
    }

    // If no role set yet, set it to parent_user
    if (!profile?.role) {
      await admin.from('user_profiles').upsert({
        id: user.id,
        role: 'parent_user',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
    }

    // Link the user
    const { error: linkError } = await admin
      .from('guardians')
      .update({
        linked_user_id: user.id,
        invite_accepted_at: new Date().toISOString(),
        invite_token: null, // Consume token so it can't be reused
        invite_token_expires_at: null,
      })
      .eq('id', guardian.id)

    if (linkError) {
      return NextResponse.json({ error: 'Failed to link account. Please try again.' }, { status: 500 })
    }

    const childName = child ? `${child.first_name} ${child.last_name}`.trim() : 'your child'
    return NextResponse.json({ success: true, child_name: childName })
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
