import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CalendarDays,
  CheckSquare,
  Cpu,
  Flag,
  ShieldCheck,
  TrendingUp,
  Workflow,
} from 'lucide-react'
import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { FounderTruthPanel } from '@/components/admin/founder-truth-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  AiCompanyAgentBrief,
  AiCompanyAgentDefinition,
  AiCompanyAgentId,
  AiCompanyLightPersona,
  AiCompanyMetric,
  AiCompanyOperatingSystemSnapshot,
  AiCompanyQueueItem,
  AiCompanyRiskItem,
  AiCompanySignalMode,
  AiCompanyStatusLevel,
  AiCompanyWorkflowSection,
} from '@/lib/ai/company-os/types'

const PANEL_CLASS = 'border-white/10 bg-[var(--cyber-bg)] text-white shadow-2xl'
const INNER_PANEL_CLASS = 'rounded-2xl border border-white/10 bg-black/20'

const STATUS_STYLES: Record<AiCompanyStatusLevel, string> = {
  healthy: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  watch: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  critical: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
}

const PRIORITY_STYLES: Record<AiCompanyQueueItem['priority'], string> = {
  now: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  next: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  later: 'border-slate-500/30 bg-slate-500/10 text-slate-200',
}

const QUEUE_STATUS_STYLES: Record<AiCompanyQueueItem['status'], string> = {
  ready: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
  in_progress: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-200',
  blocked: 'border-rose-500/25 bg-rose-500/10 text-rose-200',
}

const SIGNAL_MODE_STYLES: Record<AiCompanySignalMode, string> = {
  live: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  mixed: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  mock: 'border-slate-500/30 bg-slate-500/10 text-slate-200',
}

const AGENT_ICONS: Record<AiCompanyAgentId, ComponentType<{ className?: string }>> = {
  ceo: Briefcase,
  cto: Cpu,
  ops: Workflow,
  growth: TrendingUp,
}

const WORKFLOW_ICONS: Record<
  AiCompanyWorkflowSection['id'],
  ComponentType<{ className?: string }>
> = {
  daily_focus: CheckSquare,
  weekly_review: CalendarDays,
  sprint_priorities: Flag,
}

const FOUNDER_OVERVIEW_METRIC_IDS = [
  'mrr-base',
  'activation-gap',
  'collections-pulse',
  'parent-demand-7d',
] as const

const HOW_TO_USE_STEPS = [
  'Start with the first red or amber item that affects a real partner centre, trust, or reliability.',
  'Open the linked admin surface and confirm the bottleneck before you assign work.',
  'Only use the role briefs after the bottleneck is clear and the owner is obvious.',
] as const

function formatGeneratedAt(value: string) {
  return new Date(value).toLocaleString('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function definitionFor(
  definitions: ReadonlyArray<AiCompanyAgentDefinition>,
  brief: AiCompanyAgentBrief
) {
  return definitions.find((definition) => definition.id === brief.agentId) ?? null
}

function workflowFor(
  workflows: ReadonlyArray<AiCompanyWorkflowSection>,
  id: AiCompanyWorkflowSection['id']
) {
  return workflows.find((workflow) => workflow.id === id) ?? null
}

function signalModeLabel(mode: AiCompanySignalMode) {
  if (mode === 'live') return 'Live admin signals'
  if (mode === 'mixed') return 'Live signals + fallbacks'
  return 'Mock snapshot'
}

function ownerLabel(agentId: AiCompanyAgentId) {
  return agentId.toUpperCase()
}

function selectedFounderMetrics(metrics: ReadonlyArray<AiCompanyMetric>) {
  const selected = metrics.filter((metric) =>
    FOUNDER_OVERVIEW_METRIC_IDS.includes(metric.id as (typeof FOUNDER_OVERVIEW_METRIC_IDS)[number])
  )

  return selected.length > 0 ? selected : metrics.slice(0, 4)
}

function founderGuidance(mode: AiCompanySignalMode) {
  if (mode === 'live') {
    return 'Live admin tables are connected. Treat this page as a routing layer, not the final source of truth.'
  }

  if (mode === 'mixed') {
    return 'Some selectors are falling back. Use the linked admin page before you commit founder time or engineering effort.'
  }

  return 'This is a mock preview. Use it to judge the workflow and language, not to make production decisions.'
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

function StatusBadge({ status }: { status: AiCompanyStatusLevel }) {
  return (
    <Badge
      variant="outline"
      className={`text-[11px] font-semibold capitalize ${STATUS_STYLES[status]}`}
    >
      {status}
    </Badge>
  )
}

function PriorityBadge({ priority }: { priority: AiCompanyQueueItem['priority'] }) {
  return (
    <Badge
      variant="outline"
      className={`text-[11px] font-semibold capitalize ${PRIORITY_STYLES[priority]}`}
    >
      {priority}
    </Badge>
  )
}

function QueueStatusBadge({ status }: { status: AiCompanyQueueItem['status'] }) {
  return (
    <Badge
      variant="outline"
      className={`text-[11px] font-semibold ${QUEUE_STATUS_STYLES[status]}`}
    >
      {status.replace('_', ' ')}
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

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={`${INNER_PANEL_CLASS} flex items-center justify-between gap-4 p-4`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <div className="text-right text-sm font-semibold text-white">{value}</div>
    </div>
  )
}

function MetricCard({
  metric,
  compact = false,
}: {
  metric: AiCompanyMetric
  compact?: boolean
}) {
  const body = (
    <div
      className={`${INNER_PANEL_CLASS} h-full ${compact ? 'p-4' : 'p-5'} transition-colors hover:border-white/20`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            {metric.label}
          </p>
          <p className={`mt-2 font-black text-white ${compact ? 'text-xl' : 'text-2xl'}`}>
            {metric.value}
          </p>
        </div>
        <StatusBadge status={metric.status} />
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

function ActionListItem({
  item,
  index,
}: {
  item: AiCompanyQueueItem
  index?: number
}) {
  return (
    <div className={`${INNER_PANEL_CLASS} p-4`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          {typeof index === 'number' ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-sm font-black text-cyan-200">
              {(index + 1).toString().padStart(2, '0')}
            </div>
          ) : null}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-white">{item.title}</p>
              <PriorityBadge priority={item.priority} />
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">{item.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <MetaBadge>Lane {item.lane}</MetaBadge>
              <MetaBadge>Owner {ownerLabel(item.ownerAgentId)}</MetaBadge>
              <QueueStatusBadge status={item.status} />
            </div>
          </div>
        </div>
        {item.href && item.actionLabel ? (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-white/10 bg-black/20 text-slate-200 hover:bg-white/5 hover:text-white"
          >
            <Link href={item.href}>
              {item.actionLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function RiskListItem({ risk }: { risk: AiCompanyRiskItem }) {
  return (
    <div className={`${INNER_PANEL_CLASS} p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">{risk.title}</p>
        <StatusBadge status={risk.severity} />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{risk.summary}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <MetaBadge>Owner {ownerLabel(risk.ownerAgentId)}</MetaBadge>
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

function WorkflowCard({ section }: { section: AiCompanyWorkflowSection }) {
  const Icon = WORKFLOW_ICONS[section.id]

  return (
    <Card className={PANEL_CLASS}>
      <CardHeader className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-cyan-300">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
              Founder rhythm
            </p>
            <CardTitle className="mt-2 text-2xl text-white">{section.title}</CardTitle>
            <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
              {section.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {section.items.map((item, index) => (
          <ActionListItem key={item.id} item={item} index={index} />
        ))}
      </CardContent>
    </Card>
  )
}

function LightPersonaCard({ persona }: { persona: AiCompanyLightPersona }) {
  return (
    <Card className={PANEL_CLASS}>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
              {persona.audienceLabel}
            </p>
            <CardTitle className="mt-2 text-xl text-white">{persona.title}</CardTitle>
          </div>
          <MetaBadge className="text-cyan-200">{persona.readiness}</MetaBadge>
        </div>
        <CardDescription className="text-sm leading-6 text-slate-300">
          {persona.promise}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-slate-400">{persona.summary}</p>
        {persona.href ? (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-white/10 bg-black/20 text-slate-200 hover:bg-white/5 hover:text-white"
          >
            <Link href={persona.href}>
              {persona.primaryCta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

function AgentCard({
  brief,
  definition,
  lightPersona,
}: {
  brief: AiCompanyAgentBrief
  definition: AiCompanyAgentDefinition | null
  lightPersona: AiCompanyLightPersona | null
}) {
  const Icon = AGENT_ICONS[brief.agentId]

  return (
    <Card className={PANEL_CLASS}>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-cyan-300">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                {definition?.roleLabel ?? ownerLabel(brief.agentId)}
              </p>
              <CardTitle className="mt-2 text-xl text-white">
                {definition?.name ?? ownerLabel(brief.agentId)}
              </CardTitle>
            </div>
          </div>
          <StatusBadge status={brief.status} />
        </div>
        <div>
          <CardTitle className="text-lg leading-7 text-white">{brief.headline}</CardTitle>
          <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
            {brief.rationale}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className={`${INNER_PANEL_CLASS} p-4`}>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            Decision lens
          </p>
          <p className="mt-2 text-sm font-semibold text-white">
            {definition?.decisionQuestion ?? 'Which bottleneck matters most right now?'}
          </p>
          {definition?.mission ? (
            <p className="mt-2 text-sm leading-6 text-slate-400">{definition.mission}</p>
          ) : null}
          {lightPersona?.href ? (
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="mt-3 h-8 rounded-2xl px-0 text-cyan-300 hover:bg-transparent hover:text-cyan-200"
            >
              <Link href={lightPersona.href}>
                {lightPersona.primaryCta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {brief.metrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} compact />
          ))}
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            Recommended next actions
          </p>
          <div className="mt-3 space-y-3">
            {brief.nextActions.map((item, index) => (
              <div key={item} className={`${INNER_PANEL_CLASS} flex gap-3 p-4`}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-xs font-black text-slate-200">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-slate-200">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AiCompanyOsDashboard({
  snapshot,
}: {
  snapshot: AiCompanyOperatingSystemSnapshot
}) {
  const dailyFocus = workflowFor(snapshot.workflows, 'daily_focus')
  const weeklyReview = workflowFor(snapshot.workflows, 'weekly_review')
  const sprintPriorities = workflowFor(snapshot.workflows, 'sprint_priorities')
  const founderMetrics = selectedFounderMetrics(snapshot.metrics)
  const lightPersonaMap = new Map(snapshot.lightPersonas.map((persona) => [persona.agentId, persona]))

  return (
    <AdminPageLayout
      title="AI Company OS"
      description="Admin-only founder cockpit. Fix today's bottleneck first, then use the role briefs and coverage notes below."
      roleLabel="Platform Admin"
      wide
      actions={
        <div className="flex flex-wrap gap-3">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-white/10 bg-black/20 text-slate-200 hover:bg-white/5 hover:text-white"
          >
            <Link href="/admin/hq">Company HQ</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="rounded-2xl bg-cyan-500/90 text-slate-950 hover:bg-cyan-400"
          >
            <Link href="/admin/dashboard">Founder KPIs</Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-white/10 bg-black/20 text-slate-200 hover:bg-white/5 hover:text-white"
          >
            <Link href="/admin/command">Operations</Link>
          </Button>
        </div>
      }
    >
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_360px]">
        <Card className={PANEL_CLASS}>
          <CardHeader className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <MetaBadge className="text-cyan-200">Admin only</MetaBadge>
              <SignalModeBadge signalMode={snapshot.signalMode} />
              <MetaBadge>{snapshot.enabled ? 'OS enabled' : 'Preview mode'}</MetaBadge>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-cyan-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-3xl leading-tight text-white sm:text-4xl">
                  Start with the bottleneck, not the dashboard tour.
                </CardTitle>
                <CardDescription className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                  This page turns current admin signals into a short founder workflow. Work the
                  item closest to real partner usage, trust, or reliability before you open a new lane.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div
              className={`rounded-2xl border p-4 text-sm leading-6 ${
                snapshot.enabled
                  ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-100'
                  : 'border-amber-500/20 bg-amber-500/10 text-amber-100'
              }`}
            >
              {!snapshot.enabled ? (
                <>
                  The cockpit is still in preview. Set <strong>{snapshot.featureFlag}=1</strong>
                  {' '}to enable the live admin surface and{' '}
                  <strong>{snapshot.lightPersonasFeatureFlag}=1</strong> to expose CEO and CTO
                  light briefs.
                </>
              ) : (
                founderGuidance(snapshot.signalMode)
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {HOW_TO_USE_STEPS.map((step, index) => (
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
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
              Session state
            </p>
            <CardTitle className="text-2xl text-white">Read this run at a glance</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-400">
              Keep this page safe: confirm the linked source before you act on partial data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Generated" value={formatGeneratedAt(snapshot.generatedAt)} />
            <InfoRow label="Owner context" value={snapshot.ownerEmail ?? 'Platform admin session'} />
            <InfoRow label="Signal mode" value={<SignalModeBadge signalMode={snapshot.signalMode} />} />
            <InfoRow label="AI OS flag" value={`${snapshot.featureFlag} = ${snapshot.enabled ? '1' : '0'}`} />
            <InfoRow
              label="Light briefs"
              value={`${snapshot.lightPersonasFeatureFlag} = ${snapshot.lightPersonasEnabled ? '1' : '0'}`}
            />
          </CardContent>
        </Card>
      </section>

      <FounderTruthPanel truth={snapshot.founderTruth} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {founderMetrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <Card className={PANEL_CLASS}>
          <CardHeader className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
              Do these first
            </p>
            <CardTitle className="text-2xl text-white">Primary founder actions</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-400">
              Leave this page with one concrete next move, not more reading.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dailyFocus?.items.map((item, index) => (
              <ActionListItem key={item.id} item={item} index={index} />
            ))}
          </CardContent>
        </Card>

        <Card className={PANEL_CLASS}>
          <CardHeader className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-cyan-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                  Watchouts
                </p>
                <CardTitle className="mt-2 text-2xl text-white">
                  Do not widen scope until these are understood
                </CardTitle>
                <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
                  These are the current visible risks in the founder loop.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.risks.map((risk) => (
              <RiskListItem key={risk.id} risk={risk} />
            ))}
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="rhythm" className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-[1.5rem] border border-white/10 bg-[var(--cyber-bg)] p-1">
          <TabsTrigger
            value="rhythm"
            className="rounded-[1.25rem] px-4 py-2.5 text-sm font-semibold text-slate-400 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none"
          >
            Founder rhythm
          </TabsTrigger>
          <TabsTrigger
            value="roles"
            className="rounded-[1.25rem] px-4 py-2.5 text-sm font-semibold text-slate-400 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none"
          >
            AI roles
          </TabsTrigger>
          <TabsTrigger
            value="coverage"
            className="rounded-[1.25rem] px-4 py-2.5 text-sm font-semibold text-slate-400 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none"
          >
            Coverage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rhythm" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            {weeklyReview ? <WorkflowCard section={weeklyReview} /> : null}
            {sprintPriorities ? <WorkflowCard section={sprintPriorities} /> : null}
          </div>
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <Card className={PANEL_CLASS}>
            <CardHeader className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                Assign the owner
              </p>
              <CardTitle className="text-2xl text-white">Use role briefs after the bottleneck is clear</CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-400">
                Each brief should help the founder decide who owns the next move, not create more theory.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {snapshot.lightPersonasEnabled ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {snapshot.lightPersonas.map((persona) => (
                    <LightPersonaCard key={persona.agentId} persona={persona} />
                  ))}
                </div>
              ) : (
                <div className={`${INNER_PANEL_CLASS} p-4 text-sm leading-6 text-slate-300`}>
                  CEO and CTO light briefs are hidden until{' '}
                  <strong>{snapshot.lightPersonasFeatureFlag}=1</strong>.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            {snapshot.agents.map((brief) => (
              <AgentCard
                key={brief.agentId}
                brief={brief}
                definition={definitionFor(snapshot.definitions, brief)}
                lightPersona={
                  lightPersonaMap.get(brief.agentId as AiCompanyLightPersona['agentId']) ?? null
                }
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="coverage" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <Card className={PANEL_CLASS}>
              <CardHeader className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                  Signal boundaries
                </p>
                <CardTitle className="text-2xl text-white">What this cockpit knows right now</CardTitle>
                <CardDescription className="text-sm leading-6 text-slate-400">
                  Read these notes before you treat a weak signal as full truth.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {snapshot.dataNotes.map((note) => (
                  <div key={note} className={`${INNER_PANEL_CLASS} p-4 text-sm leading-6 text-slate-300`}>
                    {note}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className={PANEL_CLASS}>
              <CardHeader className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                  Operating queues
                </p>
                <CardTitle className="text-2xl text-white">All queued follow-up</CardTitle>
                <CardDescription className="text-sm leading-6 text-slate-400">
                  Typed ownership stays visible here so later action layers can remain safe.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {snapshot.queues.map((item) => (
                  <ActionListItem key={item.id} item={item} />
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AdminPageLayout>
  )
}
