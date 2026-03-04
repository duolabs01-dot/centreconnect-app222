import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'

const FROM_ADDRESS = 'CentreConnect <hello@centerconnect.co.za>'

async function fetchWelcomePackHtml(appUrl: string) {
  const normalizedAppUrl = appUrl.replace(/\/+$/, '')
  const url = `${normalizedAppUrl}/CentreConnect_Pilot_Welcome_FINAL.html`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Unable to download welcome pack HTML (${response.status})`)
  }

  return response.text()
}

export async function POST(request: Request) {
  let payload: { ecdId?: string; ownerEmail?: string }

  try {
    payload = await request.json()
  } catch (error) {
    console.error('resend-welcome-pack: failed to parse JSON payload', error)
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { ecdId, ownerEmail } = payload ?? {}
  if (!ecdId) {
    return NextResponse.json({ success: false, error: 'ecdId is required' }, { status: 400 })
  }

  if (!ownerEmail) {
    return NextResponse.json({ success: false, error: 'ownerEmail is required' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    console.error('resend-welcome-pack: missing NEXT_PUBLIC_APP_URL')
    return NextResponse.json({ success: false, error: 'Application URL is not configured' }, { status: 500 })
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.error('resend-welcome-pack: missing RESEND_API_KEY')
    return NextResponse.json({ success: false, error: 'Email provider is not configured' }, { status: 500 })
  }

  const supabaseAdmin = createAdminClient()
  const { data: centre, error: centreError } = await supabaseAdmin
    .from('ecd_centres')
    .select('name')
    .eq('id', ecdId)
    .single()

  if (centreError || !centre) {
    console.error('resend-welcome-pack: centre lookup failed', centreError)
    return NextResponse.json({ success: false, error: 'ECD centre not found' }, { status: 404 })
  }

  let html: string
  try {
    html = await fetchWelcomePackHtml(appUrl)
  } catch (error) {
    console.error('resend-welcome-pack: could not download welcome pack', error)
    return NextResponse.json({ success: false, error: 'Unable to load welcome pack content' }, { status: 502 })
  }

  const subject = `You have been invited to ${centre.name}`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: ownerEmail,
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('resend-welcome-pack: resend API error', response.status, errorBody)
      return NextResponse.json({ success: false, error: 'Failed to send welcome pack email' }, { status: 502 })
    }
  } catch (error) {
    console.error('resend-welcome-pack: unable to reach Resend API', error)
    return NextResponse.json({ success: false, error: 'Unable to send welcome pack' }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
