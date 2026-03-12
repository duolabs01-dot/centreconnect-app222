import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { AiCompanyAgentId, AiCompanySignalMode } from '@/lib/ai/company-os/types'
import { getAiCompanyOperatingSystemSnapshot } from '@/lib/ai/company-os/service'
import type { OpenClawOpsMode } from '@/lib/ai/openclaw-ops/types'
import { getOpenClawOpsSnapshot } from '@/lib/ai/openclaw-ops/service'
import { createAdminClient } from '@/lib/supabase/admin'

const OPEN_SUPPORT_STATUSES = ['open', 'in_progress', 'waiting_response'] as const
const BACKLOG_DOC_PATH = 'docs/BACKLOG_EXECUTION_SCOREBOARD.md'

type CentreRow = {
  id: string
  name: string | null
  slug: string | null
  city: string | null
  is_active: boolean | null
  onboarding_complete: boolean | null
  is_registered: boolean | null
  created_at: string | null
}

type ApplicationRow = {
  id: string
  ecd_id: string | null
  status: string | null
  created_at: string | null
}

type AnalyticsRow = {
  ecd_id: string | null
  event_type: string | null
  created_at: string | null
}

type CountResult = {
  count: number | null
  error?: { message?: string } | null
}

type RowsResult<T> = {
  data: T[] | null
  error?: { message?: string } | null
}

export type CompanyHqTone = 'good' | 'watch' | 'critical' | 'muted' | 'info'

export type CompanyHqSummaryStat = {
  id: string
  label: string
  value: string
  detail: string
  tone: CompanyHqTone
}

export type CompanyHqRole = {
  id: string
  label: string
  owner: string
  mission: string
  currentFocus: string
  href?: string
  hrefLabel?: string
  sourceLabel: string
}

export type CompanyHqWorkItem = {
  id: string
  title: string
  detail: string
  owner?: string
  href?: string
  hrefLabel?: string
  statusLabel?: string
  sourceLabel: string
}

export type CompanyHqBucket = {
  id: string
  label: string
  description: string
  sourceLabel: string
  tone: CompanyHqTone
  items: CompanyHqWorkItem[]
}

export type CompanyHqPilotCard = {
  id: string
  name: string
  label: string
  note: string
  matched: boolean
  city: string
  portalStatus: string
  activitySummary: string
  detailSummary: string
}

export type CompanyHqReadinessItem = {
  id: string
  workflow: string
  statusLabel: string
  tone: CompanyHqTone
  owner: string
  evidence: string
  nextMove: string
  sourceLabel: string
  href?: string
}

export type CompanyHqSnapshot = {
  generatedAt: string
  founderOverview: {
    stage: string
    topBottleneck: string
    thisWeekFocus: string
    revenueContext: string
  }
  summaryStats: CompanyHqSummaryStat[]
  hierarchy: CompanyHqRole[]
  roadmap: CompanyHqBucket[]
  backlog: CompanyHqBucket[]
  pilotBoard: {
    foundingPartners: CompanyHqPilotCard[]
    demoTesterCount: number | null
    demoTesterSummary: string
    demoTesterNames: string[]
  }
  readiness: CompanyHqReadinessItem[]
  aiLayer: {
    enabled: boolean
    signalMode: AiCompanySignalMode
    generatedAt: string
  }
  openClaw: {
    mode: OpenClawOpsMode
    runningCount: number
    queuedCount: number
    updatedAt: string | null
  }
  notes: string[]
}

type BacklogDocumentItem = {
  id: string
  title: string
  detail: string
  statusLabel?: string
}

function normalizeIdentifier(value?: string | null) {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getSection(markdown: string, heading: string) {
  const pattern = new RegExp(
    `##\\s+${escapeRegExp(heading)}\\r?\\n([\\s\\S]*?)(?=\\r?\\n##\\s+|$)`,
    'm'
  )

  return markdown.match(pattern)?.[1]?.trim() ?? ''
}

function parseBacklogSection(markdown: string) {
  const items: BacklogDocumentItem[] = []
  let current: BacklogDocumentItem | null = null

  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith('- ')) {
      const match = line.match(
        /^- (?:\[([A-Z]+)\]\s*)?(?:`([^`]+)`\s*)?(?:`([^`]+)`\s*)?(.+)$/
      )

      const rawTitle = match?.[4]?.trim() ?? line.replace(/^- /, '').trim()
      const fallbackIdMatch = rawTitle.match(/^(BL-[A-Z]+-\d+)\s+(.*)$/)
      const id = match?.[2] ?? fallbackIdMatch?.[1] ?? `doc-${items.length + 1}`
      const title = (fallbackIdMatch?.[2] ?? rawTitle).trim()

      current = {
        id,
        title,
        detail: '',
        statusLabel: match?.[1] ?? undefined,
      }
      items.push(current)
      continue
    }

    if (!current || !line.startsWith('  - ')) continue

    const detail = line.replace(/^  - /, '').trim()
    current.detail = current.detail ? `${current.detail} ${detail}` : detail
  }

  return items
}

async function readBacklogDocument() {
  try {
    return await readFile(path.join(process.cwd(), BACKLOG_DOC_PATH), 'utf8')
  } catch {
    return ''
  }
}

function safeCount(result: CountResult, issues: string[], label: string) {
  if (result.error) {
    issues.push(label)
    return 0
  }

  return result.count ?? 0
}

function safeRows<T>(result: RowsResult<T>, issues: string[], label: string) {
  if (result.error) {
    issues.push(label)
    return [] as T[]
  }

  return (result.data ?? []) as T[]
}

function ownerFromAgent(agentId: AiCompanyAgentId) {
  if (agentId === 'ceo') return 'Founder / CEO'
  if (agentId === 'cto') return 'CTO'
  if (agentId === 'ops') return 'Ops'
  return 'Growth'
}

function toneFromSignalMode(signalMode: AiCompanySignalMode): CompanyHqTone {
  if (signalMode === 'live') return 'good'
  if (signalMode === 'mixed') return 'watch'
  return 'muted'
}

function toneFromOpenClawMode(mode: OpenClawOpsMode): CompanyHqTone {
  return mode === 'filesystem' ? 'good' : 'watch'
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not available yet'

  return new Date(value).toLocaleString('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function mapRoadmapBucket(
  label: string,
  id: string,
  tone: CompanyHqTone,
  description: string,
  items: Array<{
    id: string
    title: string
    summary: string
    owner: string
    href?: string
    hrefLabel?: string
  }>,
  sourceLabel: string
): CompanyHqBucket {
  return {
    id,
    label,
    description,
    tone,
    sourceLabel,
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.summary,
      owner: item.owner,
      href: item.href,
      hrefLabel: item.hrefLabel,
      sourceLabel,
    })),
  }
}

export async function getCompanyHqSnapshot(input?: {
  ownerEmail?: string | null
}): Promise<CompanyHqSnapshot> {
  const admin = createAdminClient()
  const issues: string[] = []
  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    aiSnapshot,
    openClawSnapshot,
    centresResult,
    applicationsResult,
    parentFailuresResult,
    supportTicketsResult,
    analyticsResult,
    backlogMarkdown,
  ] = await Promise.all([
    getAiCompanyOperatingSystemSnapshot({ ownerEmail: input?.ownerEmail ?? null }),
    getOpenClawOpsSnapshot(),
    admin
      .from('ecd_centres')
      .select('id,name,slug,city,is_active,onboarding_complete,is_registered,created_at')
      .order('created_at', { ascending: false }),
    admin.from('applications').select('id,ecd_id,status,created_at'),
    admin
      .from('parent_form_submit_failures')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', twentyFourHoursAgo),
    admin
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .in('status', [...OPEN_SUPPORT_STATUSES]),
    admin
      .from('ecd_analytics_events')
      .select('ecd_id,event_type,created_at')
      .gte('created_at', sevenDaysAgo),
    readBacklogDocument(),
  ])

  const centres = safeRows(centresResult as RowsResult<CentreRow>, issues, 'ecd_centres')
  const applications = safeRows(
    applicationsResult as RowsResult<ApplicationRow>,
    issues,
    'applications'
  )
  const analytics = safeRows(
    analyticsResult as RowsResult<AnalyticsRow>,
    issues,
    'ecd_analytics_events'
  )
  const parentFailures24h = safeCount(
    parentFailuresResult as CountResult,
    issues,
    'parent_form_submit_failures'
  )
  const openSupportTickets = safeCount(
    supportTicketsResult as CountResult,
    issues,
    'support_tickets'
  )

  const foundingPartners = aiSnapshot.founderTruth.foundingPartners
  const foundingRows = foundingPartners.map((partner) =>
    centres.find((centre) => {
      const normalizedName = normalizeIdentifier(centre.name)
      const normalizedSlug = normalizeIdentifier(centre.slug)
      const needle = normalizeIdentifier(partner.name)

      return normalizedName.includes(needle) || normalizedSlug.includes(needle)
    }) ?? null
  )

  const foundingCounts = new Map<
    string,
    {
      children: number
      attendance: number
      applications: number
    }
  >()

  await Promise.all(
    foundingRows
      .filter((row): row is CentreRow => Boolean(row))
      .map(async (row) => {
        const [childrenResult, attendanceResult, applicationCountResult] = await Promise.all([
          admin.from('children').select('id', { count: 'exact', head: true }).eq('ecd_id', row.id),
          admin.from('attendance').select('id', { count: 'exact', head: true }).eq('ecd_id', row.id),
          admin.from('applications').select('id', { count: 'exact', head: true }).eq('ecd_id', row.id),
        ])

        foundingCounts.set(row.id, {
          children: childrenResult.error ? 0 : childrenResult.count ?? 0,
          attendance: attendanceResult.error ? 0 : attendanceResult.count ?? 0,
          applications: applicationCountResult.error ? 0 : applicationCountResult.count ?? 0,
        })

        if (childrenResult.error) issues.push(`children:${row.id}`)
        if (attendanceResult.error) issues.push(`attendance:${row.id}`)
        if (applicationCountResult.error) issues.push(`applications:${row.id}`)
      })
  )

  const demoCentres = centres.filter((centre) => {
    const normalizedName = normalizeIdentifier(centre.name)
    const normalizedSlug = normalizeIdentifier(centre.slug)

    return !foundingPartners.some((partner) => {
      const needle = normalizeIdentifier(partner.name)
      return normalizedName.includes(needle) || normalizedSlug.includes(needle)
    })
  })

  const profileViews7d = analytics.filter((event) => event.event_type === 'profile_view').length
  const contactClicks7d = analytics.filter(
    (event) => event.event_type === 'whatsapp_click' || event.event_type === 'call_click'
  ).length
  const applications7d = applications.filter((application) => {
    if (!application.created_at) return false
    return Date.parse(application.created_at) >= Date.parse(sevenDaysAgo)
  }).length

  const totalFoundingChildren = foundingRows.reduce((sum, row) => {
    if (!row) return sum
    return sum + (foundingCounts.get(row.id)?.children ?? 0)
  }, 0)
  const totalFoundingAttendance = foundingRows.reduce((sum, row) => {
    if (!row) return sum
    return sum + (foundingCounts.get(row.id)?.attendance ?? 0)
  }, 0)
  const completeFoundingOnboarding = foundingRows.filter(
    (row) => row?.onboarding_complete === true
  ).length
  const activeFoundingRows = foundingRows.filter((row) => row?.is_active === true).length

  const ceoBrief = aiSnapshot.agents.find((agent) => agent.agentId === 'ceo')
  const ctoBrief = aiSnapshot.agents.find((agent) => agent.agentId === 'cto')
  const opsBrief = aiSnapshot.agents.find((agent) => agent.agentId === 'ops')
  const growthBrief = aiSnapshot.agents.find((agent) => agent.agentId === 'growth')
  const dailyFocus = aiSnapshot.workflows.find((workflow) => workflow.id === 'daily_focus')
  const topFocusItem = dailyFocus?.items[0]

  const summaryStats: CompanyHqSummaryStat[] = [
    {
      id: 'real-partners',
      label: 'Real founding centres',
      value: aiSnapshot.founderTruth.partnerCount.toString(),
      detail: foundingPartners.map((partner) => partner.name).join(' + '),
      tone: 'good',
    },
    {
      id: 'demo-testers',
      label: 'Prospect centres not yet onboarded',
      value:
        aiSnapshot.founderTruth.demoTesterCentreCount === null
          ? 'Unknown'
          : aiSnapshot.founderTruth.demoTesterCentreCount.toString(),
      detail: aiSnapshot.founderTruth.demoTesterSummary,
      tone:
        aiSnapshot.founderTruth.demoTesterCentreCount &&
        aiSnapshot.founderTruth.demoTesterCentreCount > 0
          ? 'watch'
          : 'muted',
    },
    {
      id: 'scheduled-money',
      label: 'Money scheduled now',
      value: 'R0',
      detail: aiSnapshot.founderTruth.revenueSummary,
      tone: 'critical',
    },
    {
      id: 'trust-alerts',
      label: 'Parent failures (24h)',
      value: parentFailures24h.toString(),
      detail:
        parentFailures24h > 0
          ? 'Contain visible parent friction before widening scope.'
          : 'No tracked parent submit failures in the last 24 hours.',
      tone: parentFailures24h > 0 ? 'watch' : 'good',
    },
  ]

  const hierarchy: CompanyHqRole[] = [
    {
      id: 'founder-ceo',
      label: 'Founder / CEO',
      owner: 'Founder, with AI OS advisory',
      mission: 'Pick the bottleneck closest to real partner value, activation, and eventual payment readiness.',
      currentFocus:
        ceoBrief?.headline ??
        'Run the company from active partner centres, and track prospect rows separately until onboarding is complete.',
      href: '/admin/ai-os/ceo',
      hrefLabel: 'Open CEO brief',
      sourceLabel: 'AI Company OS founder brief',
    },
    {
      id: 'cto',
      label: 'CTO',
      owner: 'Founder, with AI OS advisory',
      mission: 'Protect trust, reliability, and shared source-of-truth logic across admin surfaces.',
      currentFocus:
        ctoBrief?.headline ?? 'Fix the visible failure path before adding another layer.',
      href: '/admin/ai-os/cto',
      hrefLabel: 'Open CTO brief',
      sourceLabel: 'AI Company OS reliability brief',
    },
    {
      id: 'ops',
      label: 'Ops',
      owner: 'Founder',
      mission: 'Keep Bajabulile and Sakhisizwe moving through setup, support, and follow-through without losing the thread.',
      currentFocus:
        opsBrief?.headline ??
        'Founding partner follow-through still needs tight human ops discipline.',
      href: '/admin/tenants',
      hrefLabel: 'Open centres',
      sourceLabel: 'Live admin queue + AI OS ops brief',
    },
    {
      id: 'ux-product',
      label: 'UX / Product',
      owner: 'Founder',
      mission: 'Reduce friction in parent and ECD paths so the product feels calm, trustworthy, and obvious to use.',
      currentFocus:
        'Keep the next iteration anchored to trust-critical paths, especially onboarding, parent submissions, and daily pilot use.',
      href: '/admin/parent-reliability',
      hrefLabel: 'Open reliability',
      sourceLabel: 'Founder-managed product lane',
    },
    {
      id: 'growth',
      label: 'Growth',
      owner: 'Founder, with AI OS advisory',
      mission: 'Turn real demand into trustworthy applications without letting not-yet-onboarded prospect rows distort the funnel story.',
      currentFocus:
        growthBrief?.headline ??
        'Demand exists, but the funnel still needs one careful repair at a time.',
      href: '/admin/analytics',
      hrefLabel: 'Open analytics',
      sourceLabel: 'AI Company OS growth brief',
    },
    {
      id: 'support',
      label: 'Support',
      owner: 'Founder on WhatsApp + admin queue',
      mission: 'Keep support pressure contained so real pilot issues do not disappear behind backlog noise.',
      currentFocus: `${openSupportTickets} support threads are open in the admin queue right now.`,
      href: '/admin/support',
      hrefLabel: 'Open support',
      sourceLabel: 'Live support queue',
    },
    {
      id: 'automation-openclaw',
      label: 'Automation / OpenClaw',
      owner: 'Founder + local runtime tooling',
      mission: 'Provide safe founder visibility into local agent work without turning the app into a runtime controller.',
      currentFocus:
        openClawSnapshot.mode === 'filesystem'
          ? `Reading local OpenClaw state with ${openClawSnapshot.runningCount} running and ${openClawSnapshot.queuedCount} queued durable work items.`
          : 'OpenClaw is in safe placeholder mode, so treat it as a visibility stub rather than a control plane.',
      href: '/admin/openclaw',
      hrefLabel: 'Open OpenClaw',
      sourceLabel: 'OpenClaw local snapshot',
    },
  ]

  const roadmap: CompanyHqBucket[] = [
    mapRoadmapBucket(
      'Now',
      'now',
      'critical',
      'Immediate founder work from the live AI Company OS queue.',
      aiSnapshot.queues
        .filter((item) => item.priority === 'now')
        .map((item) => ({
          id: item.id,
          title: item.title,
          summary: item.summary,
          owner: ownerFromAgent(item.ownerAgentId),
          href: item.href,
          hrefLabel: item.actionLabel,
        })),
      'AI Company OS live founder queue'
    ),
    mapRoadmapBucket(
      'Next',
      'next',
      'watch',
      'Important work that should follow once the current bottleneck is under control.',
      aiSnapshot.queues
        .filter((item) => item.priority === 'next')
        .map((item) => ({
          id: item.id,
          title: item.title,
          summary: item.summary,
          owner: ownerFromAgent(item.ownerAgentId),
          href: item.href,
          hrefLabel: item.actionLabel,
        })),
      'AI Company OS live founder queue'
    ),
    mapRoadmapBucket(
      'Later',
      'later',
      'muted',
      'Work that is understood but should not outrank current founder pressure.',
      aiSnapshot.queues
        .filter((item) => item.priority === 'later')
        .map((item) => ({
          id: item.id,
          title: item.title,
          summary: item.summary,
          owner: ownerFromAgent(item.ownerAgentId),
          href: item.href,
          hrefLabel: item.actionLabel,
        })),
      'AI Company OS live founder queue'
    ),
    {
      id: 'parked',
      label: 'Parked',
      description: 'Deliberately held back until pilot truth, signal quality, and founder bandwidth improve.',
      sourceLabel: 'Founder-managed park list from AI OS + admin audit docs',
      tone: 'muted',
      items: [
        {
          id: 'parked-autonomous-ai',
          title: 'Autonomous AI actions from admin surfaces',
          detail:
            'Parked until confirmation flows, audit logging, and founder signal quality are trustworthy enough to automate safely.',
          owner: 'Founder / CTO',
          href: '/admin/ai-os',
          hrefLabel: 'Open AI OS',
          sourceLabel: 'docs/ai-company-operating-system-plan.md',
        },
        {
          id: 'parked-external-briefs',
          title: 'External CEO / CTO brief sharing',
          detail:
            'Parked until access rules, redaction, and audience-specific messaging are stable.',
          owner: 'Founder / CEO',
          href: '/admin/ai-os',
          hrefLabel: 'Open AI OS',
          sourceLabel: 'docs/ai-company-operating-system-plan.md',
        },
        {
          id: 'parked-broader-rollout',
          title: 'Broader centre expansion beyond the two founding partners',
          detail:
            'Parked until Bajabulile and Sakhisizwe are stable, using the product, and credible as the real operating base.',
          owner: 'Founder / Ops',
          href: '/admin/tenants',
          hrefLabel: 'Open centres',
          sourceLabel: 'Founder-managed business truth',
        },
      ],
    },
  ]

  const nowBacklog = parseBacklogSection(getSection(backlogMarkdown, 'Now'))
  const nextBacklog = parseBacklogSection(getSection(backlogMarkdown, 'Next'))
  const blockedBacklog = parseBacklogSection(getSection(backlogMarkdown, 'Blocked'))
  const doneBacklog = parseBacklogSection(getSection(backlogMarkdown, 'Done This Week')).slice(0, 8)

  const backlog: CompanyHqBucket[] = [
    {
      id: 'comprehended',
      label: 'Comprehended',
      description: 'This lane is not wired to a durable table yet, so these are founder-managed placeholders for understood work.',
      sourceLabel: 'Founder-managed placeholder from AI OS follow-up docs',
      tone: 'muted',
      items: [
        {
          id: 'cmp-centre-readiness',
          title: 'Centre-level founder readiness table',
          detail:
            'Surface which centres are closest to going live, paying, or churning so founder reviews stop relying on aggregate counts only.',
          owner: 'Founder / CEO',
          href: '/admin/hq',
          hrefLabel: 'Stay in HQ',
          sourceLabel: 'docs/ai-company-operating-system-plan.md',
        },
        {
          id: 'cmp-demand-outcomes',
          title: 'Join demand signals to real centre outcomes',
          detail:
            'Connect profile views, contacts, and applications to actual centre outcomes so growth decisions stop leaning on proxy rates alone.',
          owner: 'Founder / Growth',
          href: '/admin/analytics',
          hrefLabel: 'Open analytics',
          sourceLabel: 'docs/ai-company-operating-system-plan.md',
        },
      ],
    },
    {
      id: 'queued',
      label: 'Queued',
      description: 'Doc-backed next work that is defined enough to queue, but not yet active.',
      sourceLabel: `Doc-backed from ${BACKLOG_DOC_PATH}`,
      tone: 'watch',
      items:
        nextBacklog.length > 0
          ? nextBacklog.map((item) => ({
              id: item.id,
              title: item.title,
              detail: item.detail || 'Queued in the founder backlog doc.',
              statusLabel: item.statusLabel,
              sourceLabel: `Doc-backed from ${BACKLOG_DOC_PATH}`,
            }))
          : [
              {
                id: 'queued-placeholder',
                title: 'Next queue not wired beyond the backlog doc yet',
                detail:
                  'Use the doc-backed Next section as the queue source until a durable founder backlog model exists.',
                sourceLabel: `Doc-backed from ${BACKLOG_DOC_PATH}`,
              },
            ],
    },
    {
      id: 'in-progress',
      label: 'In Progress',
      description: 'The currently active founder lane from the backlog doc.',
      sourceLabel: `Doc-backed from ${BACKLOG_DOC_PATH}`,
      tone: 'info',
      items:
        nowBacklog.length > 0
          ? nowBacklog.map((item) => ({
              id: item.id,
              title: item.title,
              detail: item.detail || 'Active in the founder backlog doc.',
              statusLabel: item.statusLabel,
              sourceLabel: `Doc-backed from ${BACKLOG_DOC_PATH}`,
            }))
          : [
              {
                id: 'in-progress-placeholder',
                title: 'No active backlog item parsed',
                detail:
                  'If this is unexpected, refresh the backlog doc structure so HQ can keep showing the live founder lane.',
                sourceLabel: `Doc-backed from ${BACKLOG_DOC_PATH}`,
              },
            ],
    },
    {
      id: 'blocked',
      label: 'Blocked',
      description: 'Known work that is blocked and should stay visible without stealing focus from the live lane.',
      sourceLabel: `Doc-backed from ${BACKLOG_DOC_PATH}`,
      tone: 'critical',
      items:
        blockedBacklog.length > 0
          ? blockedBacklog.map((item) => ({
              id: item.id,
              title: item.title,
              detail: item.detail || 'Blocked in the founder backlog doc.',
              statusLabel: item.statusLabel,
              sourceLabel: `Doc-backed from ${BACKLOG_DOC_PATH}`,
            }))
          : [
              {
                id: 'blocked-placeholder',
                title: 'No blocked work listed',
                detail: 'Nothing is explicitly blocked in the current founder backlog doc.',
                sourceLabel: `Doc-backed from ${BACKLOG_DOC_PATH}`,
              },
            ],
    },
    {
      id: 'done',
      label: 'Done',
      description: 'Recent completions from the founder execution scoreboard.',
      sourceLabel: `Doc-backed from ${BACKLOG_DOC_PATH}`,
      tone: 'good',
      items:
        doneBacklog.length > 0
          ? doneBacklog.map((item) => ({
              id: item.id,
              title: item.title,
              detail: item.detail || 'Marked done in the founder backlog doc.',
              statusLabel: item.statusLabel,
              sourceLabel: `Doc-backed from ${BACKLOG_DOC_PATH}`,
            }))
          : [
              {
                id: 'done-placeholder',
                title: 'No recent completed items parsed',
                detail: 'This lane depends on the Done This Week section of the backlog doc.',
                sourceLabel: `Doc-backed from ${BACKLOG_DOC_PATH}`,
              },
            ],
    },
  ]

  const pilotBoard = {
    foundingPartners: foundingPartners.map((partner, index) => {
      const row = foundingRows[index]
      const counts = row ? foundingCounts.get(row.id) : null

      return {
        id: normalizeIdentifier(partner.name),
        name: partner.name,
        label: partner.label,
        note: partner.note,
        matched: Boolean(row),
        city: row?.city?.trim() || 'City not captured yet',
        portalStatus: !row
          ? 'No matching centre record found in admin tables yet.'
          : row.onboarding_complete
          ? 'Onboarding marked complete in the portal.'
          : 'Still needs onboarding closure or founder follow-through.',
        activitySummary: !row
          ? 'No live portal activity could be verified from the system row.'
          : `${counts?.children ?? 0} children, ${counts?.attendance ?? 0} attendance marks, ${counts?.applications ?? 0} applications linked to this centre row.`,
        detailSummary: !row
          ? 'Treat this as a real founding partner regardless of missing system detail.'
          : `${row.is_active ? 'Published' : 'Not published'} | ${row.is_registered ? 'Registered' : 'Registration not confirmed'} | Created ${formatDateTime(row.created_at)}`,
      }
    }),
    demoTesterCount: aiSnapshot.founderTruth.demoTesterCentreCount,
    demoTesterSummary: aiSnapshot.founderTruth.demoTesterSummary,
    demoTesterNames: demoCentres
      .map((centre) => centre.name?.trim())
      .filter((name): name is string => Boolean(name))
      .slice(0, 6),
  }

  const readiness: CompanyHqReadinessItem[] = [
    {
      id: 'founder-hq',
      workflow: 'Founder control room',
      statusLabel: 'Live now',
      tone: 'good',
      owner: 'Founder / CEO',
      evidence:
        'This page now holds founder truth, role ownership, roadmap, backlog, pilot board, and readiness in one place.',
      nextMove: 'Keep HQ as the first admin layer above AI Company OS and OpenClaw.',
      sourceLabel: 'This route',
      href: '/admin/hq',
    },
    {
      id: 'parent-discovery',
      workflow: 'Parent discovery and demand',
      statusLabel: profileViews7d > 0 ? 'Live signal' : 'Thin signal',
      tone: profileViews7d > 0 ? 'good' : 'watch',
      owner: 'Growth',
      evidence: `${profileViews7d} profile views and ${contactClicks7d} contact clicks were tracked in the last 7 days.`,
      nextMove: 'Keep traffic pointed at strong real partner profiles before widening acquisition.',
      sourceLabel: 'Live analytics events',
      href: '/admin/analytics',
    },
    {
      id: 'parent-apply',
      workflow: 'Parent application path',
      statusLabel:
        parentFailures24h > 0 ? 'Watch' : applications7d > 0 ? 'Live signal' : 'Quiet',
      tone: parentFailures24h > 0 ? 'watch' : applications7d > 0 ? 'good' : 'muted',
      owner: 'CTO / UX',
      evidence: `${applications7d} application rows were created in the last 7 days and ${parentFailures24h} parent submit failures were tracked in the last 24 hours.`,
      nextMove: 'Protect trust on the visible submit path before adding new surface area.',
      sourceLabel: 'Live applications + failure telemetry',
      href: '/admin/parent-reliability?window=24h',
    },
    {
      id: 'ecd-onboarding',
      workflow: 'ECD onboarding',
      statusLabel:
        completeFoundingOnboarding === foundingPartners.length
          ? 'Founder-assisted live'
          : 'Needs closure',
      tone:
        completeFoundingOnboarding === foundingPartners.length && activeFoundingRows > 0
          ? 'good'
          : 'watch',
      owner: 'Ops',
      evidence: `${completeFoundingOnboarding}/${foundingPartners.length} founding partner rows show onboarding complete, and ${activeFoundingRows}/${foundingPartners.length} are active in system flags.`,
      nextMove: 'Keep Bajabulile and Sakhisizwe as the only real onboarding lane.',
      sourceLabel: 'Live centre rows + founder truth',
      href: '/admin/tenants',
    },
    {
      id: 'ecd-daily-ops',
      workflow: 'ECD daily operations',
      statusLabel:
        totalFoundingAttendance > 0
          ? 'Pilot activity detected'
          : totalFoundingChildren > 0
          ? 'Partial usage'
          : 'Needs daily usage',
      tone:
        totalFoundingAttendance > 0 ? 'good' : totalFoundingChildren > 0 ? 'watch' : 'critical',
      owner: 'Ops / Product',
      evidence: `${totalFoundingChildren} children and ${totalFoundingAttendance} attendance marks are linked to the two real founding partner centre rows.`,
      nextMove: 'Turn setup into repeat daily use before talking about scale or revenue.',
      sourceLabel: 'Live children + attendance counts',
      href: '/admin/tenants',
    },
    {
      id: 'revenue-ops',
      workflow: 'Revenue and billing ops',
      statusLabel: 'Not commercially live',
      tone: 'critical',
      owner: 'Founder / CEO',
      evidence: aiSnapshot.founderTruth.revenueSummary,
      nextMove: 'Keep prospect/test billing artifacts out of the founder narrative until active partner centres are actually billed.',
      sourceLabel: 'Founder truth + admin audit docs',
      href: '/admin/revenue',
    },
    {
      id: 'ai-company-os',
      workflow: 'AI Company OS',
      statusLabel:
        aiSnapshot.signalMode === 'live'
          ? 'Advisory live'
          : aiSnapshot.signalMode === 'mixed'
          ? 'Advisory mixed'
          : 'Mock fallback',
      tone: toneFromSignalMode(aiSnapshot.signalMode),
      owner: 'Founder / CEO / CTO',
      evidence: `${aiSnapshot.queues.length} queue items and ${aiSnapshot.risks.length} risk summaries are available with ${aiSnapshot.signalMode} signal mode.`,
      nextMove: 'Use AI OS as a routing and advisory layer, not as autonomous control.',
      sourceLabel: 'AI Company OS snapshot',
      href: '/admin/ai-os',
    },
    {
      id: 'openclaw',
      workflow: 'OpenClaw Operations',
      statusLabel:
        openClawSnapshot.mode === 'filesystem' ? 'Read-only live' : 'Placeholder visibility',
      tone: toneFromOpenClawMode(openClawSnapshot.mode),
      owner: 'Automation / OpenClaw',
      evidence: `${openClawSnapshot.runningCount} running and ${openClawSnapshot.queuedCount} queued durable work items were visible at snapshot time.`,
      nextMove: 'Keep it read-only until a sanitized heartbeat or sync layer exists.',
      sourceLabel: 'OpenClaw local snapshot',
      href: '/admin/openclaw',
    },
  ]

  const notes = [...aiSnapshot.founderTruth.notes]

  if (topFocusItem?.title) {
    notes.unshift(`This week focus anchor: ${topFocusItem.title}.`)
  }

  if (issues.length > 0) {
    notes.push(`Some HQ selectors fell back to safe defaults: ${issues.join(', ')}.`)
  }

  return {
    generatedAt: new Date().toISOString(),
    founderOverview: {
      stage: 'Pilot truth, not scale theatre',
      topBottleneck:
        ceoBrief?.headline ??
        'Run the founder lane from active partner centres, not from not-yet-onboarded prospect rows.',
      thisWeekFocus:
        topFocusItem?.summary ??
        'Keep Bajabulile and Sakhisizwe as the only real founder lane, and remove friction that blocks daily usage.',
      revenueContext: aiSnapshot.founderTruth.revenueSummary,
    },
    summaryStats,
    hierarchy,
    roadmap,
    backlog,
    pilotBoard,
    readiness,
    aiLayer: {
      enabled: aiSnapshot.enabled,
      signalMode: aiSnapshot.signalMode,
      generatedAt: aiSnapshot.generatedAt,
    },
    openClaw: {
      mode: openClawSnapshot.mode,
      runningCount: openClawSnapshot.runningCount,
      queuedCount: openClawSnapshot.queuedCount,
      updatedAt: openClawSnapshot.lastUpdatedAt ?? openClawSnapshot.generatedAt,
    },
    notes,
  }
}
