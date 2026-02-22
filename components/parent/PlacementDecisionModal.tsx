'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { AlertTriangle, Calendar, CheckCircle2, ChevronRight, MapPin, PartyPopper } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { formatDate } from '@/lib/utils'

interface PlacementDecisionModalProps {
  open: boolean
  onClose: () => void
  onAccept: () => Promise<void>
  onDecline: () => Promise<void>
  centreName: string
  centreSuburb: string
  childName: string
  startDate?: string
  placementExpiresAt?: string
}

type StickyApplyCTAProps = {
  centreId: string
  centreName: string
  hasApplied: boolean
  isAuthenticated: boolean
  isFull: boolean
}

export default function PlacementDecisionModal({
  open,
  onClose,
  onAccept,
  onDecline,
  centreName,
  centreSuburb,
  childName,
  startDate,
  placementExpiresAt,
}: PlacementDecisionModalProps) {
  const [step, setStep] = useState<'decision' | 'confirm-accept' | 'confirm-decline' | 'done'>('decision')
  const [loading, setLoading] = useState(false)

  const daysLeft = placementExpiresAt
    ? Math.ceil((new Date(placementExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  async function handleAccept() {
    setLoading(true)
    try {
      await onAccept()
      setStep('done')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDecline() {
    setLoading(true)
    try {
      await onDecline()
      onClose()
      toast.success("Application declined. We'll keep looking for you.")
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setStep('decision')
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="rounded-t-[28px] px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-6">
        {step === 'decision' ? (
          <div className="space-y-4 text-center">
            <p className="text-3xl">🎉</p>
            <h2 className="text-2xl font-extrabold">You got in!</h2>
            <p className="text-sm text-slate-600">
              <strong>{centreName}</strong> accepted {childName}
            </p>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-sm text-slate-700">
              <p className="mb-2 flex items-center gap-2">
                <MapPin size={16} /> {centreName}, {centreSuburb}
              </p>
              {startDate ? (
                <p className="flex items-center gap-2">
                  <Calendar size={16} /> Start date:{' '}
                  <strong>{formatDate(startDate)}</strong>
                </p>
              ) : null}
            </div>

            {daysLeft !== null && daysLeft <= 5 ? (
              <p className="flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <AlertTriangle size={14} /> Placement expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
              </p>
            ) : null}

            <div className="space-y-2">
              <button
                onClick={() => setStep('confirm-accept')}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-white"
              >
                <PartyPopper size={16} /> Accept Placement <ChevronRight size={14} />
              </button>
              <button
                onClick={() => setStep('confirm-decline')}
                className="h-11 w-full rounded-xl bg-slate-100 font-semibold text-slate-700"
              >
                Decline Placement
              </button>
            </div>
          </div>
        ) : null}

        {step === 'confirm-accept' ? (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto text-emerald-600" size={42} />
            <h2 className="text-xl font-bold">Confirm Enrollment</h2>
            <p className="text-sm text-slate-600">
              You are accepting a spot for <strong>{childName}</strong> at <strong>{centreName}</strong>.
            </p>
            <div className="space-y-2">
              <button
                onClick={handleAccept}
                disabled={loading}
                className="h-12 w-full rounded-xl bg-primary font-semibold text-white disabled:opacity-60"
              >
                {loading ? 'Confirming...' : 'Yes, Accept & Enroll'}
              </button>
              <button onClick={() => setStep('decision')} className="h-11 w-full rounded-xl bg-slate-100 font-semibold text-slate-700">
                Go Back
              </button>
            </div>
          </div>
        ) : null}

        {step === 'confirm-decline' ? (
          <div className="space-y-4 text-center">
            <AlertTriangle className="mx-auto text-amber-600" size={42} />
            <h2 className="text-xl font-bold">Are you sure?</h2>
            <p className="text-sm text-slate-600">Declining gives up this spot and cannot be undone.</p>
            <div className="space-y-2">
              <button
                onClick={handleDecline}
                disabled={loading}
                className="h-12 w-full rounded-xl bg-rose-100 font-semibold text-rose-700 disabled:opacity-60"
              >
                {loading ? 'Declining...' : 'Yes, Decline Placement'}
              </button>
              <button onClick={() => setStep('decision')} className="h-11 w-full rounded-xl bg-slate-100 font-semibold text-slate-700">
                Go Back
              </button>
            </div>
          </div>
        ) : null}

        {step === 'done' ? (
          <div className="space-y-4 text-center">
            <p className="text-4xl">🎊</p>
            <h2 className="text-2xl font-extrabold">Enrollment Confirmed!</h2>
            <p className="text-sm text-slate-600">
              {childName} is enrolled at {centreName}. They&apos;ll contact you next.
            </p>
            <button onClick={handleClose} className="h-12 w-full rounded-xl bg-primary font-semibold text-white">
              Done
            </button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

export function StickyApplyCTA({
  centreId,
  centreName,
  hasApplied,
  isAuthenticated,
  isFull,
}: StickyApplyCTAProps) {
  if (hasApplied) {
    return (
      <div className="fixed inset-x-0 bottom-20 z-40 px-3 md:hidden">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700 shadow-sm">
          You already applied to {centreName}
        </div>
      </div>
    )
  }

  if (isFull) {
    return (
      <div className="fixed inset-x-0 bottom-20 z-40 px-3 md:hidden">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-700 shadow-sm">
          {centreName} is currently full
        </div>
      </div>
    )
  }

  const href = isAuthenticated ? `/apply/${centreId}` : `/login`
  const label = isAuthenticated ? 'Apply to this centre' : 'Sign in to apply'

  return (
    <div className="fixed inset-x-0 bottom-20 z-40 px-3 md:hidden">
      <Link
        href={href}
        className="block rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-white shadow-[0_10px_20px_rgba(2,132,199,0.24)]"
      >
        {label}
      </Link>
    </div>
  )
}
