# Backlog Execution Scoreboard

Last updated: 2026-03-06
Owner: Founder

This file is the live execution board for orchestrated Codex sessions.
Rule: keep exactly one `Now` item active until its definition of done is met.

## Snapshot

- Objective: Finish whole-product backlog with blocker-first sequencing.
- Current bottleneck: Extending QA coverage for forced-failure alert simulation path.
- Active lane: `revenue + reliability debt`

## Now

- [ACTIVE] `BL-QA-003` `quality` Extend smoke checks to cover activity-log alerting failure simulation
  - Why: Persistent throttle is now implemented and needs explicit regression proof.
  - Definition of done:
    - QA checks verify `CC_ACTIVITY_LOG_FORCE_FAIL=1` simulation path is documented and guarded.
    - QA checks verify persistent marker action exists in activity log hardening logic.
    - Test lane remains green with new assertions.
  - Validation:
    - `npm.cmd test`
    - `npm.cmd exec tsc --noEmit`
    - `npm.cmd run -s lint`
  - Est: 1-2h

## Next

- [READY] `BL-UX-010` `admin` Add read-only status guidance panel to Revenue Ops for operator clarity
- [READY] `BL-OPS-006` `platform` Add admin runbook deep-links to Revenue Ops summary panel
- [READY] `BL-OBS-001` `platform` Add metric counters for activity-log alert suppression vs sent alerts

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
