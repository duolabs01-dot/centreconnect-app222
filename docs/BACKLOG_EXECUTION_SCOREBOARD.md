# Backlog Execution Scoreboard

Last updated: 2026-03-06 (parent UAT matrix shipped)
Owner: Founder

This file is the live execution board for orchestrated Codex sessions.
Rule: keep exactly one `Now` item active until its definition of done is met.

## Snapshot

- Objective: Unblock parent portal reliability and restore trust-critical UX/copy.
- Current bottleneck: Parent e2e automation depth is still limited to smoke-level assertions.
- Active lane: `parent reliability`

## Now

- [ACTIVE] `BL-PARENT-008` `parent` Add e2e smoke checks for child create + emergency contact create
  - Why: We now have a scripted matrix, but still need browser-level action execution checks.
  - Definition of done:
    - Automated live-run checks execute child-create and emergency-contact-create flows end-to-end.
    - Tests fail clearly when auth/session/bootstrap regressions return.
    - Script integrates into `npm` QA workflow.
  - Validation:
    - `npm.cmd run -s test:parent-uat`
    - `npm.cmd run -s lint`
  - Est: 2-3h

## Next

- [READY] `BL-PARENT-009` `parent` Finish plain-English copy pass across parent primary flows.
- [READY] `BL-PARENT-010` `parent` Add telemetry for parent form submit failures by route.
- [READY] `BL-PARENT-011` `parent` Add audit report output file from smoke matrix command.

## Blocked

- None

## Done This Week

- [DONE] `BL-PARENT-006` Parent hard-pass blockers fixed: Supabase browser singleton, parent bootstrap/upsert guardrails, child creation array-field fix, emergency/doc/profile mutation hardening, bottom-nav de-crowding, landing overlap fix, brand header restore, and parent signup confirmation email CSS refresh.
- [DONE] `BL-PARENT-007` Scripted parent UAT smoke matrix shipped (`tests/qa/parent-portal-hard-pass-smoke.test.mjs`) and wired via `npm run test:parent-uat`.
- [DONE] `BL-REV-010` Removed stale manual status mutation controls from admin revenue operations UI.
- [DONE] `BL-REL-003` Added persistence-backed throttling for activity-log failure alerts using marker entries.
- [DONE] `BL-QA-003` Extended regression checks for activity-log forced-failure simulation and non-production guard.
- [DONE] `BL-UX-010` Added read-only event-driven status guidance panel with incident/runbook links in Revenue Ops.
- [DONE] `BL-OPS-006` Added one-click incident/runbook/audit deep-links to the Revenue Ops KPI summary panel.
