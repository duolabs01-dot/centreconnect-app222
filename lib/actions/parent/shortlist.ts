'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function toggleShortlist(centreId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
    revalidatePath('/parent/shortlist')
    return { saved: false }
  } else {
    await supabase
      .from('parent_shortlists')
      .insert({ parent_id: user.id, centre_id: centreId })
    revalidatePath('/parent/shortlist')
    return { saved: true }
  }
}
