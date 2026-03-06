# Backlog Execution Scoreboard

Last updated: 2026-03-06
Owner: Founder

This file is the live execution board for orchestrated Codex sessions.
Rule: keep exactly one `Now` item active until its definition of done is met.

## Snapshot

- Objective: Finish whole-product backlog with blocker-first sequencing.
- Current bottleneck: Badge colors still need an explicit legend for rapid interpretation by new operators.
- Active lane: `revenue + reliability debt`

## Now

- [ACTIVE] `BL-UX-013` `admin` Add legend explaining healthy/warning/critical badge thresholds
  - Why: Incident badges exist but threshold semantics are not yet documented inline.
  - Definition of done:
    - Revenue summary includes compact legend mapping colors to threshold ranges.
    - Legend reflects the exact failure/suppression/lag thresholds in code.
    - Operators can interpret badge states without opening runbook.
  - Validation:
    - `npm.cmd test`
    - `npm.cmd exec tsc --noEmit`
    - `npm.cmd run -s lint`
  - Est: 1-2h

## Next

- [READY] `BL-OBS-004` `platform` Add trend tooltip metadata (bucket window + max value) on sparkline
- [READY] `BL-QA-007` `quality` Add regression checks for stale-data warning threshold behavior
- [READY] `BL-OPS-010` `platform` Add stale-warning acknowledgement action log entry for operator accountability

## Blocked

- None

## Done This Week

- [DONE] `BL-REV-001` Automated monthly invoice generation with cron trigger, proration, and replay runbook.
- [DONE] `BL-REV-002` Payment reminder cadence automation (D-7, D-3, due date, overdue stages) with idempotent delivery.
- [DONE] `BL-REV-003` Dunning policy automation (grace -> past_due -> suspended) with webhook-driven reactivation.
- [DONE] `BL-REV-004` Receipt generation and email delivery after successful charge reconciliation.
- [DONE] `BL-REV-005` Tenant self-serve payment method update flow (ECD billing + webhook authorization capture).
- [DONE] `BL-REV-006` Revenue tables now show payment references + checkout-link state.
- [DONE] `BL-REV-007` One-click resend payment-link flow to centre contacts.
- [DONE] `BL-REV-008` Added destructive-action confirmation + risk copy in admin billing controls.
- [DONE] `BL-OPS-001` Added structured logs across billing and webhook pipelines.
- [DONE] `BL-OPS-002` Added webhook failure + reconciliation-lag alerting path.
- [DONE] `BL-TEST-001` Billing lifecycle integration QA coverage (`collect -> webhook paid -> subscription active`).
- [DONE] `BL-QA-001` Added CI gate to run lint + type-check + tests.
- [DONE] `BL-QA-002` Added Paystack webhook smoke test coverage for signature + duplicate handling.
- [DONE] `BL-SEC-001` Added webhook event audit fields for source IP and user-agent.
- [DONE] `BL-AUDIT-001` CC Admin production-readiness audit report published with severity-ranked findings and evidence.
- [DONE] `BL-UX-009` Immutable audit trail viewer shipped at `/admin/audit-trail` with actor/action/date filters.
- [DONE] `BL-OPS-003` Dedicated failed webhook incident dashboard shipped at `/admin/webhook-failures` with replay controls.
- [DONE] `BL-OPS-004` Payment incident and manual recovery runbook published (`docs/PAYMENT_INCIDENT_MANUAL_RECOVERY_RUNBOOK.md`).
- [DONE] `BL-REV-009` Manual invoice/subscription mutation endpoints now reject event-owned state transitions.
- [DONE] `BL-REL-002` Activity-log write failures now emit structured fallback telemetry with throttled operator alerting.
- [DONE] `BL-TEST-002` Added regression checks for admin audit trail and webhook incident dashboard surfaces.
- [DONE] `BL-OPS-005` Added one-click operator quick-links to incident runbook and triage surfaces.
- [DONE] `BL-REV-010` Removed stale manual status mutation controls from admin revenue operations UI.
- [DONE] `BL-REL-003` Added persistence-backed throttling for activity-log failure alerts using marker entries.
- [DONE] `BL-QA-003` Extended regression checks for activity-log forced-failure simulation and non-production guard.
- [DONE] `BL-UX-010` Added read-only event-driven status guidance panel with incident/runbook links in Revenue Ops.
- [DONE] `BL-OPS-006` Added one-click incident/runbook/audit deep-links to the Revenue Ops KPI summary panel.
- [DONE] `BL-OBS-001` Added activity-log alert sent vs suppressed counters to the webhook incident reliability surface.
- [DONE] `BL-QA-004` Added negative-case regression checks for blocked manual event-owned status transitions in admin APIs.
- [DONE] `BL-UX-011` Added compact billing state glossary in Revenue Ops guidance panel.
- [DONE] `BL-OPS-007` Added incident health badge indicators to Revenue Ops summary.
- [DONE] `BL-OBS-002` Added 24h vs previous-24h trend deltas for activity-log alert sent/suppressed counters.
- [DONE] `BL-QA-005` Locked regression checks for revenue summary deep-links and glossary/guidance presence.
- [DONE] `BL-UX-012` Added compact escalation note beside revenue summary health badges.
- [DONE] `BL-OPS-008` Added revenue summary refresh timestamp, counter age label, and one-click refresh control.
- [DONE] `BL-OBS-003` Added sent/suppressed alert trend sparkline to webhook incident observability surface.
- [DONE] `BL-QA-006` Added regression checks for escalation-note copy and badge threshold logic.
- [DONE] `BL-OPS-009` Added explicit stale-data warning state when counter age exceeds SLA threshold.
