import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { queueEmail } from '@/lib/communications/emails'

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const centreSlug = (payload.centre_slug ?? '').trim()
    const centreName = (payload.centre_name ?? centreSlug).trim()
    const contactName = (payload.contact_name ?? '').trim()
    const role = (payload.role ?? '').trim()
    const phone = (payload.phone ?? '').trim()
    const email = (payload.email ?? '').trim().toLowerCase()

    if (!centreSlug || !contactName || !role || !phone || !email) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error: insertError } = await admin.from('claim_requests').insert({
      centre_slug: centreSlug,
      contact_name: contactName,
      role,
      phone,
      email,
    })

    if (insertError) {
      console.error('claim request insert error:', insertError.message)
      return NextResponse.json({ error: 'Unable to register claim request.' }, { status: 500 })
    }

    const adminEmail = process.env.SUPPORT_EMAIL?.trim() || 'admin@centerconnect.co.za'
    const subject = `Claim request for ${centreName}`
    const body = `Centre: ${centreName} (${centreSlug})\nContact: ${contactName}\nRole: ${role}\nPhone: ${phone}\nEmail: ${email}\n\nPlease review the request.`
    await queueEmail(adminEmail, subject, body)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('claim request error', error)
    return NextResponse.json({ error: 'Unable to register claim request.' }, { status: 500 })
  }
}
