'use server'

import { requireEcdPortalSession } from '@/lib/ecd/portal-session'
import { getCurrentQuarterAndYear, logDsdExport } from '@/lib/ecd/dsd-export-log'

/**
 * Called when a Starter-tier user clicks Download PDF or Print.
 * Records one quarterly export so subsequent visits show the "quota used" wall.
 */
export async function recordDsdExportAction(): Promise<void> {
  const { supabase, ecdId } = await requireEcdPortalSession()
  const { quarter, year } = getCurrentQuarterAndYear()
  await logDsdExport(supabase, ecdId, quarter, year)
}
