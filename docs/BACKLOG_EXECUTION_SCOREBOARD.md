# Backlog Execution Scoreboard

Last updated: 2026-03-06 (parent submit-failure telemetry wired)
Owner: Founder

This file is the live execution board for orchestrated Codex sessions.
Rule: keep exactly one `Now` item active until its definition of done is met.

## Snapshot

- Objective: Unblock parent portal reliability and restore trust-critical UX/copy.
- Current bottleneck: Parent smoke output is pass/fail only without a saved audit artifact.
- Active lane: `parent reliability + copy quality`

## Now

- [ACTIVE] `BL-PARENT-011` `parent` Add audit report output file from smoke matrix command.
  - Why: The parent smoke command should leave an auditable artifact for founder/operator review.
  - Definition of done:
    - Emit a timestamped text/json report file from the parent smoke command.
    - Include route/check summary counts and explicit failed checks.
    - Keep command behavior backward compatible (still exits non-zero on failures).
  - Validation:
    - `npm.cmd run -s test:parent-uat`
    - `npm.cmd run -s lint`
  - Est: 1-2h

## Next

- [READY] `BL-PARENT-012` `parent` Add dashboard health card for profile readiness and missing actions.

## Blocked

- `BL-PARENT-008` Live-run execution blocked in current sandbox (`EACCES` outbound fetch restriction).
  - Unblock: run `npm run uat:parent:create:live` from unrestricted environment (or CI runner with network egress).

## Done This Week

- [DONE] `BL-PARENT-006` Parent hard-pass blockers fixed: Supabase browser singleton, parent bootstrap/upsert guardrails, child creation array-field fix, emergency/doc/profile mutation hardening, bottom-nav de-crowding, landing overlap fix, brand header restore, and parent signup confirmation email CSS refresh.
- [DONE] `BL-PARENT-007` Scripted parent UAT smoke matrix shipped (`tests/qa/parent-portal-hard-pass-smoke.test.mjs`) and wired via `npm run test:parent-uat`.
- [DONE] `BL-PARENT-008` Added live smoke runner for child create + emergency contact create (`scripts/run-parent-create-live-smoke.mjs`) with npm commands for dry/live runs.
- [DONE] `BL-PARENT-009` Completed plain-English parent copy pass across profile/documents/security/emergency/support/dashboard surfaces and removed brittle copy assertions in parent smoke checks.
- [DONE] `BL-PARENT-010` Added parent submit-failure telemetry (`route_path` + `failure_type`) across key parent forms with API ingestion and persistence migration.
- [DONE] `BL-REV-010` Removed stale manual status mutation controls from admin revenue operations UI.
- [DONE] `BL-REL-003` Added persistence-backed throttling for activity-log failure alerts using marker entries.
- [DONE] `BL-QA-003` Extended regression checks for activity-log forced-failure simulation and non-production guard.
- [DONE] `BL-UX-010` Added read-only event-driven status guidance panel with incident/runbook links in Revenue Ops.
- [DONE] `BL-OPS-006` Added one-click incident/runbook/audit deep-links to the Revenue Ops KPI summary panel.
