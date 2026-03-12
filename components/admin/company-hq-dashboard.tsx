import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  ArrowUpRight,
  Bot,
  Briefcase,
  Building2,
  Cpu,
  Flag,
  LifeBuoy,
  Sparkles,
  TrendingUp,
  Workflow,
} from 'lucide-react'
import {
  type CompanyHqBucket,
  type CompanyHqPilotCard,
  type CompanyHqReadinessItem,
  type CompanyHqRole,
  type CompanyHqSnapshot,
  type CompanyHqSummaryStat,
  type CompanyHqTone,
} from '@/lib/admin/company-hq'
import { AdminInfoNote } from '@/components/admin/AdminInfoNote'
import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { ADMIN_TASK_ROUTER } from '@/components/admin/admin-nav'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const PANEL_CLASS = 'border-white/10 bg-[#080B13] text-slate-50 shadow-none'
const INNER_PANEL_CLASS = 'rounded-[1.5rem] border border-white/10 bg-black/20'

const TONE_STYLES: Record<CompanyHqTone, string> = {
  good: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  watch: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  critical: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  muted: 'border-slate-500/30 bg-slate-500/10 text-slate-200',
  info: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
}

const ROLE_ICONS = {
  'founder-ceo': Briefcase,
  cto: Cpu,
  ops: Workflow,
  'ux-product': Flag,
  growth: TrendingUp,
  support: LifeBuoy,
  'automation-openclaw': Bot,
} as const

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function aiSignalModeLabel(signalMode: CompanyHqSnapshot['aiLayer']['signalMode']) {
  if (signalMode === 'live') return 'AI OS live signals'
  if (signalMode === 'mixed') return 'AI OS mixed signals'
  return 'AI OS mock fallback'
}

function openClawModeLabel(mode: CompanyHqSnapshot['openClaw']['mode']) {
  return mode === 'filesystem' ? 'OpenClaw filesystem snapshot' : 'OpenClaw placeholder mode'
}

function ToneBadge({ label, tone }: { label: string; tone: CompanyHqTone }) {
  return (
    <Badge variant="outline" className={`text-[11px] font-semibold shadow-none ${TONE_STYLES[tone]}`}>
      {label}
    </Badge>
  )
}

function SourceBadge({ children }: { children: ReactNode }) {
  return (
    <Badge
      variant="outline"
      className="border-white/10 bg-white/5 text-[11px] font-semibold text-slate-200 shadow-none"
    >
      {children}
    </Badge>
  )
}

function SmallAction({ href, label }: { href: string; label: string }) {
  return (
    <Button
      asChild
      size="sm"
      variant="outline"
      className="h-8 rounded-2xl border-white/10 bg-black/20 px-3 text-xs text-slate-200 hover:bg-white/5 hover:text-white"
    >
      <Link href={href}>
        {label}
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </Button>
  )
}

function SummaryStatCard({ stat }: { stat: CompanyHqSummaryStat }) {
  return (
    <Card className={PANEL_CLASS}>
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardDescription className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {stat.label}
          </CardDescription>
          <ToneBadge label={stat.label} tone={stat.tone} />
        </div>
        <CardTitle className="text-3xl font-semibold text-white">{stat.value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-slate-400">{stat.detail}</p>
      </CardContent>
    </Card>
  )
}

function RoleCard({ role }: { role: CompanyHqRole }) {
  const Icon = ROLE_ICONS[role.id as keyof typeof ROLE_ICONS] ?? Workflow

  return (
    <div className={`${INNER_PANEL_CLASS} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-cyan-200">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {role.owner}
            </p>
            <p className="mt-2 text-lg font-semibold text-white">{role.label}</p>
          </div>
        </div>
        <SourceBadge>{role.sourceLabel}</SourceBadge>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">{role.mission}</p>
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Current focus
        </p>
        <p className="mt-2 text-sm leading-6 text-white">{role.currentFocus}</p>
      </div>
      {role.href && role.hrefLabel ? (
        <div className="mt-4">
          <SmallAction href={role.href} label={role.hrefLabel} />
        </div>
      ) : null}
    </div>
  )
}

function WorkBucketCard({ bucket }: { bucket: CompanyHqBucket }) {
  return (
    <Card className={PANEL_CLASS}>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl text-white">{bucket.label}</CardTitle>
            <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
              {bucket.description}
            </CardDescription>
          </div>
          <ToneBadge label={bucket.label} tone={bucket.tone} />
        </div>
        <SourceBadge>{bucket.sourceLabel}</SourceBadge>
      </CardHeader>
      <CardContent className="space-y-3">
        {bucket.items.map((item) => (
          <div key={item.id} className={`${INNER_PANEL_CLASS} p-4`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                {item.owner ? <p className="mt-1 text-xs text-slate-500">{item.owner}</p> : null}
              </div>
              {item.statusLabel ? <ToneBadge label={item.statusLabel} tone={bucket.tone} /> : null}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">{item.detail}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <SourceBadge>{item.sourceLabel}</SourceBadge>
              {item.href && item.hrefLabel ? <SmallAction href={item.href} label={item.hrefLabel} /> : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function PilotCard({ partner }: { partner: CompanyHqPilotCard }) {
  return (
    <div className={`${INNER_PANEL_CLASS} p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
            {partner.label}
          </p>
          <p className="mt-2 text-xl font-semibold text-white">{partner.name}</p>
        </div>
        <ToneBadge label={partner.matched ? 'Matched in system' : 'Founder truth only'} tone={partner.matched ? 'good' : 'watch'} />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{partner.note}</p>
      <div className="mt-4 grid gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Portal status</p>
          <p className="mt-2 text-sm leading-6 text-white">{partner.portalStatus}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Activity</p>
          <p className="mt-2 text-sm leading-6 text-white">{partner.activitySummary}</p>
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">{partner.city} | {partner.detailSummary}</p>
    </div>
  )
}

function ReadinessCard({ item }: { item: CompanyHqReadinessItem }) {
  return (
    <div className={`${INNER_PANEL_CLASS} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-white">{item.workflow}</p>
          <p className="mt-1 text-xs text-slate-500">{item.owner}</p>
        </div>
        <ToneBadge label={item.statusLabel} tone={item.tone} />
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">{item.evidence}</p>
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Next move</p>
        <p className="mt-2 text-sm leading-6 text-white">{item.nextMove}</p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SourceBadge>{item.sourceLabel}</SourceBadge>
        {item.href ? <SmallAction href={item.href} label="Open surface" /> : null}
      </div>
    </div>
  )
}

export function CompanyHqDashboard({ snapshot }: { snapshot: CompanyHqSnapshot }) {
  return (
    <AdminPageLayout
      title="Company HQ"
      description="The founder operating layer above AI Company OS and OpenClaw. Keep real pilot truth, role ownership, and the next bottleneck visible in one place."
      roleLabel="Platform Admin"
      wide
      actions={
        <>
          <SmallAction href="/admin/ai-os" label="AI Company OS" />
          <SmallAction href="/admin/openclaw" label="OpenClaw Ops" />
          <SmallAction href="/admin/dashboard" label="Admin dashboard" />
        </>
      }
    >
      <div className="space-y-6">
        <Card className={PANEL_CLASS}>
          <CardHeader className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <ToneBadge label={snapshot.founderOverview.stage} tone="watch" />
              <ToneBadge label="R0 scheduled now" tone="critical" />
              <ToneBadge label={aiSignalModeLabel(snapshot.aiLayer.signalMode)} tone={snapshot.aiLayer.signalMode === 'live' ? 'good' : snapshot.aiLayer.signalMode === 'mixed' ? 'watch' : 'muted'} />
              <ToneBadge label={openClawModeLabel(snapshot.openClaw.mode)} tone={snapshot.openClaw.mode === 'filesystem' ? 'good' : 'watch'} />
            </div>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_360px]">
              <div className="grid gap-4 md:grid-cols-2">
                <div className={`${INNER_PANEL_CLASS} p-5 md:col-span-2`}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Top bottleneck</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{snapshot.founderOverview.topBottleneck}</p>
                </div>
                <div className={`${INNER_PANEL_CLASS} p-5`}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">This week focus</p>
                  <p className="mt-2 text-sm leading-6 text-white">{snapshot.founderOverview.thisWeekFocus}</p>
                </div>
                <div className={`${INNER_PANEL_CLASS} p-5`}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Revenue context</p>
                  <p className="mt-2 text-sm leading-6 text-white">{snapshot.founderOverview.revenueContext}</p>
                </div>
              </div>
              <div className={`${INNER_PANEL_CLASS} p-5`}>
                <div className="flex items-center gap-2 text-cyan-200">
                  <Sparkles className="h-4 w-4" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Founder signal layer</p>
                </div>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-white">HQ generated</p>
                    <p className="mt-1 text-sm text-slate-400">{formatDateTime(snapshot.generatedAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">AI Company OS</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {snapshot.aiLayer.enabled ? aiSignalModeLabel(snapshot.aiLayer.signalMode) : 'Feature flag off, fallback snapshot only'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Snapshot {formatDateTime(snapshot.aiLayer.generatedAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">OpenClaw</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {openClawModeLabel(snapshot.openClaw.mode)} | {snapshot.openClaw.runningCount} running | {snapshot.openClaw.queuedCount} queued
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Last update {formatDateTime(snapshot.openClaw.updatedAt ?? snapshot.generatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className={PANEL_CLASS}>
          <CardHeader>
            <CardTitle className="text-xl text-white">Where do I do this?</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-400">
              Use this task router when you need a direct answer instead of hunting through the sidebar.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ADMIN_TASK_ROUTER.map((item) => (
              <div key={item.task} className={`${INNER_PANEL_CLASS} p-4`}>
                <p className="text-sm font-semibold text-white">{item.task}</p>
                <div className="mt-3">
                  <SmallAction href={item.href} label={item.label} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {snapshot.summaryStats.map((stat) => (
            <SummaryStatCard key={stat.id} stat={stat} />
          ))}
        </div>

        <Card className={PANEL_CLASS}>
          <CardHeader>
            <CardTitle className="text-2xl text-white">Company hierarchy</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-400">
              Every role still belongs to the founder right now. The point of this layer is to keep ownership explicit and prevent strategic drift.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {snapshot.hierarchy.map((role) => (
              <RoleCard key={role.id} role={role} />
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-6 2xl:grid-cols-2">
          <Card className={PANEL_CLASS}>
            <CardHeader>
              <CardTitle className="text-2xl text-white">Roadmap</CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-400">
                Strategic sequencing for the founder lane: what matters now, what is next, what can wait, and what is deliberately parked.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-2">
              {snapshot.roadmap.map((bucket) => (
                <WorkBucketCard key={bucket.id} bucket={bucket} />
              ))}
            </CardContent>
          </Card>

          <Card className={PANEL_CLASS}>
            <CardHeader>
              <CardTitle className="text-2xl text-white">Backlog</CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-400">
                A founder-friendly board split between doc-backed lanes and explicit placeholders where durable product backlog wiring does not exist yet.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-2">
              {snapshot.backlog.map((bucket) => (
                <WorkBucketCard key={bucket.id} bucket={bucket} />
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className={PANEL_CLASS}>
          <CardHeader>
            <CardTitle className="text-2xl text-white">Pilot and founding-centre board</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-400">
              Only Bajabulile Day Care Centre and Sakhisizwe Day Care Centre count as truly onboarded ECD partners. Every other centre row in the system is demo/test only.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-3">
            {snapshot.pilotBoard.foundingPartners.map((partner) => (
              <PilotCard key={partner.id} partner={partner} />
            ))}
            <div className={`${INNER_PANEL_CLASS} p-5`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">Demo-only rows</p>
                  <p className="mt-2 text-xl font-semibold text-white">
                    {snapshot.pilotBoard.demoTesterCount === null ? 'Unknown' : snapshot.pilotBoard.demoTesterCount}
                  </p>
                </div>
                <ToneBadge label="Do not count as real pipeline" tone="watch" />
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300">{snapshot.pilotBoard.demoTesterSummary}</p>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Visible sample names</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {snapshot.pilotBoard.demoTesterNames.length > 0 ? (
                    snapshot.pilotBoard.demoTesterNames.map((name) => (
                      <SourceBadge key={name}>{name}</SourceBadge>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">No extra centre names are visible in the current snapshot.</p>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <SmallAction href="/admin/tenants" label="Open centres" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={PANEL_CLASS}>
          <CardHeader>
            <CardTitle className="text-2xl text-white">Product readiness</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-400">
              Major workflows and surfaces, scored for founder use with explicit evidence and next moves.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {snapshot.readiness.map((item) => (
              <ReadinessCard key={item.id} item={item} />
            ))}
          </CardContent>
        </Card>

        <Card className={PANEL_CLASS}>
          <CardHeader>
            <CardTitle className="text-2xl text-white">Founding notes</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-400">
              These notes keep the strategic layer honest when other admin tables or dashboards drift toward demo data or incomplete signals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.notes.map((note) => (
              <div key={note} className={`${INNER_PANEL_CLASS} p-4`}>
                <AdminInfoNote text={note} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminPageLayout>
  )
}
