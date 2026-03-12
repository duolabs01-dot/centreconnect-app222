# OpenClaw Ops Admin View

## Goal
Give the founder one calm admin page for OpenClaw visibility without letting the CentreConnect app become a runtime controller.

## What ships in v1
- Admin-only route: `/admin/openclaw`
- Read-only data adapter under `lib/ai/openclaw-ops/*`
- Uses local OpenClaw filesystem state when available:
  - `~/.openclaw/openclaw.json`
  - `~/.openclaw/agents/*/sessions/sessions.json`
  - `~/.openclaw/agents/*/sessions/*.jsonl`
  - `~/.openclaw/subagents/runs.json`
- Shows:
  - visible agents
  - detected subagent sessions / archived handoffs
  - running and recent work
  - durable queued work only when `runs.json` actually contains it
  - completed history from archived transcripts
  - recent communication excerpts

## Safety boundary
- The app does not execute `openclaw` commands.
- The app does not inspect OS processes.
- The app does not expose OpenClaw auth tokens or other secrets in UI.
- If no readable OpenClaw state exists on the server, the route falls back to a placeholder snapshot with explicit notes.

## Why this is the right first version
- Safe for a self-hosted founder environment.
- Honest about what is live versus inferred.
- Avoids risky architecture where the web app shells into the runtime.
- Preserves a clean seam for future production-grade integration.

## Recommended next integration step
If live process status or cross-device runtime visibility becomes important, add one of these instead of in-app shell execution:

1. A small OpenClaw heartbeat writer that emits sanitized snapshots to Supabase or a local JSON feed.
2. A signed internal API on the same host that exposes sanitized runtime state.
3. A periodic sync job that writes queue depth, active sessions, and completed handoffs into an admin table.

## Env note
- Optional override: `OPENCLAW_STATE_ROOT=/path/to/.openclaw`
- Default path if unset: `~/.openclaw`
