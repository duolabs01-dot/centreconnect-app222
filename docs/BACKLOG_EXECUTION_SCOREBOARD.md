# Backlog Execution Scoreboard

Last updated: 2026-03-06 (reliability summary drill-in CTAs shipped)
Owner: Founder

This file is the live execution board for orchestrated Codex sessions.
Rule: keep exactly one `Now` item active until its definition of done is met.

## Snapshot

- Objective: Unblock parent portal reliability and restore trust-critical UX/copy.
- Current bottleneck: Reliability console supports drill-in CTAs, but trend interpretation still lacks explicit delta signals.
- Active lane: `parent reliability + copy quality`

## Now

- [ACTIVE] `BL-PARENT-021` `parent` Add explicit trend delta indicators for 24h/7d reliability windows.
  - Why: Incident triage needs immediate change direction context without manual pattern reading.
  - Definition of done:
    - Add compact delta indicator near trend chart comparing first half vs second half of selected window.
    - Show direction label (up/down/flat) and percentage change with safe zero-handling.
    - Keep existing trend buckets and filters unchanged.
  - Validation:
    - `npm.cmd run -s test:parent-uat`
    - `npm.cmd run -s lint`
    - `npm.cmd run -s build`
  - Est: 2-3h

## Next

- [READY] `BL-PARENT-022` `parent` Define after `BL-PARENT-021` completion.

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
- [DONE] `BL-PARENT-015` Added parent reliability severity card on `/admin/dashboard` with 24h failure count, healthy/warning/critical badge, and deep-link to `/admin/parent-reliability`.
- [DONE] `BL-PARENT-016` Added query-parameter triage controls on `/admin/parent-reliability` (`window` + `route`) with scoped cards/trends/hotspots and clear-filters control.
- [DONE] `BL-PARENT-017` Updated dashboard parent reliability deep-link to carry `window=24h` context into reliability console and added regression assertions.
- [DONE] `BL-PARENT-018` Added compact incident handoff summary on `/admin/parent-reliability` with active window, failure count, top route/type, and copy-ready snippet.
- [DONE] `BL-PARENT-019` Added one-click copy action with feedback and prefilled WhatsApp share link for incident handoff summary.
- [DONE] `BL-PARENT-020` Added summary-driven drill-in CTAs for top route and top failure type with preserved window/filter context.
- [DONE] `BL-REV-010` Removed stale manual status mutation controls from admin revenue operations UI.
- [DONE] `BL-REL-003` Added persistence-backed throttling for activity-log failure alerts using marker entries.
- [DONE] `BL-QA-003` Extended regression checks for activity-log forced-failure simulation and non-production guard.
- [DONE] `BL-UX-010` Added read-only event-driven status guidance panel with incident/runbook links in Revenue Ops.
- [DONE] `BL-OPS-006` Added one-click incident/runbook/audit deep-links to the Revenue Ops KPI summary panel.
