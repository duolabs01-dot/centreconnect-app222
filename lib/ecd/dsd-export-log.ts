import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export function getCurrentQuarterAndYear(): { quarter: number; year: number; label: string } {
  const now = new Date()
  const month = now.getMonth() // 0–11
  const year = now.getFullYear()
  const quarter = Math.ceil((month + 1) / 3) // 1–4
  return { quarter, year, label: `Q${quarter} ${year}` }
}

/**
 * Returns true if the centre has already used their free quarterly export.
 * Uses ON CONFLICT DO NOTHING insert pattern so the check is race-safe.
 */
export async function checkDsdExportUsed(
  supabase: SupabaseClient,
  ecdId: string,
  quarter: number,
  year: number,
): Promise<boolean> {
  const { data } = await supabase
    .from('dsd_export_log')
    .select('id')
    .eq('ecd_id', ecdId)
    .eq('quarter', quarter)
    .eq('year', year)
    .maybeSingle()

  return Boolean(data)
}

/**
 * Records one quarterly export for this centre.
 * If already logged this quarter, does nothing (UNIQUE constraint).
 */
export async function logDsdExport(
  supabase: SupabaseClient,
  ecdId: string,
  quarter: number,
  year: number,
): Promise<void> {
  await supabase
    .from('dsd_export_log')
    .upsert(
      { ecd_id: ecdId, quarter, year },
      { onConflict: 'ecd_id,quarter,year', ignoreDuplicates: true },
    )
}
