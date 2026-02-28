'use client'

import { useState } from 'react'
import { ArrowRight, Bus, CheckCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { submitTransportEnquiryAction } from '@/lib/actions/transport/submit-enquiry'
import { toast } from 'sonner'

export type TransportConfig = {
  offers_transport: boolean
  fee_per_month: number | null
  fee_description: string | null
  coverage_areas: string[] | null
  notes: string | null
}

export function TransportSection({
  centre,
  transport,
}: {
  centre: { id: string; name: string }
  transport: TransportConfig | null
}) {
  if (!transport?.offers_transport) return null

  const currencyLabel =
    transport.fee_per_month !== null
      ? `R${(transport.fee_per_month / 100).toFixed(0)}/month`
      : 'Quote required'

  return (
    <section id="transport" className="mt-10 max-w-4xl px-4 md:px-0">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        {transport.fee_per_month ? (
          <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-6 text-slate-900 shadow-sm">
            <p className="text-3xl font-black text-teal-700">{currencyLabel}</p>
            {transport.fee_description && (
              <p className="mt-1 text-sm text-slate-700">{transport.fee_description}</p>
            )}
            {transport.coverage_areas?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {transport.coverage_areas.map((area) => (
                  <span
                    key={area}
                    className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700"
                  >
                    {area}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 shadow-sm">
            <p className="text-xl font-semibold text-slate-900">
              Transport quotes are calculated per route.
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Submit your pickup location and we'll share a personalised quote within 1-2 business days.
            </p>
          </div>
        )}

        {transport.notes && (
          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-sm text-slate-600">
            {transport.notes}
          </div>
        )}

        <div className="mt-6">
          <TransportEnquiryForm centreId={centre.id} centreName={centre.name} />
        </div>
      </div>
    </section>
  )
}

function TransportEnquiryForm({ centreId, centreName }: { centreId: string; centreName: string }) {
  const [open, setOpen] = useState(false)
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  if (done) {
    return (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          Enquiry sent! We'll share a quote soon.
        </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-teal-700 active:scale-[0.98] shadow-sm"
      >
        <Bus className="h-4 w-4" />
        Request Transport Quote
        <ArrowRight className="h-4 w-4" />
      </button>
    )
  }

  const handleSubmit = async () => {
    if (!address.trim()) {
      toast.error('Please enter your pickup address')
      return
    }
    setLoading(true)
    try {
      const result = await submitTransportEnquiryAction({
        ecd_id: centreId,
        pickup_address: address.trim(),
        notes: notes.trim() || undefined,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Transport enquiry sent!')
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-900">Pickup address *</label>
        <Input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="e.g. 14 Oak Avenue, Sandton"
          className="rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500/20"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-900">Any notes (optional)</label>
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          placeholder="e.g. Morning only, siblings, specific area"
          className="rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500/20"
        />
      </div>

      <p className="text-xs text-slate-500">
        Drop-off: {centreName} (centre address)
      </p>

      <div className="flex flex-col gap-2.5 md:flex-row">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={loading}
          className="flex-1 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-teal-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {loading ? 'Sending...' : 'Send Enquiry'}
        </button>
      </div>
    </div>
  )
}



