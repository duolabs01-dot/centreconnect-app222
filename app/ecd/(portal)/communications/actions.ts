'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

export async function markEcdNotificationsReadAction() {
  const { ecdId } = await requireEcdPortalSession({ cached: false })
  const admin = createAdminClient()

  await admin
    .from('ecd_notifications')
    .update({ is_read: true })
    .eq('ecd_id', ecdId)
    .eq('is_read', false)

  revalidatePath('/ecd/communications')
  revalidatePath('/ecd/dashboard')
}
