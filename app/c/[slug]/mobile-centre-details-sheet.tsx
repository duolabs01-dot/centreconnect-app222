'use client'

import type { TouchEvent } from 'react'
import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Baby, BellRing, CheckCircle2, Circle, Clock3, FileText, MapPin, ShieldCheck, Wallet } from 'lucide-react'

import { ApplyCTA } from '@/components/public/ApplyCTA'
import { ContactCentreSheet } from '@/components/public/ContactCentreSheet'
import { SaveCentreButton } from '@/components/parent/SaveCentreButton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GovernmentRegisteredBadge, PremiumVerifiedBadge } from '@/components/ui/premium-verified-badge'

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
  inquiryTemplates?: Array<{ label: string; message: string }>
  isSaved?: boolean
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
    <div className="rounded-[1.2rem] border border-border bg-amber-50/40 p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500">{label}</p>
          <p className="mt-1 text-sm font-semibold leading-5 text-slate-900">{value}</p>
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
  inquiryTemplates = [],
  isSaved = false,
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
          <div className="rounded-[1.9rem] border border-border bg-background/96 p-2 shadow-[0_18px_40px_rgba(31,44,39,0.12)] backdrop-blur-xl">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(true)}
              className="flex h-12 w-full items-center justify-between rounded-2xl bg-muted px-4 text-left text-inherit hover:bg-muted/80"
            >
              <div>
                <span className="block text-sm font-semibold text-slate-900">Quick details</span>
                <span className="block text-[11px] font-medium text-slate-500">Fees, ages, trust, and actions</span>
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Open</span>
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
            className="absolute inset-x-0 bottom-0 rounded-t-[2rem] border-t border-border bg-background px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-24px_50px_rgba(0,0,0,0.12)]"
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
                  {isClaimed ? <PremiumVerifiedBadge compact  /> : null}
                  {isRegistered ? <GovernmentRegisteredBadge compact /> : null}
                  {showPilotTrustInfo ? (
                    <Badge className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-0.5 text-[9px] font-medium tracking-[0.08em] text-cyan-700 shadow-none">
                      Pilot Partner
                    </Badge>
                  ) : null}
                  {!isClaimed ? (
                    <Badge className="rounded-full border-border bg-white px-3 py-1 text-[10px] font-medium tracking-[0.08em] text-slate-500 shadow-none">
                      Not yet on CentreConnect
                    </Badge>
                  ) : null}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">{centreName}</h3>
                  <p className="text-sm font-medium text-slate-600">{locationLabel}</p>
                  {tagline ? <p className="mt-1 text-sm leading-6 text-slate-500">{tagline}</p> : null}
                  {isClaimed ? (
                    <p className="mt-2 text-sm leading-6 text-slate-600">This creche lets parents apply, message, and keep next steps together in one place.</p>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <DetailFact icon={Wallet} label="Fees" value={feesLabel} />
                <DetailFact icon={Wallet} label="Registration" value={registrationFeeLabel} />
                <DetailFact icon={Baby} label="Ages" value={ageGroupsLabel} />
                <DetailFact icon={FileText} label="Trust" value={trustLabel} />
              </div>

              <div className="rounded-[1.4rem] border border-border bg-muted p-4">
                <p className={`flex items-center gap-2 text-sm font-semibold ${isOnline ? 'text-emerald-700' : 'text-slate-500'}`}>
                  <Circle size={10} fill="currentColor" strokeWidth={0} />
                  {isOnline ? 'Open now' : 'Closed now'}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-600">{schedule}</p>
                <p className="mt-3 text-xs font-medium text-slate-500">
                  {isRegistered ? 'DSD registration is shown on this profile.' : 'DSD registration is not shown yet. Ask the creche directly if that matters to you.'}
                </p>
              </div>

              {isClaimed ? (
                <div className="rounded-[1.4rem] border border-emerald-100 bg-gradient-to-b from-emerald-50/60 to-emerald-100/40 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-900/80">Why this feels easier for parents</p>
                  <div className="mt-3 space-y-2.5">
                    {[
                      { icon: BellRing, title: 'Daily activities stay visible', body: 'Stay closer to meals, activities, and reminders without chasing paper notes or waiting for WhatsApp replies.' },
                      { icon: ShieldCheck, title: 'Safer pickup flow', body: 'Collection and follow-up feel clearer when the creche and parent use one organised system.' },
                      { icon: FileText, title: 'One parent profile that works harder', body: 'Your documents, applications, and next steps stay easier to manage in one place that respects your time.' },
                    ].map((item) => {
                      const Icon = item.icon
                      return (
                        <div key={item.title} className="flex items-start gap-3 rounded-[1.2rem] border border-white/70 bg-white/85 p-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-teal-700">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-600">{item.body}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              {showPilotTrustInfo && pilotBadges.length > 0 ? (
                <div className="rounded-[1.4rem] border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/60 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-900">Why this profile feels stronger</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pilotBadges.map((badge) => (
                      <span
                        key={badge}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-semibold text-amber-950 shadow-sm"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {!isClaimed ? (
                <div className="rounded-[1.4rem] border border-border bg-white p-4">
                  <p className="text-sm font-medium leading-6 text-slate-600">
                    This creche has not joined CentreConnect yet. You can still save it now and use the profile details while digital applications are being set up.
                  </p>
                {showClaimLink ? (
                  <Link href={claimHref} className="mt-3 inline-flex text-sm font-semibold text-teal-700 hover:underline">
                    Do you run this creche? Claim it →
                  </Link>
                ) : null}
                </div>
              ) : null}

              <div className="space-y-3 pt-1">
                <div className="rounded-[1.4rem] border border-emerald-100 bg-emerald-50/60 p-4">
                  <p className="text-[10px] font-semibold tracking-[0.08em] text-emerald-900/80">Best next move</p>
                  <p className="mt-2 text-sm leading-6 text-emerald-900">
                    {isClaimed
                      ? 'Apply when you are ready and move into a calmer parent journey: one profile, one application flow, and one place for daily visibility and next steps.'
                      : 'Save this creche now and come back when digital applications open.'}
                  </p>
                </div>
                <ApplyCTA
                  variant="hero"
                  centreSlug={centreSlug}
                  userRole={userRole}
                  existingApplicationId={existingApplicationId ?? null}
                  existingApplicationStatus={existingApplicationStatus ?? null}
                  existingHelperText={isClaimed ? 'CentreConnect keeps your application, daily updates, replies, and next steps together.' : null}
                  isAvailable={isClaimed}
                  unavailableLabel="Online applications not available yet"
                  helperText={
                    isClaimed
                      ? 'Apply now and move forward with one organised parent profile, visible daily activities, and a calmer follow-up journey.'
                      : 'Save this creche now and come back when applications open.'
                  }
                />
                {isClaimed ? (
                  <ContactCentreSheet
                    centreId={centreId}
                    centreName={centreName}
                    templates={inquiryTemplates}
                    triggerLabel="Ask the creche a quick question"
                    triggerClassName="h-12 w-full justify-center rounded-2xl border-emerald-200 bg-white text-sm font-semibold text-emerald-900 hover:border-emerald-300 hover:bg-emerald-50/40"
                    title={`Ask ${centreName} a quick question`}
                    description="Your message goes straight to the creche inbox in CentreConnect, so replies, updates, and the application journey stay together."
                  />
                ) : (
                  <div className="rounded-[1.3rem] border border-border bg-white px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">Profile details only for now</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Messaging opens when this creche joins CentreConnect.</p>
                  </div>
                )}
                <div className="flex items-center justify-between rounded-[1.3rem] border border-border bg-white px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Save for later</p>
                    <p className="text-xs text-slate-500">Keep this creche close while you compare.</p>
                  </div>
                  <SaveCentreButton centreId={centreId} initialSaved={isSaved} />
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="h-11 w-full rounded-2xl border-border bg-white text-sm font-semibold text-slate-700 hover:bg-muted"
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







