import { ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { FounderVisibilityTruth } from '@/lib/founder/admin-truth'

type FounderTruthPanelProps = {
  truth: FounderVisibilityTruth
  title?: string
  description?: string
}

function FactCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
    </div>
  )
}

export function FounderTruthPanel({
  truth,
  title = 'Founder truth',
  description = 'Admin-only canonical labels that keep demo/test data from turning into fake traction, pipeline, or revenue.',
}: FounderTruthPanelProps) {
  const demoValue =
    truth.demoTesterCentreCount === null ? 'Any extras' : truth.demoTesterCentreCount.toLocaleString()

  return (
    <Card className="border-white/10 bg-[var(--cyber-bg)] text-white shadow-2xl">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="border-cyan-500/30 bg-cyan-500/10 text-[11px] font-semibold text-cyan-200"
          >
            Admin only
          </Badge>
          <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 text-[11px] font-semibold text-amber-200"
          >
            Canonical pilot truth
          </Badge>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-cyan-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-2xl text-white">{title}</CardTitle>
            <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
              {description}
            </CardDescription>
            <p className="mt-3 text-sm leading-6 text-slate-200">{truth.summary}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <FactCard
            label="Real onboarded ECDs"
            value={truth.partnerCount.toLocaleString()}
            detail="Only Bajabulile Day Care Centre and Sakhisizwe Day Care Centre count as real onboarded partners."
          />
          <FactCard
            label="Demo/test centre rows"
            value={demoValue}
            detail={truth.demoTesterSummary}
          />
          <FactCard
            label="Real revenue now"
            value={truth.revenueStatusLabel}
            detail={truth.revenueSummary}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {truth.foundingPartners.map((partner) => (
            <div key={partner.name} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-white">{partner.name}</p>
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 text-[11px] font-semibold text-emerald-200"
                >
                  {partner.label}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-400">{partner.note}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {truth.notes.map((note) => (
            <div key={note} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300">
              {note}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
