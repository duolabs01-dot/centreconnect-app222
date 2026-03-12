import 'server-only'

import fs from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { getFounderVisibilityTruth } from '@/lib/founder/admin-truth'
import type {
  OpenClawAgentSummary,
  OpenClawBadgeTone,
  OpenClawCapability,
  OpenClawCommunicationItem,
  OpenClawConfigSummary,
  OpenClawOpsSnapshot,
  OpenClawWorkItem,
  OpenClawWorkStatus,
} from './types'

const RECENT_WINDOW_MS = 2 * 60 * 60 * 1000
const MAX_ACTIVE_WORK_ITEMS = 6
const MAX_COMPLETED_WORK_ITEMS = 6
const MAX_COMMUNICATION_ITEMS = 8
const MAX_HANDOFF_ITEMS = 6

type StoredSessionIndex = Record<string, Record<string, unknown>>

type ParsedMessage = {
  role: 'user' | 'assistant'
  text: string
  timestamp: string | null
}

type SessionSummary = {
  agentId: string
  sessionId: string
  sessionKey: string | null
  isArchived: boolean
  isSubagent: boolean
  status: OpenClawWorkStatus
  statusLabel: string
  badgeTone: OpenClawBadgeTone
  startedAt: string | null
  updatedAt: string | null
  channel: string | null
  model: string | null
  taskTitle: string
  summary: string
  lastUserText: string | null
  lastAssistantText: string | null
  recentMessages: ParsedMessage[]
  runningToolItems: OpenClawWorkItem[]
}

type ParsedToolCall = {
  name: string
  args: Record<string, unknown>
}

function resolveOpenClawStateRoot() {
  const override = process.env.OPENCLAW_STATE_ROOT?.trim()
  return override || path.join(os.homedir(), '.openclaw')
}

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

async function readDirectory(filePath: string) {
  try {
    return await fs.readdir(filePath, { withFileTypes: true })
  } catch {
    return [] as Dirent[]
  }
}

function toIsoString(value: unknown): string | null {
  if (typeof value === 'string') {
    const timestamp = Date.parse(value)
    return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString()
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const normalized = value > 1_000_000_000_000 ? value : value * 1000
    return new Date(normalized).toISOString()
  }

  return null
}

function toTimeValue(value: string | null | undefined) {
  if (!value) return 0
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function clipText(value: string, maxLength = 180) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 1).trimEnd()}...`
}

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function stripFencedBlocks(value: string) {
  return value.replace(/```[\s\S]*?```/g, ' ')
}

function cleanMessageText(raw: string) {
  let text = stripFencedBlocks(raw)
    .replace(/\[\[reply_to_current\]\]\s*/gi, '')
    .replace(/^Sender \(untrusted metadata\):.*$/gim, ' ')
    .replace(/^Conversation info.*$/gim, ' ')

  const subagentMatch = text.match(/\[Subagent Task\]:([\s\S]*)$/i)
  if (subagentMatch?.[1]) {
    text = subagentMatch[1]
  }

  text = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(System:|Sender \(untrusted metadata\):|Conversation info)/i.test(line))
    .join(' ')

  const datedMatches = [...text.matchAll(/\[[^\]]+\]\s*([^\[].+?)(?=(?:\s+\[[^\]]+\]\s*)|$)/g)]
  if (datedMatches.length > 0) {
    const candidate = datedMatches[datedMatches.length - 1]?.[1]
    if (candidate) text = candidate
  }

  return clipText(collapseWhitespace(text))
}

function sentenceFromText(value: string | null | undefined, fallback: string) {
  const text = collapseWhitespace(value ?? '')
  if (!text) return fallback

  const sentence = text.split(/(?<=[.!?])\s+/)[0] || text
  return clipText(sentence, 120)
}

function humanizeId(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function summarizeCommand(command: string) {
  const cleaned = collapseWhitespace(command)
  if (!cleaned) return 'Background task'

  const firstFlag = cleaned.indexOf(' --')
  const short = firstFlag > 0 ? cleaned.slice(0, firstFlag) : cleaned
  return clipText(short, 90)
}

function parseToolArguments(raw: unknown) {
  if (!raw) return {} as Record<string, unknown>

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return { raw }
    }
  }

  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }

  return {} as Record<string, unknown>
}

function extractTextParts(parts: unknown) {
  if (!Array.isArray(parts)) return ''

  return parts
    .map((part) => {
      if (!part || typeof part !== 'object') return ''
      if ((part as { type?: string }).type !== 'text') return ''
      return String((part as { text?: string }).text ?? '')
    })
    .filter(Boolean)
    .join(' ')
}

function presentStatus(status: OpenClawWorkStatus) {
  switch (status) {
    case 'running':
      return { badgeTone: 'active' as const, statusLabel: 'Running' }
    case 'recent':
      return { badgeTone: 'waiting' as const, statusLabel: 'Recent' }
    case 'queued':
      return { badgeTone: 'waiting' as const, statusLabel: 'Queued' }
    case 'completed':
      return { badgeTone: 'complete' as const, statusLabel: 'Completed' }
    case 'failed':
      return { badgeTone: 'issue' as const, statusLabel: 'Issue' }
    default:
      return { badgeTone: 'draft' as const, statusLabel: 'Idle' }
  }
}

function runningToolLabel(toolCall: ParsedToolCall | undefined) {
  if (!toolCall) return 'Background task'

  const command =
    typeof toolCall.args.command === 'string'
      ? toolCall.args.command
      : typeof toolCall.args.text === 'string'
      ? toolCall.args.text
      : ''

  if (command) return summarizeCommand(command)
  if (toolCall.name === 'process') return 'Background process'
  if (toolCall.name === 'subagents') return 'Subagent run'
  return humanizeId(toolCall.name)
}

function runningToolSummary(toolCall: ParsedToolCall | undefined) {
  if (!toolCall) return 'OpenClaw marked a background task as still running.'

  const command =
    typeof toolCall.args.command === 'string'
      ? collapseWhitespace(toolCall.args.command)
      : typeof toolCall.args.text === 'string'
      ? collapseWhitespace(toolCall.args.text)
      : ''

  if (!command) {
    return `OpenClaw marked ${humanizeId(toolCall.name)} as still running.`
  }

  return clipText(command, 180)
}

function createCapability(
  id: string,
  label: string,
  status: OpenClawCapability['status'],
  detail: string
): OpenClawCapability {
  return { id, label, status, detail }
}

async function parseSessionFile(args: {
  filePath: string
  fileName: string
  agentId: string
  sessionIndexEntry: Record<string, unknown> | null
  defaultModel: string | null
}): Promise<SessionSummary | null> {
  const raw = await fs.readFile(args.filePath, 'utf8')
  const lines = raw.split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return null

  const events = lines
    .map((line) => {
      try {
        return JSON.parse(line) as Record<string, unknown>
      } catch {
        return null
      }
    })
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))

  if (events.length === 0) return null

  const sessionId = args.fileName.split('.jsonl')[0] || args.fileName
  const isArchived = args.fileName.includes('.deleted.')
  const recentMessages: ParsedMessage[] = []
  const pendingToolCalls = new Map<string, ParsedToolCall>()
  const runningToolItems: OpenClawWorkItem[] = []

  let firstUserRawText: string | null = null
  let firstUserText: string | null = null
  let lastUserText: string | null = null
  let lastAssistantText: string | null = null
  let startedAt: string | null = null
  let updatedAt = toIsoString(args.sessionIndexEntry?.updatedAt) || null
  let hadFailure = false

  for (const event of events) {
    const eventTimestamp = toIsoString(event.timestamp)
    if (eventTimestamp) {
      startedAt = startedAt || eventTimestamp
      updatedAt = eventTimestamp
    }

    if (event.type !== 'message') continue

    const message = (event.message ?? {}) as Record<string, unknown>
    const role = String(message.role ?? '')

    if (role === 'user') {
      const rawText = extractTextParts(message.content)
      const cleaned = cleanMessageText(rawText)
      if (!cleaned) continue
      firstUserRawText = firstUserRawText || rawText
      firstUserText = firstUserText || cleaned
      lastUserText = cleaned
      recentMessages.push({ role: 'user', text: cleaned, timestamp: eventTimestamp })
      continue
    }

    if (role === 'assistant') {
      const content = Array.isArray(message.content) ? message.content : []
      for (const part of content) {
        if (!part || typeof part !== 'object') continue
        const typedPart = part as Record<string, unknown>
        if (typedPart.type === 'toolCall' && typeof typedPart.id === 'string') {
          pendingToolCalls.set(typedPart.id, {
            name: String(typedPart.name ?? 'tool'),
            args: parseToolArguments(typedPart.arguments),
          })
        }
      }

      const cleaned = cleanMessageText(extractTextParts(message.content))
      if (!cleaned) continue
      lastAssistantText = cleaned
      recentMessages.push({ role: 'assistant', text: cleaned, timestamp: eventTimestamp })
      continue
    }

    if (role === 'toolResult') {
      const details = (event.details ?? {}) as Record<string, unknown>
      const status = String(details.status ?? '').trim().toLowerCase()
      const toolCallId = typeof message.toolCallId === 'string' ? message.toolCallId : null
      const toolCall = toolCallId ? pendingToolCalls.get(toolCallId) : undefined

      if (toolCallId) {
        pendingToolCalls.delete(toolCallId)
      }

      if (status === 'running') {
        const presented = presentStatus('running')
        runningToolItems.push({
          id: `running:${sessionId}:${toolCallId ?? String(event.id ?? runningToolItems.length)}`,
          title: runningToolLabel(toolCall),
          summary: runningToolSummary(toolCall),
          status: 'running',
          statusLabel: presented.statusLabel,
          badgeTone: presented.badgeTone,
          ownerLabel: humanizeId(args.agentId),
          sourceLabel: 'Live OpenClaw task',
          startedAt,
          updatedAt: eventTimestamp,
          sessionId,
        })
      }

      if (status === 'failed' || status === 'error') {
        hadFailure = true
      }
    }
  }

  const isSubagent = Boolean(firstUserRawText && firstUserRawText.includes('[Subagent Context]'))
  const taskTitle = sentenceFromText(
    isSubagent ? firstUserText : lastUserText || lastAssistantText,
    isSubagent ? 'Subagent task' : 'Recent OpenClaw task'
  )

  let status: OpenClawWorkStatus = 'idle'
  if (isArchived) {
    status = hadFailure ? 'failed' : 'completed'
  } else if (runningToolItems.length > 0 || pendingToolCalls.size > 0) {
    status = 'running'
  } else if (hadFailure) {
    status = 'failed'
  } else {
    const updatedMs = toTimeValue(updatedAt)
    if (updatedMs > 0 && Date.now() - updatedMs <= RECENT_WINDOW_MS) {
      status = 'recent'
    }
  }

  const presented = presentStatus(status)

  return {
    agentId: args.agentId,
    sessionId,
    sessionKey:
      typeof args.sessionIndexEntry?.sessionKey === 'string'
        ? String(args.sessionIndexEntry.sessionKey)
        : null,
    isArchived,
    isSubagent,
    status,
    statusLabel: presented.statusLabel,
    badgeTone: presented.badgeTone,
    startedAt,
    updatedAt,
    channel:
      typeof args.sessionIndexEntry?.lastChannel === 'string'
        ? String(args.sessionIndexEntry.lastChannel)
        : typeof args.sessionIndexEntry?.deliveryContext === 'object' &&
          args.sessionIndexEntry.deliveryContext &&
          typeof (args.sessionIndexEntry.deliveryContext as Record<string, unknown>).channel === 'string'
        ? String((args.sessionIndexEntry.deliveryContext as Record<string, unknown>).channel)
        : null,
    model:
      typeof args.sessionIndexEntry?.model === 'string'
        ? String(args.sessionIndexEntry.model)
        : args.defaultModel,
    taskTitle,
    summary: sentenceFromText(
      lastAssistantText || lastUserText,
      isSubagent ? 'No handoff summary has been recorded yet.' : 'No recent summary has been recorded yet.'
    ),
    lastUserText,
    lastAssistantText,
    recentMessages: recentMessages
      .sort((left, right) => toTimeValue(right.timestamp) - toTimeValue(left.timestamp))
      .slice(0, 4),
    runningToolItems: runningToolItems
      .sort((left, right) => toTimeValue(right.updatedAt) - toTimeValue(left.updatedAt))
      .slice(0, 3),
  }
}

function toAgentSummary(args: {
  id: string
  name: string
  kind: 'agent' | 'subagent'
  status: OpenClawWorkStatus
  sessionId: string | null
  sessionLabel: string | null
  sourceLabel: string
  updatedAt: string | null
  model: string | null
  channel: string | null
  summary: string
  lastWork: string | null
}): OpenClawAgentSummary {
  const presented = presentStatus(args.status)
  return {
    id: args.id,
    name: args.name,
    kind: args.kind,
    status: args.status,
    statusLabel: presented.statusLabel,
    badgeTone: presented.badgeTone,
    sessionId: args.sessionId,
    sessionLabel: args.sessionLabel,
    sourceLabel: args.sourceLabel,
    updatedAt: args.updatedAt,
    model: args.model,
    channel: args.channel,
    summary: args.summary,
    lastWork: args.lastWork,
  }
}

function toWorkItemFromSession(summary: SessionSummary): OpenClawWorkItem {
  return {
    id: `session:${summary.sessionId}`,
    title: summary.taskTitle,
    summary: summary.summary,
    status: summary.status,
    statusLabel: summary.statusLabel,
    badgeTone: summary.badgeTone,
    ownerLabel: humanizeId(summary.agentId),
    sourceLabel: summary.isArchived ? 'Archived session' : 'Live session',
    startedAt: summary.startedAt,
    updatedAt: summary.updatedAt,
    sessionId: summary.sessionId,
  }
}

function extractRunsQueueItems(rawRuns: Record<string, unknown>): OpenClawWorkItem[] {
  return Object.entries(rawRuns)
    .map(([id, entry]) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null

      const record = entry as Record<string, unknown>
      const normalizedStatus = String(record.status ?? 'queued').trim().toLowerCase()
      const status =
        normalizedStatus === 'running'
          ? 'running'
          : normalizedStatus === 'completed'
          ? 'completed'
          : normalizedStatus === 'failed'
          ? 'failed'
          : 'queued'

      const presented = presentStatus(status)

      const item: OpenClawWorkItem = {
        id: `run:${id}`,
        title: sentenceFromText(
          typeof record.task === 'string'
            ? record.task
            : typeof record.title === 'string'
            ? record.title
            : typeof record.prompt === 'string'
            ? record.prompt
            : 'Queued subagent task',
          'Queued subagent task'
        ),
        summary: sentenceFromText(
          typeof record.summary === 'string'
            ? record.summary
            : typeof record.prompt === 'string'
            ? record.prompt
            : 'OpenClaw queued this task, but no richer summary is stored yet.',
          'OpenClaw queued this task, but no richer summary is stored yet.'
        ),
        status,
        statusLabel: presented.statusLabel,
        badgeTone: presented.badgeTone,
        ownerLabel:
          typeof record.agentId === 'string'
            ? humanizeId(record.agentId)
            : typeof record.ownerAgentId === 'string'
            ? humanizeId(record.ownerAgentId)
            : 'Subagent',
        sourceLabel: 'runs.json',
        startedAt: toIsoString(record.createdAt),
        updatedAt: toIsoString(record.updatedAt) || toIsoString(record.createdAt),
        sessionId: typeof record.sessionId === 'string' ? record.sessionId : null,
      }

      return item
    })
    .filter((item): item is OpenClawWorkItem => Boolean(item))
}

function buildConfigSummary(config: Record<string, unknown>, stateRoot: string): OpenClawConfigSummary {
  const meta = (config.meta ?? {}) as Record<string, unknown>
  const agents = (config.agents ?? {}) as Record<string, unknown>
  const defaults = (agents.defaults ?? {}) as Record<string, unknown>
  const gateway = (config.gateway ?? {}) as Record<string, unknown>
  const primaryModel =
    typeof defaults.model === 'object' &&
    defaults.model &&
    typeof (defaults.model as Record<string, unknown>).primary === 'string'
      ? String((defaults.model as Record<string, unknown>).primary)
      : null

  return {
    stateRoot,
    workspace: typeof defaults.workspace === 'string' ? String(defaults.workspace) : null,
    primaryModel,
    maxConcurrent: typeof defaults.maxConcurrent === 'number' ? defaults.maxConcurrent : null,
    subagentMaxConcurrent:
      typeof defaults.subagents === 'object' &&
      defaults.subagents &&
      typeof (defaults.subagents as Record<string, unknown>).maxConcurrent === 'number'
        ? Number((defaults.subagents as Record<string, unknown>).maxConcurrent)
        : null,
    gatewayMode: typeof gateway.mode === 'string' ? String(gateway.mode) : null,
    gatewayBind: typeof gateway.bind === 'string' ? String(gateway.bind) : null,
    gatewayPort: typeof gateway.port === 'number' ? gateway.port : null,
    lastTouchedAt: toIsoString(meta.lastTouchedAt),
  }
}

function buildCommunications(sessionSummaries: SessionSummary[]): OpenClawCommunicationItem[] {
  return sessionSummaries
    .flatMap((summary) =>
      summary.recentMessages.map((message, index) => {
        const item: OpenClawCommunicationItem = {
          id: `comm:${summary.sessionId}:${message.role}:${index}`,
          type:
            summary.isSubagent && message.role === 'assistant'
              ? 'handoff'
              : message.role === 'user'
              ? 'request'
              : 'update',
          title:
            summary.isSubagent && message.role === 'assistant'
              ? 'Subagent handoff'
              : message.role === 'user'
              ? 'Request'
              : 'Agent update',
          excerpt: message.text,
          ownerLabel: humanizeId(summary.agentId),
          sourceLabel: summary.isArchived ? 'Archived session' : 'Live session',
          timestamp: message.timestamp,
        }

        return item
      })
    )
    .sort((left, right) => toTimeValue(right.timestamp) - toTimeValue(left.timestamp))
    .slice(0, MAX_COMMUNICATION_ITEMS)
}

function buildHandoffs(sessionSummaries: SessionSummary[]): OpenClawCommunicationItem[] {
  return sessionSummaries
    .filter((summary) => summary.isSubagent && summary.lastAssistantText)
    .map((summary) => ({
      id: `handoff:${summary.sessionId}`,
      type: 'handoff' as const,
      title: summary.taskTitle,
      excerpt: sentenceFromText(summary.lastAssistantText, 'Subagent handoff available'),
      ownerLabel: humanizeId(summary.agentId),
      sourceLabel: summary.isArchived ? 'Archived subagent session' : 'Live subagent session',
      timestamp: summary.updatedAt,
    }))
    .sort((left, right) => toTimeValue(right.timestamp) - toTimeValue(left.timestamp))
    .slice(0, MAX_HANDOFF_ITEMS)
}

function buildPlaceholderSnapshot(stateRoot: string): OpenClawOpsSnapshot {
  const founderTruth = getFounderVisibilityTruth()
  return {
    mode: 'placeholder',
    generatedAt: new Date().toISOString(),
    config: {
      stateRoot,
      workspace: null,
      primaryModel: null,
      maxConcurrent: null,
      subagentMaxConcurrent: null,
      gatewayMode: null,
      gatewayBind: null,
      gatewayPort: null,
      lastTouchedAt: null,
    },
    founderTruth,
    agentCount: 0,
    subagentCount: 0,
    runningCount: 0,
    queuedCount: 0,
    completedCount: 0,
    lastUpdatedAt: null,
    agents: [],
    subagents: [],
    activeWork: [],
    queuedWork: [],
    completedWork: [],
    communications: [],
    handoffs: [],
    capabilities: [
      createCapability(
        'local-session-state',
        'Local OpenClaw session state',
        'unavailable',
        'This server could not find an OpenClaw state directory to read.'
      ),
      createCapability(
        'runtime-queue',
        'Queued subagent work',
        'future',
        'A durable queue feed is still needed for hosted environments.'
      ),
      createCapability(
        'remote-runtime',
        'Cross-device runtime visibility',
        'future',
        'This v1 does not reach into remote OpenClaw nodes or shell processes.'
      ),
    ],
    notes: [
      'This page stays read-only. It does not execute OpenClaw commands from the app.',
      founderTruth.summary,
      'Set OPENCLAW_STATE_ROOT on a self-hosted admin server if ~/.openclaw is not the correct path.',
    ],
  }
}

export async function getOpenClawOpsSnapshot(): Promise<OpenClawOpsSnapshot> {
  const stateRoot = resolveOpenClawStateRoot()
  if (!(await pathExists(stateRoot))) {
    return buildPlaceholderSnapshot(stateRoot)
  }

  const founderTruth = getFounderVisibilityTruth()

  const [config, agentDirEntries, runsFile] = await Promise.all([
    readJsonFile<Record<string, unknown>>(path.join(stateRoot, 'openclaw.json'), {}),
    readDirectory(path.join(stateRoot, 'agents')),
    readJsonFile<{ runs?: Record<string, unknown> }>(path.join(stateRoot, 'subagents', 'runs.json'), {
      runs: {},
    }),
  ])

  const configSummary = buildConfigSummary(config, stateRoot)
  const defaultModel = configSummary.primaryModel
  const sessionSummaries: SessionSummary[] = []

  for (const agentDirEntry of agentDirEntries.filter((entry) => entry.isDirectory())) {
    const agentId = agentDirEntry.name
    const sessionsDir = path.join(stateRoot, 'agents', agentId, 'sessions')
    const [sessionEntries, index] = await Promise.all([
      readDirectory(sessionsDir),
      readJsonFile<StoredSessionIndex>(path.join(sessionsDir, 'sessions.json'), {}),
    ])

    const indexBySessionId = new Map<string, Record<string, unknown>>()
    for (const [sessionKey, entry] of Object.entries(index)) {
      const sessionId = typeof entry.sessionId === 'string' ? entry.sessionId : null
      if (!sessionId) continue
      indexBySessionId.set(sessionId, { ...entry, sessionKey })
    }

    const sessionFiles = sessionEntries
      .filter(
        (entry) =>
          entry.isFile() &&
          (entry.name.endsWith('.jsonl') || entry.name.includes('.jsonl.deleted.'))
      )
      .sort((left, right) => right.name.localeCompare(left.name))

    for (const sessionFile of sessionFiles) {
      const sessionId = sessionFile.name.split('.jsonl')[0]
      const parsed = await parseSessionFile({
        filePath: path.join(sessionsDir, sessionFile.name),
        fileName: sessionFile.name,
        agentId,
        sessionIndexEntry: indexBySessionId.get(sessionId) ?? null,
        defaultModel,
      })

      if (parsed) {
        sessionSummaries.push(parsed)
      }
    }
  }

  const queuedWork = extractRunsQueueItems(runsFile.runs ?? {}).sort(
    (left, right) => toTimeValue(right.updatedAt) - toTimeValue(left.updatedAt)
  )

  const agentGroups = new Map<string, SessionSummary[]>()
  for (const summary of sessionSummaries.filter((entry) => !entry.isSubagent)) {
    const existing = agentGroups.get(summary.agentId) ?? []
    existing.push(summary)
    agentGroups.set(summary.agentId, existing)
  }

  const agents = [...new Set([...agentGroups.keys(), ...agentDirEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)])]
    .map((agentId) => {
      const summaries = (agentGroups.get(agentId) ?? []).sort(
        (left, right) => toTimeValue(right.updatedAt) - toTimeValue(left.updatedAt)
      )
      const latest = summaries[0]

      if (!latest) {
        return toAgentSummary({
          id: agentId,
          name: humanizeId(agentId),
          kind: 'agent',
          status: 'idle',
          sessionId: null,
          sessionLabel: null,
          sourceLabel: 'No session log found',
          updatedAt: null,
          model: defaultModel,
          channel: null,
          summary: 'This agent exists in OpenClaw, but no session log is available yet.',
          lastWork: null,
        })
      }

      return toAgentSummary({
        id: agentId,
        name: humanizeId(agentId),
        kind: 'agent',
        status: latest.status,
        sessionId: latest.sessionId,
        sessionLabel: latest.sessionKey,
        sourceLabel: latest.isArchived ? 'Archived session' : 'Live session',
        updatedAt: latest.updatedAt,
        model: latest.model,
        channel: latest.channel,
        summary: latest.summary,
        lastWork: latest.taskTitle,
      })
    })
    .sort((left, right) => toTimeValue(right.updatedAt) - toTimeValue(left.updatedAt))

  const subagents = sessionSummaries
    .filter((summary) => summary.isSubagent)
    .sort((left, right) => toTimeValue(right.updatedAt) - toTimeValue(left.updatedAt))
    .map((summary, index) =>
      toAgentSummary({
        id: `subagent:${summary.sessionId}`,
        name: `Subagent ${String(index + 1).padStart(2, '0')}`,
        kind: 'subagent',
        status: summary.status,
        sessionId: summary.sessionId,
        sessionLabel: summary.sessionKey,
        sourceLabel: summary.isArchived ? 'Archived session' : 'Live session',
        updatedAt: summary.updatedAt,
        model: summary.model,
        channel: summary.channel,
        summary: summary.summary,
        lastWork: summary.taskTitle,
      })
    )

  const activeWork = sessionSummaries
    .filter((summary) => !summary.isArchived && summary.status !== 'idle')
    .flatMap((summary) => {
      const items = [toWorkItemFromSession(summary)]
      if (summary.runningToolItems.length > 0) {
        items.push(...summary.runningToolItems)
      }
      return items
    })
    .sort((left, right) => toTimeValue(right.updatedAt) - toTimeValue(left.updatedAt))
    .slice(0, MAX_ACTIVE_WORK_ITEMS)

  const completedWork = sessionSummaries
    .filter((summary) => summary.isArchived || summary.status === 'completed')
    .map(toWorkItemFromSession)
    .sort((left, right) => toTimeValue(right.updatedAt) - toTimeValue(left.updatedAt))
    .slice(0, MAX_COMPLETED_WORK_ITEMS)

  const communications = buildCommunications(sessionSummaries)
  const handoffs = buildHandoffs(sessionSummaries)

  const lastUpdatedAt = [configSummary.lastTouchedAt, ...agents.map((agent) => agent.updatedAt), ...subagents.map((subagent) => subagent.updatedAt)]
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => toTimeValue(right) - toTimeValue(left))[0] ?? null

  const capabilities: OpenClawCapability[] = [
    createCapability(
      'local-session-state',
      'Local agent and session logs',
      agents.length > 0 || subagents.length > 0 ? 'live' : 'unavailable',
      'Reads sanitized session metadata from ~/.openclaw/agents/*/sessions on the server.'
    ),
    createCapability(
      'handoff-history',
      'Archived subagent handoffs',
      handoffs.length > 0 ? 'live' : 'future',
      handoffs.length > 0
        ? 'Archived JSONL transcripts are available, so founder handoffs can be surfaced safely.'
        : 'No archived subagent transcript was found yet, so handoff history is waiting on runtime usage.'
    ),
    createCapability(
      'runtime-queue',
      'Queued subagent work',
      queuedWork.length > 0 ? 'live' : 'future',
      queuedWork.length > 0
        ? 'runs.json contains durable queued work that can be shown directly.'
        : 'runs.json is empty on this machine, so queued work still needs a durable runtime feed.'
    ),
    createCapability(
      'process-runtime',
      'Process-level worker visibility',
      'future',
      'This page intentionally avoids shelling into OpenClaw or OS processes from the app.'
    ),
    createCapability(
      'remote-runtime',
      'Remote node visibility',
      'future',
      'Current visibility is limited to the server-local OpenClaw state directory.'
    ),
  ]

  const notes = [
    'This view is read-only. The app only reads local OpenClaw files and does not execute OpenClaw commands.',
    founderTruth.summary,
    'Live visibility works only when the CentreConnect admin server can read the same OpenClaw state directory as the founder machine.',
  ]

  if (queuedWork.length === 0) {
    notes.push('Queued work is intentionally separated. OpenClaw did not expose any persisted queued runs in runs.json on this machine.')
  }

  if (subagents.length === 0) {
    notes.push('No subagent sessions were detected in the available transcript files yet.')
  }

  return {
    mode: 'filesystem',
    generatedAt: new Date().toISOString(),
    config: configSummary,
    founderTruth,
    agentCount: agents.length,
    subagentCount: subagents.length,
    runningCount:
      agents.filter((agent) => agent.status === 'running').length +
      subagents.filter((subagent) => subagent.status === 'running').length,
    queuedCount: queuedWork.length,
    completedCount: completedWork.length,
    lastUpdatedAt,
    agents,
    subagents,
    activeWork,
    queuedWork,
    completedWork,
    communications,
    handoffs,
    capabilities,
    notes,
  }
}
