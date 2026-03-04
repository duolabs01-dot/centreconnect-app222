import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { APP_URL, SUPPORT_EMAIL } from '@/lib/config'
import { queueEmail } from '@/lib/communications/emails'
import { renderPilotWelcomePackEmail } from '@/lib/email/templates/pilot-welcome-pack'
import { writeInviteLog } from '@/lib/admin/invite-logs'

export async function POST(
  request: Request,
  context: { params: { id?: string } }
) {
  const identity = await requirePlatformAdmin(request)
  if (!identity) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const centreId = context.params.id
  if (!centreId) {
    return NextResponse.json({ error: 'Missing centre id' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: centre, error: centreError } = await admin
    .from('ecd_centres')
    .select('id,name,email,primary_contact_name,contact_phone,phone,slug')
    .eq('id', centreId)
    .maybeSingle()

  if (centreError) {
    return NextResponse.json({ error: centreError.message }, { status: 400 })
  }

  if (!centre) {
    return NextResponse.json({ error: 'Centre not found' }, { status: 404 })
  }

  const ownerEmail = (centre.email ?? '').trim().toLowerCase()
  if (!ownerEmail) {
    return NextResponse.json({ error: 'Centre owner email missing' }, { status: 400 })
  }

  const appUrlRoot = APP_URL.replace(/\/$/, '')
  const emailHtml = await renderPilotWelcomePackEmail({
    centreName: centre.name ?? 'your centre',
    contactName: centre.primary_contact_name ?? 'Centre owner',
    dashboardLink: `${appUrlRoot}/ecd/dashboard`,
    websiteBuilderLink: `${appUrlRoot}/ecd/website`,
    attendanceLink: `${appUrlRoot}/ecd/attendance`,
    pickupLink: `${appUrlRoot}/ecd/pickup`,
    qrPosterLink: `${appUrlRoot}/ecd/pickup`,
    supportWhatsApp: process.env.SUPPORT_WHATSAPP ?? '+27685356430',
    supportEmail: SUPPORT_EMAIL,
    supportLink: `${appUrlRoot}/ecd/support`,
  })

  const emailResult = await queueEmail(
    ownerEmail,
    `Pilot Welcome Pack | ${centre.name ?? 'CentreConnect'}`,
    emailHtml
  )

  if (!emailResult.success) {
    return NextResponse.json({ error: emailResult.error ?? 'Failed to queue welcome pack email.' }, { status: 500 })
  }

  await writeInviteLog(admin, {
    centreId: centre.id,
    ownerEmail,
    ownerPhone: centre.contact_phone ?? centre.phone ?? null,
    inviteType: 'welcome_pack',
    status: 'sent',
    notes: 'Re-sent welcome pack from admin workspace.',
  })

  return NextResponse.json({ ok: true })
}
