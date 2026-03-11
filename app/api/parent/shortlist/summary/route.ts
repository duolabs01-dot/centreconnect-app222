import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { getParentShortlistSummary } from '@/lib/parent/shortlist-data'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ savedCount: 0, centreIds: [] })
  }

  const summary = await getParentShortlistSummary(supabase, user.id)

  return NextResponse.json({
    savedCount: summary.savedCount,
    centreIds: Array.from(summary.savedCentreIds),
  })
}
