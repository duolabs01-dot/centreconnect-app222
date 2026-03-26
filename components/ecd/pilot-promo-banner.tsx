import { Sparkles } from 'lucide-react'

type PilotPromoBannerProps = {
  trialEndsAt?: string | null
}

function formatTrialEnd(trialEndsAt: string | null | undefined): string | null {
  if (!trialEndsAt) return null
  const d = new Date(trialEndsAt)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function PilotPromoBanner({ trialEndsAt }: PilotPromoBannerProps) {
  const endDate = formatTrialEnd(trialEndsAt)

  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-5 py-5 shadow-lg">
      {/* Glow accent */}
      <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-teal-500/10 blur-2xl" />

      {/* Badge */}
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1">
        <Sparkles className="h-3 w-3 text-teal-400" />
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-300">
          Founders Pilot
        </span>
      </div>

      {/* Headline */}
      <p className="text-lg font-black leading-snug text-white">
        Your first month is on us.
      </p>

      {/* Body */}
      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-400">
        As one of our founding crèches, your onboarding and pilot period are
        completely free — no card needed now, no catch.
        {endDate ? (
          <> After <span className="font-semibold text-slate-300">{endDate}</span>, you&apos;ll move to <span className="font-semibold text-white">Growth (R299/month)</span> — or R2,990/year.</>
        ) : (
          <> After your pilot, you&apos;ll move to <span className="font-semibold text-white">Growth (R299/month)</span> — or R2,990/year.</>
        )}{' '}
        Cancel anytime.
      </p>

      {/* What's included */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[
          'DOE Monthly Reports',
          'Attendance Register',
          'Admissions Pipeline',
          'Parent Messaging',
          'Compliance Tracker',
          'WhatsApp Support',
        ].map((feature) => (
          <div
            key={feature}
            className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
            <span className="text-[11px] font-medium text-slate-300">{feature}</span>
          </div>
        ))}
      </div>

      {/* After-pilot clarity */}
      <div className="mt-4 rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">After your pilot</p>
            <p className="mt-0.5 text-sm font-black text-white">Growth <span className="text-xs font-semibold text-slate-400">R299/mo</span></p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Setup fee</p>
            <p className="mt-0.5 text-sm font-black text-teal-300">Waived</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Contracts</p>
            <p className="mt-0.5 text-sm font-black text-teal-300">None</p>
          </div>
        </div>
      </div>
    </div>
  )
}
