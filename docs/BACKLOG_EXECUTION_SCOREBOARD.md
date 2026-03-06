# Backlog Execution Scoreboard

Last updated: 2026-03-06 (parent hard-pass)
Owner: Founder

This file is the live execution board for orchestrated Codex sessions.
Rule: keep exactly one `Now` item active until its definition of done is met.

## Snapshot

- Objective: Unblock parent portal reliability and restore trust-critical UX/copy.
- Current bottleneck: Parent-side UAT coverage is still mostly manual.
- Active lane: `parent reliability + parent UX quality`

## Now

- [ACTIVE] `BL-PARENT-007` `parent` Run scripted parent UAT matrix against key parent actions
  - Why: Core blockers were fixed, but regressions can still hide in low-frequency paths.
  - Definition of done:
    - Execute a route/action checklist for dashboard, discover/directory, children, emergency, guardians, documents, and profile.
    - Capture pass/fail per action and file follow-up tickets.
    - Ship fixes for any P1/P2 defects found in the same lane.
  - Validation:
    - `npm.cmd run -s build`
    - `npm.cmd run -s lint`
  - Est: 2-4h

## Next

- [READY] `BL-PARENT-008` `parent` Add e2e smoke checks for child create + emergency contact create.
- [READY] `BL-PARENT-009` `parent` Finish plain-English copy pass across parent primary flows.
- [READY] `BL-PARENT-010` `parent` Add telemetry for parent form submit failures by route.

## Blocked

- None

## Done This Week

- [DONE] `BL-PARENT-006` Parent hard-pass blockers fixed: Supabase browser singleton, parent bootstrap/upsert guardrails, child creation array-field fix, emergency/doc/profile mutation hardening, bottom-nav de-crowding, landing overlap fix, brand header restore, and parent signup confirmation email CSS refresh.
- [DONE] `BL-REV-010` Removed stale manual status mutation controls from admin revenue operations UI.
- [DONE] `BL-REL-003` Added persistence-backed throttling for activity-log failure alerts using marker entries.
- [DONE] `BL-QA-003` Extended regression checks for activity-log forced-failure simulation and non-production guard.
- [DONE] `BL-UX-010` Added read-only event-driven status guidance panel with incident/runbook links in Revenue Ops.
- [DONE] `BL-OPS-006` Added one-click incident/runbook/audit deep-links to the Revenue Ops KPI summary panel.
