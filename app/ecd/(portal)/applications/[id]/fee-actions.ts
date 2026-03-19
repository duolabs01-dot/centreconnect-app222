'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

function normalizeText(value: FormDataEntryValue | string | null | undefined) {
  const text = String(value ?? '').trim()
  return text.length > 0 ? text : null
}

function mergeAdminNotes(existingNotes: string | null | undefined, feeNote: string | null) {
  const lines = String(existingNotes ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('Fee note: '))

  if (feeNote) {
    lines.push(`Fee note: ${feeNote}`)
  }

  return lines.length > 0 ? lines.join('\n') : null
}

export async function saveFeeAgreementAction(formData: FormData) {
  const applicationId = String(formData.get('applicationId') ?? '').trim()
  const monthlyFeeRand = parseFloat(String(formData.get('monthlyFee') ?? '0'))
  const feeNotes = normalizeText(formData.get('feeNotes'))

  if (!applicationId) {
    return { success: false, error: 'Application is required.' }
  }

  const monthlyFeeCents = Math.round((Number.isFinite(monthlyFeeRand) ? monthlyFeeRand : 0) * 100)

  const supabase = createAdminClient()
  const { data: application, error: applicationError } = await supabase
    .from('applications')
    .select('admin_notes')
    .eq('id', applicationId)
    .maybeSingle()

  if (applicationError) {
    console.error('Error loading fee agreement context:', applicationError)
    return { success: false, error: applicationError.message }
  }

  const { error } = await supabase
    .from('applications')
    .update({
      monthly_fee_cents: monthlyFeeCents,
      admin_notes: mergeAdminNotes(application?.admin_notes ?? null, feeNotes),
    })
    .eq('id', applicationId)

  if (error) {
    console.error('Error saving fee agreement:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/ecd/applications/${applicationId}`)
  return { success: true }
}
