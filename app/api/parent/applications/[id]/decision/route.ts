import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { acceptOffer } from '@/lib/actions/admissions/accept-offer'

type DecisionAction = 'accept' | 'decline' | 'withdraw'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  const { id: applicationId } = await context.params
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action } = (await request.json()) as { action?: DecisionAction }
    if (action !== 'accept' && action !== 'decline' && action !== 'withdraw') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { data: targetApp, error: targetError } = await supabase
      .from('applications')
      .select('id,parent_id,child_id,status')
      .eq('id', applicationId)
      .eq('parent_id', user.id)
      .maybeSingle()

    if (targetError || !targetApp) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (action === 'accept') {
      const result = await acceptOffer(applicationId)
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
    } else if (action === 'decline') {
      const { error } = await supabase.rpc('parent_decline_offer', { p_application_id: applicationId })
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    } else {
      if (!['submitted', 'in_review', 'waitlisted', 'approved'].includes(targetApp.status)) {
        return NextResponse.json({ error: 'Application cannot be withdrawn in its current status' }, { status: 400 })
      }

      const now = new Date().toISOString()
      const { error } = await supabase
        .from('applications')
        .update({
          status: 'withdrawn',
          withdrawn_at: now,
          withdraw_reason: 'parent_manual',
        })
        .eq('id', applicationId)
        .eq('parent_id', user.id)

      if (error) {
        return NextResponse.json({ error: error.message || 'Failed to withdraw application' }, { status: 400 })
      }
    }

    if (action === 'accept') {
      const { count } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('parent_id', user.id)
        .eq('child_id', targetApp.child_id)
        .eq('status', 'withdrawn')
        .eq('withdraw_reason', 'auto_after_accept')

      return NextResponse.json({ ok: true, withdrawnCount: count ?? 0 })
    }

    return NextResponse.json({ ok: true, withdrawnCount: 0 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
