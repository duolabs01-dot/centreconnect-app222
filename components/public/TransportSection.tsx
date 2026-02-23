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
      <div className="glass-card rounded-2xl border border-white/10 p-6">
        {transport.fee_per_month ? (
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-50/90 to-emerald-50/90 p-6 text-slate-900 shadow-[var(--shadow-elevation-3)] shadow-cyan-900/20">
            <p className="text-3xl font-black text-cyan-700">{currencyLabel}</p>
            {transport.fee_description && (
              <p className="mt-1 text-sm text-slate-700">{transport.fee_description}</p>
            )}
            {transport.coverage_areas?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {transport.coverage_areas.map((area) => (
                  <span
                    key={area}
                    className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300"
                  >
                    {area}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 text-white shadow-[var(--shadow-elevation-4)]">
            <p className="text-xl font-semibold text-white">
              Transport quotes are calculated per route.
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Submit your pickup location and weÃ¢â‚¬â„¢ll share a personalised quote within 1Ã¢â‚¬â€œ2 business days.
            </p>
          </div>
        )}

        {transport.notes && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
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
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle className="h-4 w-4 text-emerald-500" />
          Enquiry sent! WeÃ¢â‚¬â„¢ll share a quote soon.
        </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-cyan-500 active:scale-[0.98]"
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
        <label className="text-sm font-semibold text-white">Pickup address *</label>
        <Input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="e.g. 14 Oak Avenue, Sandton"
          className="rounded-xl border-slate-700 bg-slate-900/80 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-white">Any notes (optional)</label>
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          placeholder="e.g. Morning only, siblings, specific area"
          className="rounded-xl border-slate-700 bg-slate-900/80 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
        />
      </div>

      <p className="text-xs text-white/60">
        Drop-off: {centreName} (centre address)
      </p>

      <div className="flex flex-col gap-2.5 md:flex-row">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={loading}
          className="flex-1 rounded-xl border border-white/30 px-5 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:border-white/50 hover:text-white disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-cyan-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'SendingÃ¢â‚¬Â¦' : 'Send Enquiry'}
        </button>
      </div>
    </div>
  )
}



