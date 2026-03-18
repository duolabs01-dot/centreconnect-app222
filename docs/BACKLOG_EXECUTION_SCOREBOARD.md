# Backlog Execution Scoreboard

Last updated: 2026-03-18 (cleanup sprint code gate green; manual pilot activation still deferred to founder follow-up)
Owner: Founder

This file is the live execution board for orchestrated Codex sessions.
Rule: keep exactly one `Now` item active until its definition of done is met.

## Snapshot

- Objective: Keep the release gate green while the founder finishes the remaining live pilot activation work.
- Current bottleneck: Sakhisizwe activation and the authenticated staging/manual checks still require founder-driven follow-up outside this shell.
- Active lane: `parent verification continuity`

## Now

- [ACTIVE] `BL-PARENT-030` `parent` Keep the parent UAT lane and scoreboard state current after cross-portal cleanup work.
  - Why: `npm run test:parent-uat` is a hard gate, and the scoreboard must continue the verified parent reliability sequence through the latest active task.
  - Definition of done:
    - `npm run test:parent-uat` passes on the current branch.
    - The scoreboard retains the parent reliability progression through `BL-PARENT-030` and `BL-PARENT-031`.
    - Latest parent audit artifacts remain available in `tmp/reports/`.
  - Validation:
    - `npm run test:parent-uat`
    - `tmp/reports/parent-uat-latest.json`
    - `tmp/reports/parent-uat-latest.txt`
  - Est: 0.5h

## Next

- [READY] `BL-PARENT-031` `parent` Run the authenticated parent create live smoke once founder-owned sessions are available and record the result beside the scripted UAT artifacts.

## Blocked

- `BL-PILOT-020` Founder will complete Sakhisizwe onboarding on 2026-03-19; live pilot readiness stays blocked until that product-side activation is finished and rechecked.
  - Unblock: finish Sakhisizwe setup in the product, then rerun the live pilot-centre readiness query.
- `BL-PILOT-021` Authenticated staging/manual flows are blocked in this shell until founder/admin, ECD, and parent sessions are available.
  - Unblock: sign into local or staging with the required roles and execute the Gate 3 checklist end-to-end.
## Done This Week

- [DONE] `BL-UX-012` Cleared final design audit warnings, added visible dialog close controls, normalized semantic color tokens, moved `/ecd/sessions` out of primary ECD nav, and corrected the April 2026 pilot-offer copy.

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
- [DONE] `BL-PARENT-021` Added trend delta indicator (up/down/flat + percentage) comparing first half vs second half of selected reliability window.
- [DONE] `BL-PARENT-022` Added direct failure-type triage input and preserved `window` context on filter apply/clear flows.
- [DONE] `BL-PARENT-023` Added one-click combined route+failure drill-in actions on hotspot pair cards with selected-window preservation.
- [DONE] `BL-PARENT-024` Added one-click latest-incident combined drill-in action with selected-window preservation.
- [DONE] `BL-PARENT-025` Added row-level combined route+failure drill-in actions in the recent failures table.
- [DONE] `BL-PARENT-026` Added route-hotspot row drill-in actions with selected-window preservation.
- [DONE] `BL-PARENT-027` Added failure-type hotspot row drill-in actions with selected-window preservation.
- [DONE] `BL-PARENT-028` Added one-click per-filter clear chips for active route/failure triage context.
- [DONE] `BL-PARENT-029` Added empty-state recovery CTAs (reset filters + alternate window) for faster no-result troubleshooting.
- [DONE] `BL-REV-010` Removed stale manual status mutation controls from admin revenue operations UI.
- [DONE] `BL-REL-003` Added persistence-backed throttling for activity-log failure alerts using marker entries.
- [DONE] `BL-QA-003` Extended regression checks for activity-log forced-failure simulation and non-production guard.
- [DONE] `BL-UX-010` Added read-only event-driven status guidance panel with incident/runbook links in Revenue Ops.
- [DONE] `BL-UX-011` Applied mobile-first spacing and heading scale reductions on key landing, centre profile, and admin dashboard surfaces for Android-sized screens.
- [DONE] `BL-OPS-006` Added one-click incident/runbook/audit deep-links to the Revenue Ops KPI summary panel.

- [DONE] BL-ECD-012 Simplified ECD owner first-run flow: setup email first, welcome guide after password setup, clearer logged-out guide gate, and dashboard-oriented first-value messaging.
- [DONE] BL-OPS-007 Added branded founder visibility alerts for key onboarding and growth milestones (ECD setup sent, owner invite resent, owner first password set, parent signup started, parent joined).
