# Backlog Execution Scoreboard

Last updated: 2026-03-06 (parent reliability monitor shipped)
Owner: Founder

This file is the live execution board for orchestrated Codex sessions.
Rule: keep exactly one `Now` item active until its definition of done is met.

## Snapshot

- Objective: Unblock parent portal reliability and restore trust-critical UX/copy.
- Current bottleneck: Parent reliability monitor exists, but no severity threshold card is surfaced in the main admin dashboard.
- Active lane: `parent reliability + copy quality`

## Now

- [ACTIVE] `BL-PARENT-015` `parent` Add parent reliability severity card in admin dashboard with deep-link.
  - Why: Reliability signals should be visible on the main command surface, not only in a dedicated page.
  - Definition of done:
    - Add a parent reliability severity card on `/admin/dashboard` using `parent_form_submit_failures`.
    - Card must show 24h failure count, severity badge (healthy/warning/critical), and deep-link to `/admin/parent-reliability`.
    - Keep audience-aware display without regressing existing dashboard metrics.
  - Validation:
    - `npm.cmd run -s test:parent-uat`
    - `npm.cmd run -s lint`
  - Est: 1-2h

## Next

- [READY] `BL-PARENT-016` `parent` Define after `BL-PARENT-015` completion.

## Blocked

- `BL-PARENT-008` Live-run execution blocked in current sandbox (`EACCES` outbound fetch restriction).
  - Unblock: run `npm run uat:parent:create:live` from unrestricted environment (or CI runner with network egress).

## Done This Week

- [DONE] `BL-PARENT-006` Parent hard-pass blockers fixed: Supabase browser singleton, parent bootstrap/upsert guardrails, child creation array-field fix, emergency/doc/profile mutation hardening, bottom-nav de-crowding, landing overlap fix, brand header restore, and parent signup confirmation email CSS refresh.
- [DONE] `BL-PARENT-007` Scripted parent UAT smoke matrix shipped (`tests/qa/parent-portal-hard-pass-smoke.test.mjs`) and wired via `npm run test:parent-uat`.
- [DONE] `BL-PARENT-008` Added live smoke runner for child create + emergency contact create (`scripts/run-parent-create-live-smoke.mjs`) with npm commands for dry/live runs.
- [DONE] `BL-PARENT-009` Completed plain-English parent copy pass across profile/documents/security/emergency/support/dashboard surfaces and removed brittle copy assertions in parent smoke checks.
- [DONE] `BL-PARENT-010` Added parent submit-failure telemetry (`route_path` + `failure_type`) across key parent forms with API ingestion and persistence migration.
- [DONE] `BL-PARENT-011` Added parent smoke audit artifact output (`tmp/reports/parent-uat-*.json` + latest json/txt) while preserving non-zero exit on failures.
- [DONE] `BL-PARENT-012` Added parent dashboard readiness health card with completion percentage and CTA links for missing setup actions.
- [DONE] `BL-PARENT-013` Defined and activated the next concrete parent reliability slice (`BL-PARENT-014`) with scope and validation criteria.
- [DONE] `BL-PARENT-014` Added platform-admin parent reliability monitor with 24h trend, route/failure-type summaries, and recent failure table.
- [DONE] `BL-REV-010` Removed stale manual status mutation controls from admin revenue operations UI.
- [DONE] `BL-REL-003` Added persistence-backed throttling for activity-log failure alerts using marker entries.
- [DONE] `BL-QA-003` Extended regression checks for activity-log forced-failure simulation and non-production guard.
- [DONE] `BL-UX-010` Added read-only event-driven status guidance panel with incident/runbook links in Revenue Ops.
- [DONE] `BL-OPS-006` Added one-click incident/runbook/audit deep-links to the Revenue Ops KPI summary panel.
