import Link from 'next/link'
import {
  Activity,
  ArrowUpRight,
  Bot,
  Cable,
  CheckCircle2,
  FileClock,
  HardDriveDownload,
  RefreshCcw,
  Workflow,
} from 'lucide-react'
import { AdminInfoNote } from '@/components/admin/AdminInfoNote'
import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { FounderTruthPanel } from '@/components/admin/founder-truth-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  OpenClawCapability,
  OpenClawCommunicationItem,
  OpenClawOpsSnapshot,
  OpenClawWorkItem,
} from '@/lib/ai/openclaw-ops/types'

const PANEL_CLASS = 'border-white/10 bg-[#080B13] text-slate-50 shadow-none'
const MUTED_PANEL_CLASS = 'border-white/10 bg-[#0B1220] text-slate-50 shadow-none'

const CAPABILITY_STYLES: Record<OpenClawCapability['status'], string> = {
  live: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  future: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  unavailable: 'border-slate-500/30 bg-slate-500/10 text-slate-200',
}

function formatDateTime(value: string | null) {
  if (!value) return 'Not available yet'

  return new Date(value).toLocaleString('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatRelative(value: string | null) {
  if (!value) return 'No recent update'

  const differenceMs = Date.now() - Date.parse(value)
  const safeDifference = Number.isNaN(differenceMs) ? 0 : Math.max(differenceMs, 0)
  const minutes = Math.round(safeDifference / 60_000)

  if (minutes < 1) return 'Updated just now'
  if (minutes < 60) return `Updated ${minutes} min ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `Updated ${hours} hr ago`

  const days = Math.round(hours / 24)
  return `Updated ${days} day${days === 1 ? '' : 's'} ago`
}

function MetaPill({ children }: { children: React.ReactNode }) {
  return (
    <Badge
      variant="outline"
      className="border-white/10 bg-white/5 text-[11px] font-semibold text-slate-200 shadow-none hover:bg-white/5"
    >
      {children}
    </Badge>
  )
}

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string
  value: string
  detail: string
  icon: React.ReactNode
}) {
  return (
    <Card className={PANEL_CLASS}>
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardDescription className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {label}
          </CardDescription>
          <div className="rounded-full border border-white/10 bg-white/5 p-2 text-cyan-200">
            {icon}
          </div>
        </div>
        <CardTitle className="text-3xl font-semibold text-white">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-slate-400">{detail}</p>
      </CardContent>
    </Card>
  )
}

function CapabilityList({
  title,
  description,
  items,
}: {
  title: string
  description: string
  items: OpenClawCapability[]
}) {
  return (
    <Card className={MUTED_PANEL_CLASS}>
      <CardHeader>
        <CardTitle className="text-xl text-white">{title}</CardTitle>
        <CardDescription className="text-slate-400">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">{item.label}</p>
              <Badge
                variant="outline"
                className={`text-[11px] font-semibold shadow-none ${CAPABILITY_STYLES[item.status]}`}
              >
                {item.status === 'live'
                  ? 'Live now'
                  : item.status === 'future'
                  ? 'Future hook'
                  : 'Unavailable'}
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">{item.detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function EmptyCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Card className={MUTED_PANEL_CLASS}>
      <CardHeader>
        <CardTitle className="text-lg text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-slate-400">{description}</p>
      </CardContent>
    </Card>
  )
}

function WorkList({
  title,
  description,
  items,
  emptyTitle,
  emptyDescription,
}: {
  title: string
  description: string
  items: OpenClawWorkItem[]
  emptyTitle: string
  emptyDescription: string
}) {
  if (items.length === 0) {
    return <EmptyCard title={emptyTitle} description={emptyDescription} />
  }

  return (
    <Card className={PANEL_CLASS}>
      <CardHeader>
        <CardTitle className="text-xl text-white">{title}</CardTitle>
        <CardDescription className="text-slate-400">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-slate-500">
                  {item.ownerLabel} · {item.sourceLabel}
                </p>
              </div>
              <StatusBadge status={item.badgeTone} label={item.statusLabel} />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">{item.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.updatedAt ? <MetaPill>{formatRelative(item.updatedAt)}</MetaPill> : null}
              {item.startedAt ? <MetaPill>Started {formatDateTime(item.startedAt)}</MetaPill> : null}
              {item.sessionId ? <MetaPill>Session {item.sessionId.slice(0, 8)}</MetaPill> : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function CommunicationList({
  title,
  description,
  items,
  emptyTitle,
  emptyDescription,
}: {
  title: string
  description: string
  items: OpenClawCommunicationItem[]
  emptyTitle: string
  emptyDescription: string
}) {
  if (items.length === 0) {
    return <EmptyCard title={emptyTitle} description={emptyDescription} />
  }

  return (
    <Card className={PANEL_CLASS}>
      <CardHeader>
        <CardTitle className="text-xl text-white">{title}</CardTitle>
        <CardDescription className="text-slate-400">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-slate-500">
                  {item.ownerLabel} · {item.sourceLabel}
                </p>
              </div>
              {item.type === 'handoff' ? (
                <Badge
                  variant="outline"
                  className="border-cyan-500/30 bg-cyan-500/10 text-[11px] font-semibold text-cyan-200 shadow-none"
                >
                  Handoff
                </Badge>
              ) : item.type === 'request' ? (
                <Badge
                  variant="outline"
                  className="border-amber-500/30 bg-amber-500/10 text-[11px] font-semibold text-amber-200 shadow-none"
                >
                  Request
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 text-[11px] font-semibold text-emerald-200 shadow-none"
                >
                  Update
                </Badge>
              )}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">{item.excerpt}</p>
            <p className="mt-3 text-xs text-slate-500">{formatDateTime(item.timestamp)}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function OpenClawOpsDashboard({ snapshot }: { snapshot: OpenClawOpsSnapshot }) {
  const liveCapabilities = snapshot.capabilities.filter((item) => item.status === 'live')
  const futureCapabilities = snapshot.capabilities.filter((item) => item.status !== 'live')

  return (
    <AdminPageLayout
      title="OpenClaw Operations"
      description="Founder-facing visibility into local OpenClaw agents, recent work, and where the runtime integration is still deliberately incomplete."
      roleLabel="Platform Admin"
      wide
      actions={
        <>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
          >
            <Link href="/admin/hq">
              Company HQ
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
          >
            <Link href="/admin/ai-os">
              AI OS
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
          >
            <Link href="/admin/command">
              Operations
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <Card className={PANEL_CLASS}>
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant="outline"
                className={
                  snapshot.mode === 'filesystem'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200 shadow-none'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-200 shadow-none'
                }
              >
                {snapshot.mode === 'filesystem' ? 'Reading local OpenClaw state' : 'Safe placeholder mode'}
              </Badge>
              {snapshot.config.primaryModel ? <MetaPill>{snapshot.config.primaryModel}</MetaPill> : null}
              {snapshot.config.gatewayMode ? <MetaPill>Gateway {snapshot.config.gatewayMode}</MetaPill> : null}
              {snapshot.config.gatewayPort ? <MetaPill>Port {snapshot.config.gatewayPort}</MetaPill> : null}
            </div>
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-3">
                <CardTitle className="text-2xl text-white">
                  One calm place to see what OpenClaw is actually doing
                </CardTitle>
                <CardDescription className="max-w-3xl text-sm leading-6 text-slate-400">
                  This first version only reads server-local OpenClaw files. It does not try to shell
                  into the runtime or fake queue state. Live-capable data and future integration hooks
                  are separated on purpose so the founder can trust what is on the page, while the
                  business context stays aligned to the real pilot truth.
                </CardDescription>
                <AdminInfoNote text="The route stays read-only. No OpenClaw shell commands are executed from the app." />
              </div>
              <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5">
                <div className="flex items-center gap-2 text-cyan-200">
                  <RefreshCcw className="h-4 w-4" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Last update</p>
                </div>
                <p className="mt-3 text-lg font-semibold text-white">
                  {formatRelative(snapshot.lastUpdatedAt || snapshot.generatedAt)}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Snapshot generated {formatDateTime(snapshot.generatedAt)}
                </p>
                {snapshot.config.workspace ? (
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Workspace: {snapshot.config.workspace}
                  </p>
                ) : null}
              </div>
            </div>
          </CardHeader>
        </Card>

        <FounderTruthPanel
          truth={snapshot.founderTruth}
          title="Founder truth for OpenClaw context"
          description="OpenClaw visibility should stay grounded in the same canonical pilot and revenue truth as the rest of the admin AI surfaces."
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Agents"
            value={snapshot.agentCount.toString()}
            detail="Top-level OpenClaw agents visible from the local state directory."
            icon={<Bot className="h-4 w-4" />}
          />
          <MetricCard
            label="Subagents"
            value={snapshot.subagentCount.toString()}
            detail="Subagent sessions and archived handoffs the page could detect safely."
            icon={<Workflow className="h-4 w-4" />}
          />
          <MetricCard
            label="Running Now"
            value={snapshot.runningCount.toString()}
            detail="Agent or subagent sessions marked as actively running from recent local activity."
            icon={<Activity className="h-4 w-4" />}
          />
          <MetricCard
            label="Queued"
            value={snapshot.queuedCount.toString()}
            detail="Durable queued work only. If this is zero, OpenClaw is not persisting queue state here."
            icon={<FileClock className="h-4 w-4" />}
          />
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="h-auto rounded-2xl bg-[#0B1220] p-1">
            <TabsTrigger
              value="overview"
              className="rounded-2xl px-4 py-2 text-slate-300 data-[state=active]:bg-white data-[state=active]:text-slate-900"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="agents"
              className="rounded-2xl px-4 py-2 text-slate-300 data-[state=active]:bg-white data-[state=active]:text-slate-900"
            >
              Agents
            </TabsTrigger>
            <TabsTrigger
              value="work"
              className="rounded-2xl px-4 py-2 text-slate-300 data-[state=active]:bg-white data-[state=active]:text-slate-900"
            >
              Work
            </TabsTrigger>
            <TabsTrigger
              value="comms"
              className="rounded-2xl px-4 py-2 text-slate-300 data-[state=active]:bg-white data-[state=active]:text-slate-900"
            >
              Communication
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-2">
              <CapabilityList
                title="Live now"
                description="These signals are coming straight from local OpenClaw files on this server."
                items={
                  liveCapabilities.length > 0
                    ? liveCapabilities
                    : [
                        {
                          id: 'no-live-capabilities',
                          label: 'No live-capable signal found',
                          status: 'unavailable',
                          detail:
                            'OpenClaw state was not available to the app, so this page stayed in safe placeholder mode.',
                        },
                      ]
                }
              />
              <CapabilityList
                title="Future integration"
                description="These areas need a proper runtime heartbeat, queue feed, or remote-node bridge before the app should claim they are live."
                items={futureCapabilities}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className={PANEL_CLASS}>
                <CardHeader>
                  <CardTitle className="text-xl text-white">OpenClaw config</CardTitle>
                  <CardDescription className="text-slate-400">
                    Sanitized runtime shape only. Secrets and tokens stay out of the UI.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      State root
                    </p>
                    <p className="mt-2 text-sm text-slate-200">
                      {snapshot.config.stateRoot ?? 'Not configured'}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Max concurrent
                      </p>
                      <p className="mt-2 text-sm text-slate-200">
                        {snapshot.config.maxConcurrent ?? 'Not set'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Subagent max
                      </p>
                      <p className="mt-2 text-sm text-slate-200">
                        {snapshot.config.subagentMaxConcurrent ?? 'Not set'}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Gateway
                    </p>
                    <p className="mt-2 text-sm text-slate-200">
                      {snapshot.config.gatewayMode ?? 'Unknown'} · {snapshot.config.gatewayBind ?? 'Unknown bind'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className={MUTED_PANEL_CLASS}>
                <CardHeader>
                  <CardTitle className="text-xl text-white">Founder notes</CardTitle>
                  <CardDescription className="text-slate-400">
                    Operational caveats surfaced with the same data contract as the page.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {snapshot.notes.map((note, index) => (
                    <div
                      key={`${note}-${index}`}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300"
                    >
                      {note}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="agents" className="space-y-6">
            <div className="grid gap-4 xl:grid-cols-2">
              {snapshot.agents.map((agent) => (
                <Card key={agent.id} className={PANEL_CLASS}>
                  <CardHeader className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <CardDescription className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Agent
                        </CardDescription>
                        <CardTitle className="mt-2 text-xl text-white">{agent.name}</CardTitle>
                      </div>
                      <StatusBadge status={agent.badgeTone} label={agent.statusLabel} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {agent.model ? <MetaPill>{agent.model}</MetaPill> : null}
                      {agent.channel ? <MetaPill>Channel {agent.channel}</MetaPill> : null}
                      {agent.sessionId ? <MetaPill>Session {agent.sessionId.slice(0, 8)}</MetaPill> : null}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm leading-6 text-slate-400">{agent.summary}</p>
                    {agent.lastWork ? (
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Last work
                        </p>
                        <p className="mt-2 text-sm text-slate-200">{agent.lastWork}</p>
                      </div>
                    ) : null}
                    <p className="text-xs text-slate-500">
                      {agent.sourceLabel} · {formatDateTime(agent.updatedAt)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {snapshot.subagents.length > 0 ? (
              <Card className={PANEL_CLASS}>
                <CardHeader>
                  <CardTitle className="text-xl text-white">Subagents and archived runs</CardTitle>
                  <CardDescription className="text-slate-400">
                    Each row is a detected subagent session or archived handoff transcript.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-slate-500">Subagent</TableHead>
                        <TableHead className="text-slate-500">Task</TableHead>
                        <TableHead className="text-slate-500">Status</TableHead>
                        <TableHead className="text-slate-500">Last update</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {snapshot.subagents.map((subagent) => (
                        <TableRow key={subagent.id} className="border-white/10 hover:bg-white/[0.02]">
                          <TableCell className="py-4">
                            <p className="font-semibold text-white">{subagent.name}</p>
                            <p className="mt-1 text-xs text-slate-500">{subagent.sourceLabel}</p>
                          </TableCell>
                          <TableCell className="py-4 text-sm text-slate-300">
                            {subagent.lastWork ?? subagent.summary}
                          </TableCell>
                          <TableCell className="py-4">
                            <StatusBadge status={subagent.badgeTone} label={subagent.statusLabel} />
                          </TableCell>
                          <TableCell className="py-4 text-sm text-slate-400">
                            {formatDateTime(subagent.updatedAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <EmptyCard
                title="No subagent sessions detected"
                description="The parser is ready for subagent transcripts, but OpenClaw has not persisted any visible subagent runs on this machine yet."
              />
            )}
          </TabsContent>

          <TabsContent value="work" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-3">
              <WorkList
                title="Running and recent"
                description="Live sessions and background work that still look active from the local filesystem."
                items={snapshot.activeWork}
                emptyTitle="No live work detected"
                emptyDescription="Nothing currently looks active from the local OpenClaw session files."
              />
              <WorkList
                title="Queue"
                description="Only durable queued work is shown here. If the queue is empty, the runtime is not writing queue state yet."
                items={snapshot.queuedWork}
                emptyTitle="No durable queue items"
                emptyDescription="runs.json is empty right now, so the app does not have a safe queue feed to show."
              />
              <WorkList
                title="Completed recently"
                description="Archived sessions and completed runs that closed cleanly enough to surface as founder history."
                items={snapshot.completedWork}
                emptyTitle="No completed history yet"
                emptyDescription="Completed work will appear here once OpenClaw closes sessions or subagent runs."
              />
            </div>
          </TabsContent>

          <TabsContent value="comms" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-2">
              <CommunicationList
                title="Recent communication"
                description="Last visible requests and updates pulled from session transcripts."
                items={snapshot.communications}
                emptyTitle="No communication captured"
                emptyDescription="The current OpenClaw session files did not expose any recent founder or agent messages."
              />
              <CommunicationList
                title="Recent handoffs"
                description="Subagent completions and handoff-style summaries when archived transcripts are available."
                items={snapshot.handoffs}
                emptyTitle="No handoffs captured"
                emptyDescription="Handoffs will show up here once OpenClaw writes archived subagent transcripts with a final assistant summary."
              />
            </div>
          </TabsContent>
        </Tabs>

        <Card className={MUTED_PANEL_CLASS}>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-xl text-white">Safe integration boundary</CardTitle>
              <CardDescription className="mt-2 max-w-3xl text-slate-400">
                This view intentionally stops at file-based visibility. If you later want true running
                process status, cross-device nodes, or real queue depth in production, add a dedicated
                OpenClaw heartbeat or snapshot sync service instead of letting the web app shell into the
                runtime.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <MetaPill>
                <HardDriveDownload className="h-3.5 w-3.5" />
                File-based v1
              </MetaPill>
              <MetaPill>
                <Cable className="h-3.5 w-3.5" />
                Runtime bridge later
              </MetaPill>
              <MetaPill>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Founder-safe
              </MetaPill>
            </div>
          </CardHeader>
        </Card>
      </div>
    </AdminPageLayout>
  )
}
