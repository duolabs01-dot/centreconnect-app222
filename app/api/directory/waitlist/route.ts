import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { queueEmail } from '@/lib/communications/emails'

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const parentEmail = (payload.email ?? '').trim().toLowerCase()
    const centreSlug = (payload.slug ?? '').trim()
    if (!parentEmail || !centreSlug) {
      return NextResponse.json({ error: 'Missing email or centre slug.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error: insertError } = await admin.from('waitlist_notifications').insert({
      parent_email: parentEmail,
      centre_slug: centreSlug,
    })
    if (insertError) {
      console.error('waitlist notification insert failed:', insertError.message)
      return NextResponse.json({ error: 'Unable to register waitlist request.' }, { status: 500 })
    }

    const adminEmail = process.env.SUPPORT_EMAIL?.trim() || 'admin@centerconnect.co.za'
    const subject = `Waitlist request for ${centreSlug}`
    const body = `A parent (${parentEmail}) asked to be notified when ${centreSlug} opens online applications.`
    await queueEmail(adminEmail, subject, body)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('waitlist notification error:', error)
    return NextResponse.json({ error: 'Unable to register waitlist request.' }, { status: 500 })
  }
}
