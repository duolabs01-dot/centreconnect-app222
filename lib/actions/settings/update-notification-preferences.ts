'use server'

import { z } from 'zod'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

const updateNotificationPreferencesSchema = z.object({
  userId: z.string().uuid(),
  email_announcements: z.boolean(),
  email_applications: z.boolean(),
  email_job_applications: z.boolean(),
  push_announcements: z.boolean(),
  push_applications: z.boolean(),
  push_pickup: z.boolean(),
  digest_frequency: z.enum(['realtime', 'daily', 'weekly', 'off']),
})

export async function updateNotificationPreferencesAction(input: unknown) {
  const parsed = updateNotificationPreferencesSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid data' as const }

  const session = await requireEcdPortalSession({ cached: false })
  if (session.user.id !== parsed.data.userId) return { error: 'Unauthorized' as const }

  const { error } = await session.supabase.from('notification_preferences').upsert({
    user_id: parsed.data.userId,
    email_announcements: parsed.data.email_announcements,
    email_applications: parsed.data.email_applications,
    email_job_applications: parsed.data.email_job_applications,
    push_announcements: parsed.data.push_announcements,
    push_applications: parsed.data.push_applications,
    push_pickup: parsed.data.push_pickup,
    digest_frequency: parsed.data.digest_frequency,
    updated_at: new Date().toISOString(),
  })

  if (error) return { error: error.message }
  return { success: true as const }
}
