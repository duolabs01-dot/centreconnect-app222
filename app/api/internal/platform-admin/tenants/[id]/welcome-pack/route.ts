import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { APP_URL } from '@/lib/config'
import { writeInviteLog } from '@/lib/admin/invite-logs'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const identity = await requirePlatformAdmin(request)
  if (!identity) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: centreId } = await context.params
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
  const welcomePackEndpoint = new URL('/api/ecd/resend-welcome-pack', `${appUrlRoot}/`)
  try {
    const welcomeResponse = await fetch(welcomePackEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ecdId: centre.id,
        ownerEmail,
      }),
    })

    if (!welcomeResponse.ok) {
      const errorText = (await welcomeResponse.text().catch(() => '')).trim()
      return NextResponse.json(
        {
          error:
            errorText.length > 0
              ? `Failed to send welcome pack (${welcomeResponse.status}): ${errorText}`
              : `Failed to send welcome pack (${welcomeResponse.status})`,
        },
        { status: 502 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send welcome pack email.' },
      { status: 502 }
    )
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
