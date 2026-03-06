# Backlog Execution Scoreboard

Last updated: 2026-03-06
Owner: Founder

This file is the live execution board for orchestrated Codex sessions.
Rule: keep exactly one `Now` item active until its definition of done is met.

## Snapshot

- Objective: Finish whole-product backlog with blocker-first sequencing.
- Current bottleneck: Admin visibility + incident workflow hardening before tightening event-driven controls.
- Active lane: `revenue + reliability debt`

## Now

- [ACTIVE] `BL-UX-009` `admin` Immutable audit trail viewer for all billing/admin actions
  - Why: Audit is complete; immutable operator visibility is now the fastest risk reducer for admin incidents.
  - Definition of done:
    - New admin route shows immutable activity entries (actor, action, entity, timestamp, details).
    - Filters for actor/action/date are available for triage use.
    - Non-admin access is blocked.
  - Validation:
    - `npm.cmd exec tsc --noEmit`
    - `npm.cmd run -s lint`
    - Manual role-check on `/admin/audit-trail`
  - Est: 3-5h

## Next

- [READY] `BL-OPS-003` `platform` Dashboard for failed webhook events with replay action
- [READY] `BL-OPS-004` `platform` Payment incident + manual recovery runbook completion
- [READY] `BL-REV-009` `revenue` Replace manual status edits with event-driven transitions from real payment events

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
