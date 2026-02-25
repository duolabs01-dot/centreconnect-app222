'use server'

import { revalidatePath } from 'next/cache'
import { requireEcdPortalSession } from '@/lib/ecd/portal-session'

type ActionResult = { ok: true } | { error: string }

function isEditorRole(role: string) {
  return role === 'ecd_admin' || role === 'ecd_supervisor'
}

export async function upsertMonthlySnapshot(formData: FormData): Promise<ActionResult> {
  const { supabase, ecdId, role } = await requireEcdPortalSession({ cached: false })
  if (!isEditorRole(role)) return { error: 'Unauthorized' }

  const periodMonth = String(formData.get('period_month') ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodMonth)) return { error: 'Invalid period.' }

  const { error } = await supabase.from('ecd_financial_snapshots').upsert(
    {
      ecd_id: ecdId,
      period_month: periodMonth,
      revenue_total: Number(formData.get('revenue_total')) || 0,
      expenses_total: Number(formData.get('expenses_total')) || 0,
      assets_total: Number(formData.get('assets_total')) || 0,
      liabilities_total: Number(formData.get('liabilities_total')) || 0,
      notes: String(formData.get('notes') ?? '').trim() || null,
    },
    { onConflict: 'ecd_id,period_month' }
  )

  if (error) return { error: error.message }
  revalidatePath('/ecd/financials')
  return { ok: true }
}

export async function saveLineItem(formData: FormData): Promise<ActionResult> {
  const { supabase, ecdId, role } = await requireEcdPortalSession({ cached: false })
  if (!isEditorRole(role)) return { error: 'Unauthorized' }

  const periodMonth = String(formData.get('period_month') ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodMonth)) return { error: 'Invalid period.' }

  const type = String(formData.get('type') ?? '').trim()
  if (!['revenue', 'expense', 'asset', 'liability'].includes(type)) return { error: 'Invalid item type.' }

  const { error } = await supabase.from('ecd_financial_line_items').insert({
    ecd_id: ecdId,
    period_month: periodMonth,
    type,
    category: String(formData.get('category') ?? '').trim() || 'General',
    label: String(formData.get('label') ?? '').trim() || 'Item',
    amount: Number(formData.get('amount')) || 0,
    notes: String(formData.get('line_item_notes') ?? '').trim() || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/ecd/financials')
  return { ok: true }
}

export async function deleteLineItem(formData: FormData): Promise<ActionResult> {
  const { supabase, ecdId, role } = await requireEcdPortalSession({ cached: false })
  if (!isEditorRole(role)) return { error: 'Unauthorized' }

  const id = String(formData.get('id') ?? '').trim()
  if (!id) return { error: 'Missing line item id.' }

  const { error } = await supabase.from('ecd_financial_line_items').delete().eq('id', id).eq('ecd_id', ecdId)

  if (error) return { error: error.message }
  revalidatePath('/ecd/financials')
  return { ok: true }
}
