import 'server-only'

import { createClient } from '@/lib/supabase/server'

const ACTIVE_APPLICATION_STATUSES = ['submitted', 'in_review', 'approved', 'waitlisted'] as const

export async function canShowMultipleApplicationsFlag(
  parentId: string,
  childId: string,
  ecdId: string
): Promise<boolean> {
  const supabase = await createClient()

  const { data: currentApplication } = await supabase
    .from('applications')
    .select('id,share_multiple_flag')
    .eq('parent_id', parentId)
    .eq('child_id', childId)
    .eq('ecd_id', ecdId)
    .maybeSingle()

  if (!currentApplication?.share_multiple_flag) {
    return false
  }

  const { count } = await supabase
    .from('applications')
    .select('*', { count: 'exact', head: true })
    .eq('parent_id', parentId)
    .eq('child_id', childId)
    .in('status', [...ACTIVE_APPLICATION_STATUSES])

  return (count ?? 0) >= 3
}

