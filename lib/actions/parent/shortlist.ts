'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getParentShortlistSummary } from '@/lib/parent/shortlist-data'

export async function toggleShortlist(centreId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: existing } = await supabase
    .from('parent_shortlists')
    .select('id')
    .eq('parent_id', user.id)
    .eq('centre_id', centreId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('parent_shortlists')
      .delete()
      .eq('parent_id', user.id)
      .eq('centre_id', centreId)

    const summary = await getParentShortlistSummary(supabase, user.id)
    revalidatePath('/parent/shortlist')
    revalidatePath('/parent/compare')
    revalidatePath('/directory')
    revalidatePath('/parent/discover')

    return { saved: false, savedCount: summary.savedCount }
  }

  await supabase.from('parent_shortlists').insert({ parent_id: user.id, centre_id: centreId })

  const summary = await getParentShortlistSummary(supabase, user.id)
  revalidatePath('/parent/shortlist')
  revalidatePath('/parent/compare')
  revalidatePath('/directory')
  revalidatePath('/parent/discover')

  return { saved: true, savedCount: summary.savedCount }
}
