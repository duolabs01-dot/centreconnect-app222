'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import {
  sendEcdInAppAndEmailNotification,
  sendParentInAppAndWhatsappNotification,
} from '@/lib/notifications/multi-channel'

const publishAnnouncementSchema = z.object({
  ecdId: z.string().uuid(),
  title: z.string().min(3),
  body: z.string().min(10),
  audience: z.enum(['all', 'class', 'individual']),
  template_type: z.string().nullable().optional(),
  postToPublicPage: z.boolean().default(true),
  sendNotifications: z.boolean().default(true),
})

export type PublishAnnouncementInput = z.infer<typeof publishAnnouncementSchema>

export async function publishAnnouncementAction(input: PublishAnnouncementInput) {
  const parsed = publishAnnouncementSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' as const }

  try {
    const session = await requireEcdPortalSession({ cached: false })
    if (session.ecdId !== parsed.data.ecdId) return { error: 'Unauthorized' as const }

    const { ecdId, title, body, audience, template_type, sendNotifications } = parsed.data
    if (audience === 'individual' || audience === 'class') {
      return { error: 'Individual or class audience needs recipient targeting. Use Messages for targeted sends.' as const }
    }

    const { data: announcement, error: insertError } = await session.supabase
      .from('announcements')
      .insert({
        ecd_id: ecdId,
        title,
        content: body,
        body,
        audience,
        template_type: template_type ?? null,
        is_published: true,
        published_at: new Date().toISOString(),
        created_by: session.user.id,
        author_id: session.user.id,
      })
      .select('id')
      .single()

    if (insertError || !announcement) {
      return { error: insertError?.message ?? 'Failed to create announcement' as const }
    }

    const { data: eligibleApps } = await session.supabase
      .from('applications')
      .select('parent_id')
      .eq('ecd_id', ecdId)
      .in('status', ['approved', 'enrolled'])

    const parentIds = Array.from(new Set((eligibleApps ?? []).map((row: any) => row.parent_id).filter(Boolean)))
    const { data: centre } = await session.supabase
      .from('ecd_centres')
      .select('slug,name,email')
      .eq('id', ecdId)
      .maybeSingle()
    const centreName = centre?.name?.trim() || 'your creche'

    if (sendNotifications && parentIds.length > 0) {
      const { data: parentContactsRaw } = await session.supabase
        .from('parents')
        .select('id,alt_phone,user_profiles(phone)')
        .in('id', parentIds)

      const parentPhoneById = new Map<string, string | null>()
      for (const row of (parentContactsRaw ?? []) as Array<{
        id: string
        alt_phone: string | null
        user_profiles: { phone: string | null } | { phone: string | null }[] | null
      }>) {
        const profileRaw = row.user_profiles
        const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw
        parentPhoneById.set(row.id, profile?.phone ?? row.alt_phone ?? null)
      }

      const announcementMessage = body.length > 240 ? `${body.slice(0, 237)}...` : body
      await Promise.all(
        parentIds.map((parentId) =>
          sendParentInAppAndWhatsappNotification(session.supabase as any, {
            parent_id: parentId,
            ecd_id: ecdId,
            application_id: null,
            template_key: template_type ?? 'announcement',
            title,
            message: announcementMessage,
            parent_phone: parentPhoneById.get(parentId) ?? null,
            is_read: false,
          })
        )
      )

      await sendEcdInAppAndEmailNotification(session.supabase as any, {
        ecd_id: ecdId,
        title: 'Announcement published',
        message: `"${title}" was published to ${parentIds.length} families.`,
        metadata: {
          kind: 'announcement_published',
          announcement_id: announcement.id,
          recipient_count: parentIds.length,
        },
        email_recipient: centre?.email ?? null,
        email_subject: `[CentreConnect] Announcement published: ${title}`,
        email_body: `<p>Your announcement <strong>${title}</strong> was published to ${parentIds.length} families at ${centreName}.</p>`,
        is_read: false,
      })
    }

    revalidatePath('/ecd/announcements')
    revalidatePath('/parent/notifications')
    if (centre?.slug) {
      revalidatePath(`/centre/${centre.slug}`)
      revalidatePath(`/c/${centre.slug}`)
    }

    return {
      success: true as const,
      announcementId: announcement.id as string,
      recipientCount: parentIds.length,
    }
  } catch (err) {
    console.error('publishAnnouncementAction failed:', err)
    return { error: 'An unexpected error occurred while publishing. Please try again.' as const }
  }
}

