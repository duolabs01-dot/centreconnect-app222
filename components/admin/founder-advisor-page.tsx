'use client'

import { useState, useTransition } from 'react'
import { generateFounderBrief } from '@/app/admin/ai-os/actions'
import { AdminPageLayout } from '@/components/admin/admin-page-layout'
import { cn } from '@/lib/utils'
import type { FounderBrief, AgentRun } from '@/types/agent'
import type { FounderAdvisorResult } from '@/lib/ai/founder-advisor/run'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  FileText,
  History,
  HelpCircle,
  Info,
  Loader2,
  Send,
  ShieldAlert,
  Zap,
} from 'lucide-react'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type RecentRun = Pick<AgentRun, 'id' | 'status' | 'input' | 'summary' | 'created_at'>

type RunSummaryShape = {
  brief_summary?: string
  confidence?: string
  priority_count?: number
  action_count?: number
  flag_count?: number
  error?: string
}

type Props = {
  recentRuns: RecentRun[]
}

// ─────────────────────────────────────────────
// Micro-badges
// ─────────────────────────────────────────────

function ConfidenceBadge({ level }: { level: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        level === 'high' && 'bg-teal-500/15 text-teal-300',
        level === 'medium' && 'bg-amber-500/15 text-amber-300',
        level === 'low' && 'bg-slate-500/20 text-slate-400',
      )}
    >
      {level === 'high' ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : level === 'medium' ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <Info className="h-3 w-3" />
      )}
      {level} confidence
    </span>
  )
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-medium',
        urgency === 'today' && 'bg-red-500/15 text-red-300',
        urgency === 'this_week' && 'bg-amber-500/15 text-amber-300',
        urgency === 'this_month' && 'bg-slate-500/20 text-slate-400',
      )}
    >
      {urgency.replace('_', '\u00a0')}
    </span>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-medium',
        severity === 'critical' && 'bg-red-500/15 text-red-300',
        severity === 'warning' && 'bg-amber-500/15 text-amber-300',
        severity === 'info' && 'bg-cyan-500/15 text-cyan-300',
      )}
    >
      {severity}
    </span>
  )
}

function EffortBadge({ effort }: { effort: string }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-medium',
        effort === 'low' && 'bg-teal-500/15 text-teal-300',
        effort === 'medium' && 'bg-amber-500/15 text-amber-300',
        effort === 'high' && 'bg-red-500/15 text-red-300',
      )}
    >
      {effort}\u00a0effort
    </span>
  )
}

// ─────────────────────────────────────────────
// Section card
// ─────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-900/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        {icon && <span className="text-slate-400">{icon}</span>}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────
// FounderBrief renderer
// ─────────────────────────────────────────────

function BriefDisplay({
  brief,
  dataIssues,
}: {
  brief: FounderBrief
  dataIssues: string[]
}) {
  return (
    <div className="space-y-4">
      {/* Draft-only banner */}
      <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2.5">
        <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
        <p className="text-xs text-amber-300">
          All outputs are <strong>draft-only</strong> and require your review before any action is
          taken.
        </p>
      </div>

      {/* Summary */}
      <SectionCard title="Summary" icon={<FileText className="h-3.5 w-3.5" />}>
        <p className="text-sm text-slate-200 leading-relaxed">{brief.summary}</p>
        <ConfidenceBadge level={brief.confidence} />
      </SectionCard>

      {/* Top priorities */}
      {brief.top_priorities.length > 0 && (
        <SectionCard title="Top Priorities" icon={<Zap className="h-3.5 w-3.5" />}>
          <ol className="space-y-3">
            {brief.top_priorities.map((p, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-xs font-bold text-cyan-400">
                  {i + 1}
                </span>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-100">{p.title}</span>
                    <UrgencyBadge urgency={p.urgency} />
                  </div>
                  <p className="text-xs text-slate-400">{p.why_it_matters}</p>
                </div>
              </li>
            ))}
          </ol>
        </SectionCard>
      )}

      {/* Recommended actions */}
      {brief.recommended_actions.length > 0 && (
        <SectionCard title="Recommended Actions" icon={<ChevronRight className="h-3.5 w-3.5" />}>
          <ul className="space-y-4">
            {brief.recommended_actions.map((a, i) => (
              <li key={i} className="border-l-2 border-teal-500/30 pl-3 space-y-1.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="text-sm font-medium text-slate-100">{a.action}</span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <EffortBadge effort={a.effort} />
                    <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-xs text-slate-400">
                      approval required
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  <span className="text-slate-500">Why: </span>
                  {a.why}
                </p>
                <p className="text-xs text-slate-400">
                  <span className="text-slate-500">How: </span>
                  {a.how}
                </p>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* What can wait */}
      {brief.what_can_wait.length > 0 && (
        <SectionCard title="What Can Wait" icon={<Clock className="h-3.5 w-3.5" />}>
          <ul className="space-y-1.5">
            {brief.what_can_wait.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-600" />
                {item}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Risk flags */}
      {brief.risk_flags.length > 0 && (
        <SectionCard title="Risk Flags" icon={<AlertTriangle className="h-3.5 w-3.5" />}>
          <ul className="space-y-3">
            {brief.risk_flags.map((flag, i) => (
              <li key={i} className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-slate-100">{flag.flag}</span>
                  <SeverityBadge severity={flag.severity} />
                </div>
                <p className="text-xs text-slate-400">{flag.context}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Decisions required */}
      {brief.required_inputs.length > 0 && (
        <SectionCard title="Decisions Required" icon={<HelpCircle className="h-3.5 w-3.5" />}>
          <ul className="space-y-4">
            {brief.required_inputs.map((d, i) => (
              <li key={i} className="space-y-1.5">
                <p className="text-sm font-medium text-slate-100">{d.decision}</p>
                <p className="text-xs text-slate-400">{d.context}</p>
                {d.options && d.options.length > 0 && (
                  <ul className="mt-1 space-y-1">
                    {d.options.map((opt, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs text-slate-400">
                        <span className="mt-0.5 shrink-0 text-slate-500">&rarr;</span>
                        {opt}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Draft artifacts */}
      {brief.drafts && brief.drafts.length > 0 && (
        <SectionCard title="Draft Artifacts" icon={<FileText className="h-3.5 w-3.5" />}>
          <p className="text-xs text-amber-400">
            These are drafts for your review only — nothing has been sent.
          </p>
          <ul className="space-y-4">
            {brief.drafts.map((draft, i) => (
              <li
                key={i}
                className="rounded border border-slate-700 bg-slate-950/50 p-3 space-y-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-slate-100">{draft.title}</span>
                  <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-xs text-slate-400">
                    {draft.type}
                  </span>
                  {draft.recipient && (
                    <span className="text-xs text-slate-500">To: {draft.recipient}</span>
                  )}
                </div>
                <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-300">
                  {draft.content}
                </pre>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Data freshness */}
      <SectionCard title="Data Freshness" icon={<Database className="h-3.5 w-3.5" />}>
        <div className="grid grid-cols-1 gap-2 text-xs text-slate-400 sm:grid-cols-2">
          <div>
            <span className="text-slate-500">Window: </span>
            {new Date(brief.data_freshness.window_start).toLocaleDateString('en-ZA', {
              day: 'numeric',
              month: 'short',
            })}
            {' \u2013 '}
            {new Date(brief.data_freshness.window_end).toLocaleString('en-ZA', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
          <div>
            <span className="text-slate-500">Sources: </span>
            {brief.data_freshness.sources.join(', ')}
          </div>
        </div>
        {dataIssues.length > 0 && (
          <div className="mt-2 rounded border border-amber-500/20 bg-amber-500/5 p-2 space-y-1">
            <p className="text-xs font-medium text-amber-400">Data gaps (fell back to 0):</p>
            {dataIssues.map((issue, i) => (
              <p key={i} className="text-xs text-amber-300/70">
                {issue}
              </p>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ─────────────────────────────────────────────
// Recent run history row
// ─────────────────────────────────────────────

function RunHistoryRow({ run }: { run: RecentRun }) {
  const goal = (run.input as { goal?: string } | null)?.goal ?? 'Unknown goal'
  const summary = run.summary as RunSummaryShape | null
  const ts = new Date(run.created_at)

  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3">
      <div
        className={cn(
          'mt-1 h-2 w-2 shrink-0 rounded-full',
          run.status === 'completed' && 'bg-teal-400',
          run.status === 'failed' && 'bg-red-400',
          run.status === 'running' && 'animate-pulse bg-amber-400',
          run.status !== 'completed' &&
            run.status !== 'failed' &&
            run.status !== 'running' &&
            'bg-slate-500',
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-slate-200">{goal}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-500">
            {ts.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}{' '}
            {ts.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {summary?.confidence && <ConfidenceBadge level={summary.confidence} />}
          {summary?.priority_count !== undefined && (
            <span className="text-xs text-slate-500">
              {summary.priority_count}p &middot; {summary.action_count}a &middot; {summary.flag_count}f
            </span>
          )}
          {run.status === 'failed' && summary?.error && (
            <span className="max-w-[200px] truncate text-xs text-red-400">{summary.error}</span>
          )}
        </div>
      </div>
      <span
        className={cn(
          'shrink-0 rounded-full px-2 py-0.5 text-xs',
          run.status === 'completed' && 'bg-teal-500/10 text-teal-400',
          run.status === 'failed' && 'bg-red-500/10 text-red-400',
          run.status !== 'completed' && run.status !== 'failed' && 'bg-slate-500/10 text-slate-400',
        )}
      >
        {run.status}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────
// Suggested prompts
// ─────────────────────────────────────────────

const SUGGESTED_GOALS = [
  'What should I focus on today?',
  'Where is revenue risk this week?',
  'Billing cliff in 5 weeks — what should I do first?',
  'Why are centres stalling in onboarding?',
  'What can I safely ignore right now?',
]

// ─────────────────────────────────────────────
// Main page component
// ─────────────────────────────────────────────

export function FounderAdvisorPage({ recentRuns: initialRuns }: Props) {
  const [goal, setGoal] = useState('')
  const [result, setResult] = useState<FounderAdvisorResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [runs, setRuns] = useState<RecentRun[]>(initialRuns)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!goal.trim() || isPending) return
    setError(null)
    setResult(null)
    startTransition(async () => {
      try {
        const res = await generateFounderBrief(goal)
        setResult(res)
        // Prepend the new run into local history so the list is live without a reload.
        const optimisticRun: RecentRun = {
          id: res.runId,
          status: 'completed',
          input: { goal: goal.trim() },
          summary: {
            brief_summary: res.brief.summary,
            confidence: res.brief.confidence,
            priority_count: res.brief.top_priorities.length,
            action_count: res.brief.recommended_actions.length,
            flag_count: res.brief.risk_flags.length,
          },
          created_at: res.generatedAt,
        }
        setRuns((prev) => [optimisticRun, ...prev].slice(0, 10))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate brief.')
      }
    })
  }

  return (
    <AdminPageLayout
      title="Founder Advisor"
      description="Ask a question, get a ranked brief. Everything is draft-only — your review is required before any action."
      roleLabel="Chief of Staff"
    >
      <div className="space-y-8">
        {/* ── Goal form ────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-sm font-medium text-slate-300">
            What do you need to think through?
          </label>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="What should I focus on today?"
            rows={3}
            disabled={isPending}
            className="cc-native-field w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_GOALS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setGoal(s)}
                  disabled={isPending}
                  className="rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-300 disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={!goal.trim() || isPending}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating&hellip;
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Generate brief
                </>
              )}
            </button>
          </div>
        </form>

        {/* ── Error ────────────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* ── Loading skeleton ──────────────────────────────── */}
        {isPending && (
          <div className="flex items-center justify-center gap-3 rounded-lg border border-slate-700/50 bg-slate-900/60 px-4 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
            <p className="text-sm text-slate-400">
              Reading live signals and synthesising your brief&hellip;
            </p>
          </div>
        )}

        {/* ── Brief result ─────────────────────────────────── */}
        {result && !isPending && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(result.generatedAt).toLocaleString('en-ZA')}
              <span className="text-slate-600">&middot;</span>
              <span className="font-mono text-slate-600">{result.runId.slice(0, 8)}</span>
            </div>
            <BriefDisplay brief={result.brief} dataIssues={result.dataIssues} />
          </div>
        )}

        {/* ── Recent run history ───────────────────────────── */}
        {runs.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <History className="h-3.5 w-3.5" />
              Recent runs
            </div>
            <div className="space-y-2">
              {runs.map((run) => (
                <RunHistoryRow key={run.id} run={run} />
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminPageLayout>
  )
}
