'use client'

import type { TouchEvent } from 'react'
import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Baby, CheckCircle2, Circle, Clock3, MapPin, ShieldCheck, Wallet } from 'lucide-react'

import { ApplyCTA } from '@/components/public/ApplyCTA'
import { ContactCentreSheet } from './contact-centre-sheet'
import { SaveCentreButton } from '@/components/parent/SaveCentreButton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PremiumVerifiedBadge } from '@/components/ui/premium-verified-badge'

type MobileCentreDetailsSheetProps = {
  centreId: string
  centreSlug: string
  centreName: string
  tagline?: string | null
  locationLabel: string
  feesLabel: string
  registrationFeeLabel: string
  ageGroupsLabel: string
  capacityLabel: string
  trustLabel: string
  isRegistered: boolean
  isClaimed: boolean
  isOnline: boolean
  schedule: string
  subsidyAccepted: boolean
  userRole: string | null
  showPilotTrustInfo: boolean
  pilotBadges: string[]
  existingApplicationId?: string | null
  existingApplicationStatus?: string | null
  whatsappHref?: string | null
  inquiryTemplates?: Array<{ label: string; message: string }>
}

function DetailFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet
  label: string
  value: string
}) {
  return (
    <div className="rounded-[1.2rem] border border-[#E7DDD1] bg-[#FFFCF7] p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#FDF0E6] text-[#D4935A]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7B827E]">{label}</p>
          <p className="mt-1 text-sm font-semibold leading-5 text-[#22312E]">{value}</p>
        </div>
      </div>
    </div>
  )
}

export function MobileCentreDetailsSheet({
  centreId,
  centreSlug,
  centreName,
  tagline,
  locationLabel,
  feesLabel,
  registrationFeeLabel,
  ageGroupsLabel,
  capacityLabel,
  trustLabel,
  isRegistered,
  isClaimed,
  isOnline,
  schedule,
  subsidyAccepted,
  userRole,
  showPilotTrustInfo,
  pilotBadges,
  existingApplicationId,
  existingApplicationStatus,
  whatsappHref = null,
  inquiryTemplates = [],
}: MobileCentreDetailsSheetProps) {
  const [open, setOpen] = useState(false)
  const [dragY, setDragY] = useState(0)
  const startYRef = useRef<number | null>(null)

  const claimHref = useMemo(() => `/for-centres/register?flow=confirm&claim=${encodeURIComponent(centreSlug)}`, [centreSlug])
  const showClaimLink = !isClaimed && userRole !== 'parent_user'

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
        <div className="fixed inset-x-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-50 lg:hidden">
          <div className="rounded-[1.9rem] border border-[#E7DDD1] bg-[#FFFDF9]/96 p-2 shadow-[0_18px_40px_rgba(31,44,39,0.12)] backdrop-blur-xl">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(true)}
              className="flex h-12 w-full items-center justify-between rounded-2xl bg-[#FAF8F4] px-4 text-left text-inherit hover:bg-[#F4EFE6]"
            >
              <div>
                <span className="block text-sm font-semibold text-[#22312E]">Quick details</span>
                <span className="block text-[11px] font-medium text-[#7B827E]">Fees, ages, trust, and actions</span>
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0D9488]">Open</span>
            </Button>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
            aria-label="Close centre details"
          />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-[2rem] border-t border-[#E7DDD1] bg-[#FFFDF9] px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-24px_50px_rgba(0,0,0,0.12)]"
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
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {isRegistered ? <PremiumVerifiedBadge compact /> : null}
                  {showPilotTrustInfo ? (
                    <Badge className="rounded-full border border-cyan-400/50 bg-cyan-900/40 px-3 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-50 shadow-none backdrop-blur-sm">
                      Pilot Partner
                    </Badge>
                  ) : null}
                  {!isClaimed ? (
                    <Badge className="rounded-full border-[#DDD5C8] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6A7672] shadow-none">
                      Not yet on CentreConnect
                    </Badge>
                  ) : null}
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#22312E]">{centreName}</h3>
                  <p className="text-sm font-medium text-[#5F6C68]">{locationLabel}</p>
                  {tagline ? <p className="mt-1 text-sm leading-6 text-[#6A7672]">{tagline}</p> : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <DetailFact icon={Wallet} label="Fees" value={feesLabel} />
                <DetailFact icon={Wallet} label="Registration" value={registrationFeeLabel} />
                <DetailFact icon={Baby} label="Ages" value={ageGroupsLabel} />
                <DetailFact icon={ShieldCheck} label="Trust" value={trustLabel} />
              </div>

              <div className="rounded-[1.4rem] border border-[#E7DDD1] bg-[#FAF8F4] p-4">
                <p className={`flex items-center gap-2 text-sm font-semibold ${isOnline ? 'text-emerald-700' : 'text-[#7B827E]'}`}>
                  <Circle size={10} fill="currentColor" strokeWidth={0} />
                  {isOnline ? 'Open now' : 'Closed now'}
                </p>
                <p className="mt-1 text-sm font-medium text-[#5F6C68]">{schedule}</p>
                <p className="mt-3 text-xs font-medium text-[#6A7672]">
                  {subsidyAccepted ? 'This centre says it accepts government subsidy support.' : 'Subsidy support is not listed yet. Ask the centre directly.'}
                </p>
              </div>

              {showPilotTrustInfo && pilotBadges.length > 0 ? (
                <div className="rounded-[1.4rem] border border-[#E7D6A8] bg-[linear-gradient(135deg,#FFF9E8_0%,#FFF2D2_100%)] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8F6200]">Why this profile feels stronger</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pilotBadges.map((badge) => (
                      <span
                        key={badge}
                        className="inline-flex items-center gap-1 rounded-full border border-[#E7D6A8] bg-white px-3 py-1 text-[11px] font-semibold text-[#6C4700] shadow-sm"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {!isClaimed ? (
                <div className="rounded-[1.4rem] border border-[#E7DDD1] bg-white p-4">
                  <p className="text-sm font-medium leading-6 text-[#5F6C68]">
                    This centre has not joined CentreConnect yet, so parents still need to contact them directly.
                  </p>
                {showClaimLink ? (
                  <Link href={claimHref} className="mt-3 inline-flex text-sm font-semibold text-[#0D9488] hover:underline">
                    Own this crèche? Claim it here →
                  </Link>
                ) : null}
                </div>
              ) : null}

              <div className="space-y-3 pt-1">
                <ApplyCTA
                  variant="hero"
                  centreSlug={centreSlug}
                  userRole={userRole}
                  existingApplicationId={existingApplicationId ?? null}
                  existingApplicationStatus={existingApplicationStatus ?? null}
                  existingHelperText={isClaimed ? 'CentreConnect keeps your application and messages in one place.' : null}
                  existingFollowUpHref={whatsappHref}
                  existingFollowUpLabel={whatsappHref ? 'Send follow-up on WhatsApp' : null}
                  isAvailable={isClaimed}
                  unavailableLabel="Online applications not available yet"
                  helperText={
                    isClaimed
                      ? null
                      : 'You can still save this centre or contact them directly while they finish joining CentreConnect.'
                  }
                  fallbackHref={!isClaimed ? whatsappHref : null}
                  fallbackLabel={!isClaimed && whatsappHref ? 'Chat on WhatsApp' : null}
                />
                <div className="grid grid-cols-2 gap-3">
                  <ContactCentreSheet centreId={centreId} centreName={centreName} templates={inquiryTemplates} />
                  <div className="flex items-center justify-center rounded-2xl border border-[#E7DDD1] bg-white px-2">
                    <SaveCentreButton centreId={centreId} initialSaved={false} />
                  </div>
                </div>
                {isClaimed && whatsappHref ? (
                  <Link href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-[#25D366]/30 bg-[#25D366]/10 text-sm font-semibold text-[#147A37]">
                    Ask on WhatsApp
                  </Link>
                ) : null}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="h-11 w-full rounded-2xl border-[#DDD5C8] bg-white text-sm font-semibold text-[#4E5D59] hover:bg-[#FAF8F4]"
              >
                Close details
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}




