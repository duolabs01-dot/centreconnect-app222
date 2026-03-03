'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { saveFeeAgreementAction } from './fee-actions'
import { toast } from 'sonner'

type FeeAgreementCardProps = {
  applicationId: string
  initialMonthlyFeeCents: number
  initialFeeNotes: string | null
}

export function FeeAgreementCard({
  applicationId,
  initialMonthlyFeeCents,
  initialFeeNotes
}: FeeAgreementCardProps) {
  const [isSaving, setIsSaving] = useState(false)
  const initialMonthlyFeeRand = initialMonthlyFeeCents / 100

  async function handleSubmit(formData: FormData) {
    setIsSaving(true)
    const result = await saveFeeAgreementAction(formData)
    setIsSaving(false)
    
    if (result.success) {
      toast.success('Fee agreement saved')
    } else {
      toast.error('Failed to save fee agreement')
    }
  }

  return (
    <Card className="border-cyan-100 bg-cyan-50/20">
      <CardHeader>
        <CardTitle className="text-base font-bold text-cyan-900">Fee Agreement</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="applicationId" value={applicationId} />
          
          <div className="space-y-1.5">
            <label htmlFor="monthlyFee" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Monthly Fee (R)
            </label>
            <Input
              id="monthlyFee"
              name="monthlyFee"
              type="number"
              step="0.01"
              defaultValue={initialMonthlyFeeRand}
              className="h-11 rounded-xl bg-white"
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="feeNotes" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Fee Notes
            </label>
            <Textarea
              id="feeNotes"
              name="feeNotes"
              defaultValue={initialFeeNotes || ''}
              className="min-h-[80px] rounded-xl bg-white py-3 leading-relaxed"
              placeholder="e.g. Includes transport, sibling discount..."
            />
          </div>

          <Button 
            type="submit" 
            disabled={isSaving}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold h-11 rounded-2xl shadow-sm transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Fee Agreement'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
