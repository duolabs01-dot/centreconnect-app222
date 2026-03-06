# CC Admin Production-Readiness Audit

Date: 2026-03-06  
Auditor: Codex (orchestrated execution lane)

## Scope

- Admin auth and authorization boundaries for internal platform routes.
- Billing mutation paths (`subscriptions`, `invoices`, collection + resend operations).
- Paystack webhook ingestion/reconciliation and replay resilience.
- Admin critical-path validation gates (`test`, `tsc`, `lint`).

## Validation Evidence

- `npm.cmd test` passed:
  - webhook signature/idempotency checks
  - billing lifecycle integration
  - admin billing ops smoke coverage
  - structured log + alert path checks
- `npm.cmd exec tsc --noEmit` passed.
- `npm.cmd run -s lint` passed.

## Severity Ranking

### High

1. Manual status APIs can bypass event-driven billing truth.
   - Evidence:
     - [app/api/internal/platform-admin/subscriptions/[id]/route.ts](C:/Users/THEMBA/Downloads/centreconnect-app/centreconnect-app222/app/api/internal/platform-admin/subscriptions/[id]/route.ts:9) allows direct admin writes for `active|past_due|canceled|suspended`.
     - [app/api/internal/platform-admin/invoices/[id]/route.ts](C:/Users/THEMBA/Downloads/centreconnect-app/centreconnect-app222/app/api/internal/platform-admin/invoices/[id]/route.ts:9) allows direct admin writes for `paid|sent|overdue|canceled`.
     - Both endpoints immediately call DB updates ([subscriptions route](C:/Users/THEMBA/Downloads/centreconnect-app/centreconnect-app222/app/api/internal/platform-admin/subscriptions/[id]/route.ts:33), [invoices route](C:/Users/THEMBA/Downloads/centreconnect-app/centreconnect-app222/app/api/internal/platform-admin/invoices/[id]/route.ts:45)).
   - Risk:
     - Divergence between real provider events and internal billing/subscription status.
     - Financial reporting and dunning logic can become inconsistent.
   - Action:
     - Implement `BL-REV-009`: restrict admin manual status updates to safe override flows and make event-driven transitions authoritative.

### Medium

2. Activity logging failures are non-blocking and can silently reduce audit completeness.
   - Evidence:
     - [lib/admin/activity-log.ts](C:/Users/THEMBA/Downloads/centreconnect-app/centreconnect-app222/lib/admin/activity-log.ts:31) logs insertion errors with `console.error` and continues.
   - Risk:
     - Critical admin mutations may succeed without durable activity records.
   - Action:
     - Add explicit log-write fallback telemetry + alert counter, and classify failures for operational follow-up.

3. Replay controls exist but not yet separated into a dedicated failed-events operations dashboard.
   - Evidence:
     - Replay endpoint is implemented: [app/api/internal/platform-admin/webhooks/paystack/events/[id]/replay/route.ts](C:/Users/THEMBA/Downloads/centreconnect-app/centreconnect-app222/app/api/internal/platform-admin/webhooks/paystack/events/[id]/replay/route.ts:1).
     - Replay actions are currently embedded in revenue ops table; backlog still calls for focused failed-events dashboard.
   - Risk:
     - Slower incident triage in high-volume failure conditions.
   - Action:
     - Implement `BL-OPS-003`: failed webhook dashboard with filtering and replay workflow.

### Low

4. Immutable billing/admin action viewer is not yet exposed as a first-class admin screen.
   - Evidence:
     - Write-path activity logging exists, but no dedicated route listed for immutable timeline review.
   - Risk:
     - Reduced operational visibility and slower forensic review.
   - Action:
     - Implement `BL-UX-009`: admin audit trail viewer.

## Positive Findings

- Webhook resilience baseline is good:
  - signature verification, idempotency, reconciliation tests pass.
- Core validation gates are currently green (`test`, `tsc`, `lint`).
- Billing operations now include link resend, destructive-action confirmation, and structured logging coverage.

## Recommended Execution Order

1. `BL-UX-009` immutable audit trail viewer.
2. `BL-OPS-003` failed webhook events dashboard with replay.
3. `BL-OPS-004` payment incident + manual recovery runbook completion.
4. `BL-REV-009` event-driven transition hardening for invoice/subscription status.

