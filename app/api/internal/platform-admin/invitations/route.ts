import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeInviteLog } from '@/lib/admin/invite-logs'

const inviteSchema = z.object({
  ecdId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['ecd_admin', 'ecd_staff']).default('ecd_admin'),
  fullName: z.string().min(2).max(160).optional(),
  redirectTo: z.string().url().optional(),
})

function fallbackFullName(email: string): string {
  const base = email.split('@')[0] || 'ECD Admin'
  return base.replace(/[._-]+/g, ' ').trim() || 'ECD Admin'
}

export async function POST(request: Request) {
  const platformAdmin = await requirePlatformAdmin(request)
  if (!platformAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const payload = await request.json().catch(() => null)
  const parsed = inviteSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const adminClient = createAdminClient()
  const data = parsed.data
  const normalizedEmail = data.email.trim().toLowerCase()

  const { data: centre, error: centreError } = await adminClient
    .from('ecd_centres')
    .select('id,name')
    .eq('id', data.ecdId)
    .maybeSingle()

  if (centreError) {
    return NextResponse.json({ error: centreError.message }, { status: 400 })
  }

  if (!centre) {
    return NextResponse.json({ error: 'ECD centre not found' }, { status: 404 })
  }

  const redirectTo = data.redirectTo ?? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/login`
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    normalizedEmail,
    {
      redirectTo: redirectTo || undefined,
      data: {
        role: data.role,
        ecd_id: data.ecdId,
      },
    }
  )

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 400 })
  }

  const invitedUserId = inviteData.user?.id ?? null
  const fullName = data.fullName ?? fallbackFullName(normalizedEmail)

  if (invitedUserId) {
    const { error: profileError } = await adminClient.from('user_profiles').upsert(
      {
        id: invitedUserId,
        role: data.role,
        full_name: fullName,
      },
      { onConflict: 'id' }
    )
    if (profileError) {
      return NextResponse.json({ error: `Failed to create profile: ${profileError.message}` }, { status: 500 })
    }

    const { error: adminLinkError } = await adminClient.from('ecd_admins').upsert(
      {
        ecd_id: data.ecdId,
        user_id: invitedUserId,
        role: data.role,
        invited_by: platformAdmin.userId,
        invited_at: new Date().toISOString(),
      },
      { onConflict: 'ecd_id,user_id' }
    )
    if (adminLinkError) {
      return NextResponse.json(
        { error: `Failed to link admin to centre: ${adminLinkError.message}` },
        { status: 500 }
      )
    }
  }

  const { error: invitationLogError } = await adminClient.from('ecd_admin_invitations').upsert(
    {
      ecd_id: data.ecdId,
      email: normalizedEmail,
      role: data.role,
      invited_by: platformAdmin.userId,
      auth_user_id: invitedUserId,
      invited_at: new Date().toISOString(),
    },
    { onConflict: 'ecd_id,email' }
  )
  if (invitationLogError) {
    return NextResponse.json(
      { error: `Failed to record invitation: ${invitationLogError.message}` },
      { status: 500 }
    )
  }

  await writeInviteLog(adminClient, {
    centreId: data.ecdId,
    ownerEmail: normalizedEmail,
    inviteType: 'email',
    status: 'sent',
    notes: `ECD access invite (${data.role})`,
  })

  return NextResponse.json({
    invitedEmail: normalizedEmail,
    role: data.role,
    ecdId: data.ecdId,
    userId: invitedUserId,
  })
}
