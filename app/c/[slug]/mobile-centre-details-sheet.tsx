'use client'

import type { TouchEvent } from 'react'
import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { BadgeCheck, CheckCircle2, Circle, ShieldCheck } from 'lucide-react'
import { ApplyCTA } from '@/components/public/ApplyCTA'
import { ContactCentreSheet } from './contact-centre-sheet'
import { SaveCentreButton } from '@/components/parent/SaveCentreButton'
import { Button } from '@/components/ui/button'

type MobileCentreDetailsSheetProps = {
  centreId: string
  centreSlug: string
  centreName: string
  locationLabel: string
  feesLabel: string
  isRegistered: boolean
  isClaimed: boolean
  isOnline: boolean
  schedule: string
  userRole: string | null
  showPilotTrustInfo: boolean
  pilotBadges: string[]
  existingApplicationId?: string | null
  existingApplicationStatus?: string | null
  whatsappHref?: string | null
}

export function MobileCentreDetailsSheet({
  centreId,
  centreSlug,
  centreName,
  locationLabel,
  feesLabel,
  isRegistered,
  isClaimed,
  isOnline,
  schedule,
  userRole,
  showPilotTrustInfo,
  pilotBadges,
  existingApplicationId,
  existingApplicationStatus,
  whatsappHref = null,
}: MobileCentreDetailsSheetProps) {
  const [open, setOpen] = useState(false)
  const [dragY, setDragY] = useState(0)
  const startYRef = useRef<number | null>(null)

  const claimHref = useMemo(() => `/for-centres/register?flow=confirm&claim=${encodeURIComponent(centreSlug)}`, [centreSlug])

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    startYRef.current = event.touches[0]?.clientY ?? null
  }

  function onTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (startYRef.current == null) return
    const currentY = event.touches[0]?.clientY ?? startYRef.current
    const delta = currentY - startYRef.current
    setDragY(Math.max(0, Math.min(delta, 220)))
  }

  function onTouchEnd() {
    if (dragY > 90) {
      setOpen(false)
    }
    setDragY(0)
    startYRef.current = null
  }

  return (
    <>
      {!open ? (
        <div className="fixed inset-x-4 bottom-6 z-50 lg:hidden">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-2 shadow-[var(--shadow-elevation-3)]">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(true)}
              className="flex h-12 w-full items-center justify-between rounded-2xl bg-slate-50 px-4 text-left text-inherit hover:bg-slate-100"
            >
              <span className="text-sm font-bold text-slate-900">Centre details and trust info</span>
              <span className="text-xs font-bold text-teal-700">Swipe sheet</span>
            </Button>
            <div className="mt-2">
              <ApplyCTA
                variant="hero"
                centreSlug={centreSlug}
                userRole={userRole}
                existingApplicationId={existingApplicationId ?? null}
                existingApplicationStatus={existingApplicationStatus ?? null}
                isAvailable={isClaimed}
                unavailableLabel="Online applications not available yet"
                helperText={
                  isClaimed
                    ? null
                    : 'This centre has not joined CentreConnect yet. You can still contact them directly below.'
                }
                fallbackHref={!isClaimed ? whatsappHref : null}
                fallbackLabel={!isClaimed && whatsappHref ? 'Contact on WhatsApp' : null}
              />
            </div>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            aria-label="Close centre details"
          />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-[2rem] border-t border-slate-200 bg-white px-5 pb-8 pt-3 shadow-[var(--shadow-elevation-3)]"
            style={{
              transform: `translateY(${dragY}px)`,
              transition: startYRef.current == null ? 'transform 0.2s ease-out' : 'none',
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300" />

            <div className="space-y-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">ECD details</p>
                <h3 className="mt-1 text-xl font-black text-slate-900">{centreName}</h3>
                <p className="text-sm text-slate-600">{locationLabel}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className={`flex items-center gap-2 text-sm font-black ${isOnline ? 'text-emerald-700' : 'text-rose-700'}`}>
                  <Circle size={10} fill="currentColor" strokeWidth={0} />
                  {isOnline ? 'Open Now' : 'Closed for the Day'}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">{schedule}</p>
              </div>

              {showPilotTrustInfo ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700">Safety & Compliance</p>
                  <ul className="mt-2 space-y-2 text-xs text-emerald-900">
                    <li className="flex items-center gap-2 font-black">
                      <BadgeCheck size={14} className="text-emerald-600" />
                      {isRegistered ? 'Government Approved' : 'Approval in Progress'}
                    </li>
                    <li className="flex items-center gap-2 font-bold">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      Verified Health & Safety Standards.
                    </li>
                    <li className="flex items-center gap-2 font-bold">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      Qualified & Vetted Practitioners.
                    </li>
                  </ul>
                </div>
              ) : null}

              {pilotBadges.length > 0 ? (
                <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-3">
                  <p className="text-[11px] font-black uppercase tracking-widest text-teal-700">Pilot advantages</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {pilotBadges.map((badge) => (
                      <span
                        key={badge}
                        className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-black text-teal-700 shadow-sm"
                      >
                        <BadgeCheck size={12} />
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {!isClaimed ? (
                <div className="space-y-3">
                  <Link
                    href="/for-centres/intro"
                    className="flex h-12 items-center justify-center rounded-2xl border-2 border-teal-600 bg-white px-4 text-sm font-black text-teal-700 shadow-md"
                  >
                    Own this centre? Claim it here →
                  </Link>
                  {whatsappHref ? (
                    <div className="rounded-xl bg-amber-50 p-3 border border-amber-100">
                      <p className="text-[10px] font-bold text-amber-800 leading-tight">
                        Note: This WhatsApp number is shared by the centre but not yet verified by our team.
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <ContactCentreSheet centreId={centreId} centreName={centreName} />
                <SaveCentreButton centreId={centreId} initialSaved={false} />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-inner">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monthly Contribution</p>
                <p className="text-xl font-black text-slate-900 mt-1">{feesLabel}</p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="h-11 w-full rounded-2xl border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Swipe down or tap to close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
