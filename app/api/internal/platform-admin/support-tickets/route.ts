import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server' // Import for user session

export async function POST(req: Request) {
  const supabaseAdmin = createAdminClient()
  const supabase = await createClient() // For accessing user session

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabaseAdmin.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { subject, priority, ecdId, description } = await req.json()

    if (!subject || !priority || !ecdId || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Generate ticket_number - a simple timestamp based one for now
    const ticket_number = `TICKET-${Date.now()}`

    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        ticket_number,
        subject,
        priority,
        ecd_id: ecdId,
        description,
        status: 'open', // Default status
        created_by: user.id, // Use the authenticated user's ID
      })
      .select()

    if (error) {
      console.error('Error creating support ticket:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Support ticket created successfully', ticket: data[0] }, { status: 201 })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
