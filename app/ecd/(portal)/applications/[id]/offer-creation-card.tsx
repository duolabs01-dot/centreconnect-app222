'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createApplicationOfferAction } from './offer-actions'
import { DEFAULT_OFFER_CONDITIONS, DEFAULT_OFFER_PENALTIES } from './offer-defaults'

type OfferBreakdownItem = {
  key: string
  label: string
  amount_cents: number
  frequency: 'monthly' | 'once'
}

type OfferCreationCardProps = {
  applicationId: string
  currentStatus: string
  offerAcceptedAt: string | null
  childName: string
  parentName: string
  initialStartDate: string | null
  initialOfferExpiresAt: string | null
  initialOfferConditions: string | null
  initialOfferPenalties: string | null
  initialOfferBreakdown: OfferBreakdownItem[]
  initialMonthlyFeeCents: number
}

function centsToRand(cents: number) {
  return (Math.max(0, cents) / 100).toFixed(2)
}

function parseOfferAmount(items: OfferBreakdownItem[], key: string) {
  const item = items.find((entry) => entry.key === key)
  return item ? centsToRand(item.amount_cents) : '0.00'
}

function sumByFrequency(items: OfferBreakdownItem[], frequency: 'monthly' | 'once') {
  return items
    .filter((item) => item.frequency === frequency)
    .reduce((sum, item) => sum + Math.max(0, item.amount_cents), 0)
}

export function OfferCreationCard({
  applicationId,
  currentStatus,
  offerAcceptedAt,
  childName,
  parentName,
  initialStartDate,
  initialOfferExpiresAt,
  initialOfferConditions,
  initialOfferPenalties,
  initialOfferBreakdown,
  initialMonthlyFeeCents,
}: OfferCreationCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [monthlyFeeRand, setMonthlyFeeRand] = useState(
    initialMonthlyFeeCents > 0 ? centsToRand(initialMonthlyFeeCents) : parseOfferAmount(initialOfferBreakdown, 'monthly_fee')
  )
  const [registrationFeeRand, setRegistrationFeeRand] = useState(parseOfferAmount(initialOfferBreakdown, 'registration_fee'))
  const [depositFeeRand, setDepositFeeRand] = useState(parseOfferAmount(initialOfferBreakdown, 'deposit_fee'))
  const [transportFeeRand, setTransportFeeRand] = useState(parseOfferAmount(initialOfferBreakdown, 'transport_fee'))
  const [stationeryFeeRand, setStationeryFeeRand] = useState(parseOfferAmount(initialOfferBreakdown, 'stationery_fee'))
  const [otherFeeLabel, setOtherFeeLabel] = useState(
    initialOfferBreakdown.find((item) => item.key === 'other_fee')?.label ?? ''
  )
  const [otherFeeRand, setOtherFeeRand] = useState(parseOfferAmount(initialOfferBreakdown, 'other_fee'))
  const [proposedStartDate, setProposedStartDate] = useState(initialStartDate ?? '')
  const [offerExpiresOn, setOfferExpiresOn] = useState(
    initialOfferExpiresAt ? new Date(initialOfferExpiresAt).toISOString().slice(0, 10) : ''
  )
  const [conditions, setConditions] = useState(initialOfferConditions ?? DEFAULT_OFFER_CONDITIONS)
  const [penalties, setPenalties] = useState(initialOfferPenalties ?? DEFAULT_OFFER_PENALTIES)
  const [missingDetails, setMissingDetails] = useState<string[]>([])
  const [agreementPreview, setAgreementPreview] = useState<string>('')

  const offerSummary = useMemo(() => {
    const numeric = {
      monthly: Number.parseFloat(monthlyFeeRand || '0') || 0,
      registration: Number.parseFloat(registrationFeeRand || '0') || 0,
      deposit: Number.parseFloat(depositFeeRand || '0') || 0,
      transport: Number.parseFloat(transportFeeRand || '0') || 0,
      stationery: Number.parseFloat(stationeryFeeRand || '0') || 0,
      other: Number.parseFloat(otherFeeRand || '0') || 0,
    }
    return {
      monthlyTotal: numeric.monthly + numeric.transport,
      onceOffTotal: numeric.registration + numeric.deposit + numeric.stationery + numeric.other,
    }
  }, [depositFeeRand, monthlyFeeRand, otherFeeRand, registrationFeeRand, stationeryFeeRand, transportFeeRand])

  const isLocked = Boolean(offerAcceptedAt)
  const isRejected = currentStatus === 'rejected'
  const canCreateOffer = !isLocked && !isRejected

  function submitOffer() {
    if (!canCreateOffer) return
    setMissingDetails([])

    startTransition(async () => {
      const result = await createApplicationOfferAction({
        applicationId,
        monthlyFeeRand,
        registrationFeeRand,
        depositFeeRand,
        transportFeeRand,
        stationeryFeeRand,
        otherFeeLabel,
        otherFeeRand,
        proposedStartDate,
        offerExpiresOn,
        conditions,
        penalties,
      })

      if (!result.ok) {
        if (result.missingDetails && result.missingDetails.length > 0) {
          setMissingDetails(result.missingDetails)
          toast.error('Please complete missing details before sending offer.')
          return
        }
        toast.error(result.error || 'Unable to create offer.')
        return
      }

      setAgreementPreview(result.agreementPreview ?? '')
      toast.success(result.message || 'Offer sent to parent.')
      router.refresh()
    })
  }

  return (
    <Card className="rounded-3xl border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-slate-900">Create Offer</CardTitle>
        <p className="text-xs text-slate-600">
          Send a complete offer for <span className="font-semibold text-slate-900">{childName}</span> ({parentName}) with
          pricing, conditions, penalties, and legal agreement terms.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLocked ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            Parent already accepted this offer. Terms are locked.
          </div>
        ) : null}
        {isRejected ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            This application is currently rejected. Update the status before creating a new offer.
          </div>
        ) : null}

        {missingDetails.length > 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Missing Details</p>
            <ul className="mt-2 space-y-1 text-xs text-amber-900">
              {missingDetails.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Monthly tuition (R)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={monthlyFeeRand}
              onChange={(event) => setMonthlyFeeRand(event.target.value)}
              className="h-11 rounded-2xl"
              disabled={!canCreateOffer}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Transport monthly (R)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={transportFeeRand}
              onChange={(event) => setTransportFeeRand(event.target.value)}
              className="h-11 rounded-2xl"
              disabled={!canCreateOffer}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Registration once-off (R)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={registrationFeeRand}
              onChange={(event) => setRegistrationFeeRand(event.target.value)}
              className="h-11 rounded-2xl"
              disabled={!canCreateOffer}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Deposit once-off (R)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={depositFeeRand}
              onChange={(event) => setDepositFeeRand(event.target.value)}
              className="h-11 rounded-2xl"
              disabled={!canCreateOffer}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Learning materials once-off (R)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={stationeryFeeRand}
              onChange={(event) => setStationeryFeeRand(event.target.value)}
              className="h-11 rounded-2xl"
              disabled={!canCreateOffer}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Other fee amount (R)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={otherFeeRand}
              onChange={(event) => setOtherFeeRand(event.target.value)}
              className="h-11 rounded-2xl"
              disabled={!canCreateOffer}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Other fee label (optional)</label>
          <Input
            value={otherFeeLabel}
            onChange={(event) => setOtherFeeLabel(event.target.value)}
            placeholder="Example: Aftercare starter pack"
            className="h-11 rounded-2xl"
            disabled={!canCreateOffer}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Proposed start date</label>
            <Input
              type="date"
              value={proposedStartDate}
              onChange={(event) => setProposedStartDate(event.target.value)}
              className="h-11 rounded-2xl"
              disabled={!canCreateOffer}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Offer expiry date</label>
            <Input
              type="date"
              value={offerExpiresOn}
              onChange={(event) => setOfferExpiresOn(event.target.value)}
              className="h-11 rounded-2xl"
              disabled={!canCreateOffer}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-3 text-xs text-teal-900">
            <p className="font-bold uppercase tracking-wide">Monthly total</p>
            <p className="mt-1 text-sm font-black">R {offerSummary.monthlyTotal.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
            <p className="font-bold uppercase tracking-wide">Once-off total</p>
            <p className="mt-1 text-sm font-black">R {offerSummary.onceOffTotal.toFixed(2)}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Conditions of acceptance</label>
          <Textarea
            value={conditions}
            onChange={(event) => setConditions(event.target.value)}
            className="min-h-[88px] rounded-2xl"
            disabled={!canCreateOffer}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Penalties and notice terms</label>
          <Textarea
            value={penalties}
            onChange={(event) => setPenalties(event.target.value)}
            className="min-h-[88px] rounded-2xl"
            disabled={!canCreateOffer}
          />
        </div>

        <Button
          type="button"
          onClick={submitOffer}
          disabled={!canCreateOffer || isPending}
          className="h-11 w-full rounded-2xl bg-teal-600 font-bold text-white hover:bg-teal-700"
        >
          {isPending ? 'Saving offer...' : 'Save Offer and Send to Parent'}
        </Button>

        {agreementPreview ? (
          <details className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-slate-700">
              SA Parent Agreement Preview
            </summary>
            <pre className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{agreementPreview}</pre>
          </details>
        ) : null}
      </CardContent>
    </Card>
  )
}
