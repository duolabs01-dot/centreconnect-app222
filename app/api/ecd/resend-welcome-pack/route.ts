import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import nodemailer from 'nodemailer'

import { createAdminClient } from '@/lib/supabase/admin'

const OLD_DOMAIN_PATTERN = /centerconnect-app222\.vercel\.app/gi

type Payload = {
  ecdId?: string
  ownerEmail?: string
}

async function fetchWelcomePackHtml(appUrl: string) {
  const normalized = appUrl.replace(/\/+$/, '')
  const htmlPath = path.join(process.cwd(), 'public', 'CentreConnect_Pilot_Welcome_FINAL.html')
  const html = await readFile(htmlPath, 'utf-8')
  return html.replace(OLD_DOMAIN_PATTERN, normalized)
}

export async function POST(request: Request) {
  let payload: Payload
  try {
    payload = await request.json()
  } catch (error) {
    console.error('resend-welcome-pack: unable to parse JSON', error)
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
    console.error('resend-welcome-pack: NEXT_PUBLIC_APP_URL missing')
    return NextResponse.json({ success: false, error: 'Application URL is not configured' }, { status: 500 })
  }

  const smtpHost = process.env.SMTP_HOST
  const smtpPortRaw = process.env.SMTP_PORT
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  const smtpFrom = process.env.SMTP_FROM

  if (!smtpHost || !smtpPortRaw || !smtpUser || !smtpPass || !smtpFrom) {
    console.error('resend-welcome-pack: SMTP configuration missing', {
      smtpHost: Boolean(smtpHost),
      smtpPort: Boolean(smtpPortRaw),
      smtpUser: Boolean(smtpUser),
      smtpPass: Boolean(smtpPass),
      smtpFrom: Boolean(smtpFrom),
    })
    return NextResponse.json({ success: false, error: 'Email provider is not configured' }, { status: 500 })
  }

  const smtpPort = Number(smtpPortRaw)
  if (!Number.isFinite(smtpPort) || smtpPort <= 0) {
    console.error('resend-welcome-pack: invalid SMTP_PORT', smtpPortRaw)
    return NextResponse.json({ success: false, error: 'Invalid SMTP port configured' }, { status: 500 })
  }

  const admin = createAdminClient()
  const { data: centre, error: centreError } = await admin
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
    console.error('resend-welcome-pack: failed to read welcome pack', error)
    return NextResponse.json({ success: false, error: 'Unable to load welcome pack content' }, { status: 502 })
  }

  const subject = `Welcome to CentreConnect Pilot — ${centre.name ?? 'CentreConnect'}`

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })

    await transporter.sendMail({
      from: smtpFrom,
      to: ownerEmail,
      subject,
      html,
    })
  } catch (error) {
    console.error('resend-welcome-pack: SMTP send failed', error)
    return NextResponse.json({ success: false, error: 'Unable to send welcome pack email' }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
