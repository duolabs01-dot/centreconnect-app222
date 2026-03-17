import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Briefcase, Cpu, ShieldCheck } from 'lucide-react'
import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { FounderTruthPanel } from '@/components/admin/founder-truth-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { FounderVisibilityTruth } from '@/lib/founder/admin-truth'
import type {
  AiCompanyAgentBrief,
  AiCompanyLightPersona,
  AiCompanyMetric,
  AiCompanyRiskItem,
  AiCompanySignalMode,
} from '@/lib/ai/company-os/types'

const PANEL_CLASS = 'border-white/10 bg-[var(--cyber-bg)] text-white shadow-2xl'
const INNER_PANEL_CLASS = 'rounded-2xl border border-white/10 bg-black/20'

const STATUS_STYLES = {
  healthy: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  watch: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  critical: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
} as const

const SIGNAL_MODE_STYLES: Record<AiCompanySignalMode, string> = {
  live: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  mixed: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  mock: 'border-slate-500/30 bg-slate-500/10 text-slate-200',
}

const PERSONA_ICONS: Record<AiCompanyLightPersona['agentId'], ComponentType<{ className?: string }>> = {
  ceo: Briefcase,
  cto: Cpu,
}

const PERSONA_GUIDANCE: Record<
  AiCompanyLightPersona['agentId'],
  {
    title: string
    description: string
    steps: string[]
  }
> = {
  ceo: {
    title: 'Protect the two real partner centres first.',
    description:
      'Use this brief to decide what moves the real pilot forward this week. Ignore demo/test rows, and do not narrate revenue that is not actually scheduled.',
    steps: [
      'If Bajabulile or Sakhisizwe are blocked, solve that before you chase a new project.',
      'If admin tables show billing rows, verify they are not demo/test before treating them as pipeline.',
      'If demand is weak, repair conversion before broadening acquisition.',
    ],
  },
  cto: {
    title: 'Fix the visible failure path first.',
    description:
      'Use this brief to protect trust and delivery. Stabilise the problem users can feel before you widen scope or add new layers.',
    steps: [
      'Contain the failure parents or centres notice first.',
      'Keep reliability, invite, and payment signals on one shared queue.',
      'Do not add new action layers while the core path is noisy.',
    ],
  },
}

function formatGeneratedAt(value: string) {
  return new Date(value).toLocaleString('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function signalModeLabel(mode: AiCompanySignalMode) {
  if (mode === 'live') return 'Live admin signals'
  if (mode === 'mixed') return 'Live signals + fallbacks'
  return 'Mock snapshot'
}

function MetaBadge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={`border-white/10 bg-black/20 text-[11px] font-semibold text-slate-200 ${className}`}
    >
      {children}
    </Badge>
  )
}

function StatusBadge({ status }: { status: AiCompanyAgentBrief['status'] }) {
  return (
    <Badge
      variant="outline"
      className={`text-[11px] font-semibold capitalize ${STATUS_STYLES[status]}`}
    >
      {status}
    </Badge>
  )
}

function SignalModeBadge({ signalMode }: { signalMode: AiCompanySignalMode }) {
  return (
    <Badge
      variant="outline"
      className={`text-[11px] font-semibold ${SIGNAL_MODE_STYLES[signalMode]}`}
    >
      {signalModeLabel(signalMode)}
    </Badge>
  )
}

function metricTone(metric: AiCompanyMetric) {
  return STATUS_STYLES[metric.status]
}

function MetricCard({ metric }: { metric: AiCompanyMetric }) {
  const body = (
    <div className={`${INNER_PANEL_CLASS} h-full p-5 transition-colors hover:border-white/20`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            {metric.label}
          </p>
          <p className="mt-2 text-2xl font-black text-white">{metric.value}</p>
        </div>
        <Badge
          variant="outline"
          className={`text-[11px] font-semibold capitalize ${metricTone(metric)}`}
        >
          {metric.status}
        </Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{metric.change}</p>
    </div>
  )

  if (!metric.href) return body

  return (
    <Link href={metric.href} className="block h-full transition-transform hover:-translate-y-0.5">
      {body}
    </Link>
  )
}

function RiskCard({ risk }: { risk: AiCompanyRiskItem }) {
  return (
    <div className={`${INNER_PANEL_CLASS} p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">{risk.title}</p>
        <Badge
          variant="outline"
          className={`text-[11px] font-semibold capitalize ${STATUS_STYLES[risk.severity]}`}
        >
          {risk.severity}
        </Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{risk.summary}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <MetaBadge>Owner {risk.ownerAgentId.toUpperCase()}</MetaBadge>
        {risk.href && risk.actionLabel ? (
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="h-8 rounded-2xl px-0 text-cyan-300 hover:bg-transparent hover:text-cyan-200"
          >
            <Link href={risk.href}>
              {risk.actionLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function AiCompanyLightBrief({
  persona,
  brief,
  risks,
  signalMode,
  dataNotes,
  generatedAt,
  founderTruth,
}: {
  persona: AiCompanyLightPersona
  brief: AiCompanyAgentBrief
  risks: AiCompanyRiskItem[]
  signalMode: AiCompanySignalMode
  dataNotes: string[]
  generatedAt: string
  founderTruth: FounderVisibilityTruth
}) {
  const guidance = PERSONA_GUIDANCE[persona.agentId]
  const Icon = PERSONA_ICONS[persona.agentId]

  return (
    <AdminPageLayout
      title={persona.title}
      description={persona.promise}
      roleLabel="Platform Admin"
      wide
      actions={
        <Button
          asChild
          size="sm"
          variant="outline"
          className="border-white/10 bg-black/20 text-slate-200 hover:bg-white/5 hover:text-white"
        >
          <Link href="/admin/ai-os">
            <ArrowLeft className="h-4 w-4" />
            Back to AI OS
          </Link>
        </Button>
      }
    >
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_360px]">
        <Card className={PANEL_CLASS}>
          <CardHeader className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <MetaBadge className="text-cyan-200">{persona.audienceLabel}</MetaBadge>
              <StatusBadge status={brief.status} />
              <SignalModeBadge signalMode={signalMode} />
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-cyan-300">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-3xl leading-tight text-white sm:text-4xl">
                  {brief.headline}
                </CardTitle>
                <CardDescription className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                  {brief.rationale}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                How to use this brief
              </p>
              <p className="mt-2 text-lg font-semibold text-white">{guidance.title}</p>
              <p className="mt-2 text-sm leading-6 text-cyan-100">{guidance.description}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {guidance.steps.map((step, index) => (
                <div key={step} className={`${INNER_PANEL_CLASS} p-4`}>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                    Step {index + 1}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className={PANEL_CLASS}>
          <CardHeader className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-cyan-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                  Brief state
                </p>
                <CardTitle className="mt-2 text-2xl text-white">Read this pass quickly</CardTitle>
                <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
                  Use the numbers, choose one move, then verify the source route before you act.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className={`${INNER_PANEL_CLASS} p-4`}>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Readiness
              </p>
              <p className="mt-2 text-sm font-semibold capitalize text-white">{persona.readiness}</p>
            </div>
            <div className={`${INNER_PANEL_CLASS} p-4`}>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Generated
              </p>
              <p className="mt-2 text-sm font-semibold text-white">{formatGeneratedAt(generatedAt)}</p>
            </div>
            <div className={`${INNER_PANEL_CLASS} p-4`}>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Signal mode
              </p>
              <div className="mt-2">
                <SignalModeBadge signalMode={signalMode} />
              </div>
            </div>
            <div className={`${INNER_PANEL_CLASS} p-4`}>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                What this page is for
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{persona.summary}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <FounderTruthPanel
        truth={founderTruth}
        title="Founder truth for this brief"
        description="Use this before you turn the brief into a founder decision."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {brief.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className={PANEL_CLASS}>
          <CardHeader className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
              Do next
            </p>
            <CardTitle className="text-2xl text-white">Recommended actions</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-400">
              Pick one move that changes the current bottleneck. Everything else can wait.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {brief.nextActions.map((item, index) => (
              <div key={item} className={`${INNER_PANEL_CLASS} flex gap-3 p-4`}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-sm font-black text-cyan-200">
                  {(index + 1).toString().padStart(2, '0')}
                </div>
                <p className="text-sm leading-6 text-slate-200">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className={PANEL_CLASS}>
          <CardHeader className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
              Watch closely
            </p>
            <CardTitle className="text-2xl text-white">What could block this move</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-400">
              These risks are still visible in the current pass.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {risks.map((risk) => (
              <RiskCard key={risk.id} risk={risk} />
            ))}
          </CardContent>
        </Card>
      </section>

      <Card className={PANEL_CLASS}>
        <CardHeader className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
            Signal notes
          </p>
          <CardTitle className="text-2xl text-white">Boundaries before wider rollout</CardTitle>
          <CardDescription className="text-sm leading-6 text-slate-400">
            Read these notes before treating this brief as complete coverage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {dataNotes.map((note) => (
            <div key={note} className={`${INNER_PANEL_CLASS} p-4 text-sm leading-6 text-slate-300`}>
              {note}
            </div>
          ))}
        </CardContent>
      </Card>
    </AdminPageLayout>
  )
}
