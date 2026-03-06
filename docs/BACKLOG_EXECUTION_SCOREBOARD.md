# Backlog Execution Scoreboard

Last updated: 2026-03-06
Owner: Founder

This file is the live execution board for orchestrated Codex sessions.
Rule: keep exactly one `Now` item active until its definition of done is met.

## Snapshot

- Objective: Finish whole-product backlog with blocker-first sequencing.
- Current bottleneck: Operator quick-access and UI cleanup after backend reliability hardening.
- Active lane: `revenue + reliability debt`

## Now

- [ACTIVE] `BL-OPS-005` `platform` Add operator quick-links to incident runbook from revenue/incident screens
  - Why: Reliability tooling is shipped; operators need one-click guidance during incidents.
  - Definition of done:
    - Runbook links are visible from `/admin/revenue` and `/admin/webhook-failures`.
    - Links open the incident runbook and audit trail quickly.
    - Operator can reach recovery instructions in one click during triage.
  - Validation:
    - `npm.cmd exec tsc --noEmit`
    - `npm.cmd run -s lint`
    - Manual navigation check
  - Est: 1-2h

## Next

- [READY] `BL-REV-010` `revenue` Remove stale manual status controls from admin revenue UI
- [READY] `BL-REL-003` `platform` Add persistence-backed throttling for activity-log failure alerts
- [READY] `BL-QA-003` `quality` Extend smoke checks to cover activity-log alerting failure simulation

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
