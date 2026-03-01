'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export async function saveFeeAgreementAction(formData: FormData) {
  const applicationId = formData.get('applicationId') as string
  const monthlyFeeRand = parseFloat(formData.get('monthlyFee') as string || '0')
  const feeNotes = formData.get('feeNotes') as string
  
  const monthlyFeeCents = Math.round(monthlyFeeRand * 100)

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('applications')
    .update({
      monthly_fee_cents: monthlyFeeCents,
      fee_notes: feeNotes
    })
    .eq('id', applicationId)

  if (error) {
    console.error('Error saving fee agreement:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/ecd/applications/${applicationId}`)
  return { success: true }
}
