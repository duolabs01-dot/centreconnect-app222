import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

type EntityType = 'service_application' | 'centre' | 'subscription' | 'invoice' | 'tenant' | 'bulk' | 'support_ticket'

type WritePlatformActivityInput = {
  actorUserId: string
  actorEmail: string | null
  entityType: EntityType
  entityId?: string | null
  action: string
  summary: string
  details?: Record<string, unknown>
}

export async function writePlatformActivity(
  admin: ReturnType<typeof createAdminClient>,
  input: WritePlatformActivityInput
) {
  const { error } = await admin.from('platform_admin_activity_log').insert({
    actor_user_id: input.actorUserId,
    actor_email: input.actorEmail,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    action: input.action,
    summary: input.summary,
    details: input.details ?? {},
  })

  if (error) {
    console.error('Failed to write platform activity log:', error.message)
  }
}
