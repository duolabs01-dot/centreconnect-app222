-- Migration: 20260329_001_agent_system_v1
-- Creates the v1 AI agent system schema.
--
-- Three tables:
--   agent_runs     — one row per orchestrator invocation
--   agent_tasks    — one row per specialist agent output within a run
--   agent_messages — full conversation log for every run (audit trail)
--
-- Design contract (v1):
--   - Agents are analysis-and-draft only.
--   - approval_required = TRUE on every task in v1.
--   - Agents may read internal data and write to these tables only.
--   - No agent may send emails, mutate business records, or call external APIs.
--   - All tables are platform_admin only. No ECD or parent access.

-- ─────────────────────────────────────────────
-- 1. agent_runs
--    Top-level orchestrator invocation record.
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.agent_runs (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Who triggered this run (platform_admin user)
  triggered_by    UUID        REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  trigger_type    TEXT        NOT NULL
                              CHECK (trigger_type IN ('manual', 'scheduled', 'webhook')),

  -- Lifecycle
  status          TEXT        NOT NULL DEFAULT 'running'
                              CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),

  -- Payload
  input           JSONB       NOT NULL DEFAULT '{}'::jsonb,

  -- Orchestrator summary — ranks/summarises specialist outputs.
  -- Does NOT rewrite or overwrite agent_tasks.output (those are preserved verbatim).
  summary         JSONB       DEFAULT NULL,

  -- Versioning — stored per-run so drift is detectable in audit queries
  agent_version   TEXT        NOT NULL DEFAULT 'v1',
  prompt_version  TEXT        NOT NULL DEFAULT 'v1',
  schema_version  TEXT        NOT NULL DEFAULT 'v1',

  -- Audit timestamps
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ DEFAULT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.agent_runs IS 'One row per orchestrator invocation. Parent of agent_tasks.';
COMMENT ON COLUMN public.agent_runs.summary IS 'Orchestrator summary/ranking. Never overwrites agent_tasks.output.';
COMMENT ON COLUMN public.agent_runs.agent_version IS 'Orchestrator agent version tag — store on every run for drift detection.';

-- ─────────────────────────────────────────────
-- 2. agent_tasks
--    One row per specialist agent within a run.
--    Contains the approval state machine.
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.agent_tasks (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id            UUID        NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,

  -- Which agent produced this task.
  -- v1: 'advisor' = Founder Advisor (the only active agent).
  --     'system'  = internal/meta tasks.
  -- Extend this constraint in a future migration when new agents are added.
  agent_name        TEXT        NOT NULL
                                CHECK (agent_name IN ('advisor', 'system')),

  -- Action category — kept for future granularity; v1 always 'draft_only'
  action_type       TEXT        NOT NULL DEFAULT 'draft_only'
                                CHECK (action_type IN ('draft_only', 'safe_internal_write', 'external_action')),

  -- Approval state machine: draft → ready_for_review → approved → executed
  --                                                  ↘ rejected
  --                                                  ↘ expired
  status            TEXT        NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft', 'ready_for_review', 'approved', 'rejected', 'executed', 'expired')),

  -- v1: always TRUE — gate is never removed without explicit schema change
  approval_required BOOLEAN     NOT NULL DEFAULT TRUE,

  -- Payload — input and raw specialist output (never modified by orchestrator)
  input             JSONB       NOT NULL DEFAULT '{}'::jsonb,
  output            JSONB       DEFAULT NULL,

  -- Output quality signal
  confidence        TEXT        DEFAULT NULL
                                CHECK (confidence IN ('high', 'medium', 'low')),

  -- Data freshness contract — agent must declare the window it queried
  data_window_start TIMESTAMPTZ DEFAULT NULL,
  data_window_end   TIMESTAMPTZ DEFAULT NULL,
  data_sources      TEXT[]      NOT NULL DEFAULT '{}',

  -- Approval trail
  approved_by       UUID        REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  approved_at       TIMESTAMPTZ DEFAULT NULL,

  -- Rejection trail
  rejected_by       UUID        REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  rejected_at       TIMESTAMPTZ DEFAULT NULL,
  rejection_reason  TEXT        DEFAULT NULL,

  -- Execution
  executed_at       TIMESTAMPTZ DEFAULT NULL,

  -- Approval window — tasks not actioned by this time auto-expire (enforced by cron)
  expires_at        TIMESTAMPTZ DEFAULT NULL,

  -- Versioning — per-task for fine-grained drift analysis
  agent_version     TEXT        NOT NULL DEFAULT 'v1',
  prompt_version    TEXT        NOT NULL DEFAULT 'v1',
  schema_version    TEXT        NOT NULL DEFAULT 'v1',

  -- Audit timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.agent_tasks IS 'Specialist agent outputs. Approval state machine: draft→ready_for_review→approved→executed (or rejected/expired).';
COMMENT ON COLUMN public.agent_tasks.output IS 'Raw specialist output — never overwritten by orchestrator. Preserved verbatim for inspection.';
COMMENT ON COLUMN public.agent_tasks.approval_required IS 'Always TRUE in v1. Change only via explicit migration.';
COMMENT ON COLUMN public.agent_tasks.data_window_start IS 'Start of data window queried. Agent must declare freshness.';
COMMENT ON COLUMN public.agent_tasks.expires_at IS 'Approval window deadline. Expired tasks are marked expired by cron.';

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION public.agent_tasks_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_agent_tasks_updated_at
  BEFORE UPDATE ON public.agent_tasks
  FOR EACH ROW EXECUTE FUNCTION public.agent_tasks_set_updated_at();

-- ─────────────────────────────────────────────
-- 3. agent_messages
--    Full conversation log for every run.
--    Immutable once written — append-only audit trail.
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.agent_messages (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id      UUID        NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,

  -- task_id is NULL for orchestrator-level messages
  task_id     UUID        REFERENCES public.agent_tasks(id) ON DELETE CASCADE,

  role        TEXT        NOT NULL
                          CHECK (role IN ('system', 'user', 'assistant', 'tool')),

  -- Message body (NULL only when role = 'tool' and content is in tool_output)
  content     TEXT        DEFAULT NULL,

  -- Tool call fields — populated when role = 'tool'
  tool_name   TEXT        DEFAULT NULL,
  tool_input  JSONB       DEFAULT NULL,
  tool_output JSONB       DEFAULT NULL,

  -- Ordering within the run (1-based, monotonically increasing)
  sequence    INTEGER     NOT NULL,

  -- Append-only — no updated_at
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT agent_messages_run_sequence UNIQUE (run_id, sequence)
);

COMMENT ON TABLE  public.agent_messages IS 'Append-only conversation log per run. Audit trail for every message exchanged.';
COMMENT ON COLUMN public.agent_messages.task_id IS 'NULL for orchestrator-level messages; set for specialist messages.';
COMMENT ON COLUMN public.agent_messages.sequence IS '1-based message order within the run. Unique per (run_id, sequence).';

-- ─────────────────────────────────────────────
-- 4. Indexes
-- ─────────────────────────────────────────────

-- agent_runs
CREATE INDEX IF NOT EXISTS idx_agent_runs_status
  ON public.agent_runs (status);

CREATE INDEX IF NOT EXISTS idx_agent_runs_triggered_by
  ON public.agent_runs (triggered_by);

CREATE INDEX IF NOT EXISTS idx_agent_runs_created_at
  ON public.agent_runs (created_at DESC);

-- agent_tasks
CREATE INDEX IF NOT EXISTS idx_agent_tasks_run_id
  ON public.agent_tasks (run_id);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_status
  ON public.agent_tasks (status);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent_name
  ON public.agent_tasks (agent_name);

-- Fast lookup for tasks approaching or past expiry
CREATE INDEX IF NOT EXISTS idx_agent_tasks_expires_at
  ON public.agent_tasks (expires_at)
  WHERE expires_at IS NOT NULL;

-- Fast lookup for pending approval
CREATE INDEX IF NOT EXISTS idx_agent_tasks_pending_approval
  ON public.agent_tasks (created_at DESC)
  WHERE status IN ('draft', 'ready_for_review');

-- agent_messages
CREATE INDEX IF NOT EXISTS idx_agent_messages_run_id
  ON public.agent_messages (run_id, sequence);

CREATE INDEX IF NOT EXISTS idx_agent_messages_task_id
  ON public.agent_messages (task_id)
  WHERE task_id IS NOT NULL;

-- ─────────────────────────────────────────────
-- 5. Row Level Security
--    Platform admin only. No ECD or parent access.
-- ─────────────────────────────────────────────

ALTER TABLE public.agent_runs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tasks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

-- Helper: is the calling user a platform_admin?
-- Defined once, reused across all three tables.
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'platform_admin'
  )
$$;

COMMENT ON FUNCTION public.is_platform_admin() IS 'Returns TRUE if the current auth.uid() has role = platform_admin.';

-- agent_runs policies
CREATE POLICY "platform_admin_all_agent_runs"
  ON public.agent_runs
  FOR ALL
  USING  (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- agent_tasks policies
CREATE POLICY "platform_admin_all_agent_tasks"
  ON public.agent_tasks
  FOR ALL
  USING  (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- agent_messages policies (select + insert only — no updates; append-only)
CREATE POLICY "platform_admin_select_agent_messages"
  ON public.agent_messages
  FOR SELECT
  USING (public.is_platform_admin());

CREATE POLICY "platform_admin_insert_agent_messages"
  ON public.agent_messages
  FOR INSERT
  WITH CHECK (public.is_platform_admin());
