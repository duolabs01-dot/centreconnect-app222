import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { writePlatformActivity } from '@/lib/admin/activity-log'
import { sendPlatformAdminActionNotification } from '@/lib/email/platform-admin-action-notification'

async function gatherAssignedUserIds(admin: ReturnType<typeof createAdminClient>, centreId: string) {
  const [membersResult, invitationsResult] = await Promise.all([
    admin
      .from('ecd_admins')
      .select('user_id')
      .eq('ecd_id', centreId),
    admin
      .from('ecd_admin_invitations')
      .select('auth_user_id')
      .eq('ecd_id', centreId),
  ])

  const userIds = new Set<string>()
  for (const member of membersResult.data ?? []) {
    if (member.user_id) userIds.add(member.user_id)
  }
  for (const invite of invitationsResult.data ?? []) {
    if (invite.auth_user_id) userIds.add(invite.auth_user_id)
  }
  return userIds
}

async function deleteAuthUsers(admin: ReturnType<typeof createAdminClient>, userIds: string[]) {
  await Promise.allSettled(
    userIds.map((userId) => admin.auth.admin.deleteUser(userId))
  )
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const platformAdmin = await requirePlatformAdmin(request)
  if (!platformAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: centreId } = await context.params
  if (!centreId) {
    return NextResponse.json({ error: 'Missing centre id' }, { status: 400 })
  }

  const admin = createAdminClient()
  const [centreResult, assignedUsers] = await Promise.all([
    admin
      .from('ecd_centres')
      .select('id,name,slug,owner_id,contact_phone,contact_whatsapp,phone')
      .eq('id', centreId)
      .maybeSingle(),
    gatherAssignedUserIds(admin, centreId),
  ])

  if (centreResult.error) {
    return NextResponse.json({ error: centreResult.error.message }, { status: 400 })
  }
  const centre = centreResult.data
  if (!centre) {
    return NextResponse.json({ error: 'Centre not found' }, { status: 404 })
  }

  const assignedUserIds = Array.from(assignedUsers)
  if (assignedUserIds.length > 0) {
    await deleteAuthUsers(admin, assignedUserIds)
    await admin.from('user_profiles').delete().in('id', assignedUserIds)
  }

  await admin.from('ecd_admin_invitations').delete().eq('ecd_id', centreId)
  await admin.from('ecd_admins').delete().eq('ecd_id', centreId)
  await admin.from('subscriptions').delete().eq('ecd_id', centreId)

  const contactNumber = (centre.contact_whatsapp || centre.contact_phone || centre.phone || '').trim()
  const whatsappNumber = contactNumber || null
  const warmStarter = whatsappNumber
    ? `Hi ${centre.name ?? 'team'}, I'm checking in about your centre and would love a quick WhatsApp at ${whatsappNumber}.`
    : 'Hi! I am interested in reconnecting with your centre. Please drop a quick message through CentreConnect.'
  const tagline = whatsappNumber
    ? `Paused: WhatsApp ${whatsappNumber} to start a warm chat.`
    : 'Paused: Reach out to renew the listing.'
  const description = whatsappNumber
    ? `This centre is taking a temporary break. WhatsApp them at ${whatsappNumber} to keep the conversation going.`
    : 'This centre is taking a temporary break. Leave a message through CentreConnect to stay updated.'

  const { error: centreUpdateError } = await admin
    .from('ecd_centres')
    .update({
      owner_id: null,
      tagline,
      description,
      is_active: true,
      is_registered: false,
      contract_signed: false,
      onboarding_fee_paid: false,
      logo_url: null,
      cover_image_url: null,
      fees_display_mode: 'contact',
      monthly_fee_min: null,
      monthly_fee_max: null,
      subsidy_accepted: false,
      communication_automation_settings: {
        directory_status: 'paused',
        directory_whatsapp_number: whatsappNumber,
        directory_whatsapp_message: warmStarter,
      },
    })
    .eq('id', centreId)

  if (centreUpdateError) {
    return NextResponse.json({ error: centreUpdateError.message }, { status: 500 })
  }

  await writePlatformActivity(admin, {
    actorUserId: platformAdmin.userId,
    actorEmail: platformAdmin.email,
    entityType: 'tenant',
    entityId: centreId,
    action: 'disconnect_tenant',
    summary: 'Reset tenant into paused directory state',
    details: {
      previousOwner: centre.owner_id ?? 'none',
      purgedUsers: assignedUserIds.length,
      whatsapp: whatsappNumber ?? 'not provided',
    },
  })

  void sendPlatformAdminActionNotification({
    subject: 'Tenant Set to Directory Mode',
    heading: 'An ECD tenant was reset to a paused directory listing.',
    lines: [
      `Centre: ${centre.name ?? 'Unknown centre'}`,
      `Slug: ${centre.slug ?? '-'}`,
      `Centre ID: ${centre.id}`,
      `Actor: ${platformAdmin.email ?? 'platform-admin'}`,
      `WhatsApp: ${whatsappNumber ?? 'Unavailable'}`,
    ],
    details: {
      action: 'disconnect_tenant',
      purgedUsers: assignedUserIds.length,
      directoryStatus: 'paused',
    },
  })

  return NextResponse.json({
    ok: true,
    disconnected: true,
    whatsappContact: whatsappNumber,
    warmMessage: warmStarter,
  })
}
