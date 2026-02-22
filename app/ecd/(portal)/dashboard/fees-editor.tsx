'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ecd/Button'

type FeesEditorProps = {
  centreId: string
  initial: {
    fees_display_mode: 'exact' | 'range' | 'contact' | null
    monthly_fee_min: number | null
    monthly_fee_max: number | null
    registration_fee: number | null
    subsidy_accepted: boolean | null
    fees_notes: string | null
    contact_whatsapp: string | null
    contact_phone: string | null
  }
}

export function FeesEditor({ centreId, initial }: FeesEditorProps) {
  const [mode, setMode] = useState(initial.fees_display_mode ?? 'range')
  const [minFee, setMinFee] = useState(initial.monthly_fee_min?.toString() ?? '')
  const [maxFee, setMaxFee] = useState(initial.monthly_fee_max?.toString() ?? '')
  const [registrationFee, setRegistrationFee] = useState(initial.registration_fee?.toString() ?? '')
  const [subsidyAccepted, setSubsidyAccepted] = useState(Boolean(initial.subsidy_accepted))
  const [notes, setNotes] = useState(initial.fees_notes ?? '')
  const [contactWhatsapp, setContactWhatsapp] = useState(initial.contact_whatsapp ?? '')
  const [contactPhone, setContactPhone] = useState(initial.contact_phone ?? '')
  const [saving, setSaving] = useState(false)

  async function onSave() {
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('ecd_centres')
        .update({
          fees_display_mode: mode,
          monthly_fee_min: minFee ? Number(minFee) : null,
          monthly_fee_max: maxFee ? Number(maxFee) : null,
          registration_fee: registrationFee ? Number(registrationFee) : null,
          subsidy_accepted: subsidyAccepted,
          fees_notes: notes.trim() || null,
          fees_last_updated_at: new Date().toISOString(),
          contact_whatsapp: contactWhatsapp.trim() || null,
          contact_phone: contactPhone.trim() || null,
        })
        .eq('id', centreId)

      if (error) throw error
      toast.success('Fees updated')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update fees')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-sm font-medium text-slate-700">Display mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'exact' | 'range' | 'contact')}
            className="cc-native-field mt-1"
          >
            <option value="exact">Exact</option>
            <option value="range">Range</option>
            <option value="contact">Contact</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Monthly min</label>
          <input
            type="number"
            value={minFee}
            onChange={(e) => setMinFee(e.target.value)}
            className="cc-native-field mt-1"
            placeholder="e.g. 800"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Monthly max</label>
          <input
            type="number"
            value={maxFee}
            onChange={(e) => setMaxFee(e.target.value)}
            className="cc-native-field mt-1"
            placeholder="e.g. 1200"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">Registration fee</label>
          <input
            type="number"
            value={registrationFee}
            onChange={(e) => setRegistrationFee(e.target.value)}
            className="cc-native-field mt-1"
            placeholder="e.g. 500"
          />
        </div>
        <label className="flex h-10 items-center gap-2 self-end rounded-md border border-slate-300 px-3 text-sm">
          <input
            type="checkbox"
            checked={subsidyAccepted}
            onChange={(e) => setSubsidyAccepted(e.target.checked)}
          />
          Subsidy accepted
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">Contact WhatsApp</label>
          <input
            type="text"
            value={contactWhatsapp}
            onChange={(e) => setContactWhatsapp(e.target.value)}
            className="cc-native-field mt-1"
            placeholder="+27..."
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Contact phone</label>
          <input
            type="text"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="cc-native-field mt-1"
            placeholder="+27..."
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="cc-native-field mt-1 min-h-[84px] h-auto py-2"
          placeholder="Any fee notes for parents"
        />
      </div>

      <Button type="button" onClick={onSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save fees'}
      </Button>
    </div>
  )
}
