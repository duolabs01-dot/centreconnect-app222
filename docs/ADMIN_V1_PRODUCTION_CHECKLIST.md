# Admin V1 Production Checklist

This is the shipping checklist for CentreConnect Admin becoming production-ready.

## 1) Payments and Billing Automation (Top Priority)

- [x] Add provider integration scaffold (Paystack initialize + webhook verify/reconcile).
- [x] Add admin action to trigger invoice collection links.
- [x] Add idempotent webhook event ledger table.
- [x] Add webhook retry/replay tooling in admin UI.
- [ ] Add automatic invoice generation job (monthly + prorated cases).
- [ ] Add payment reminder workflow (D-7, D-3, due date, overdue cadence).
- [ ] Add dunning policy (grace period, suspension, reactivation rules).
- [ ] Add receipt generation and delivery after successful charge.
- [ ] Add tenant-facing self-serve payment method update flow.

## 2) Revenue Operations Coverage

- [ ] Replace manual status edits with event-driven transitions from real payment events.
- [ ] Add bulk collect/send operations for invoices.
- [ ] Add aging buckets and collections dashboard (0-30, 31-60, 61+).
- [ ] Add invoice timeline (issued, sent, paid, failed, retried) per tenant.
- [ ] Add exportable finance reports (CSV).

## 3) Security and Abuse Resistance

- [ ] Rate-limit public write endpoints (`/api/ecd/service-applications/submit`, `/api/analytics/events`).
- [ ] Add bot protection/challenge on high-risk public forms.
- [ ] Restrict invitation redirect URLs to approved origins only.
- [ ] Fail closed for protected paths when auth/role middleware lookup times out.
- [ ] Add endpoint-level audit fields for actor IP/user-agent where needed.

## 4) Data Integrity and Reliability

- [ ] Make multi-step admin mutations transactional (create tenant + subscription).
- [ ] Add idempotency keys for admin mutation endpoints with side effects.
- [ ] Add structured error taxonomy (validation/conflict/upstream/internal).
- [ ] Add compensating rollback for partial failures in all critical flows.

## 5) Testing and Release Gates

- [ ] Add integration tests for service-application lifecycle (`approve -> provision`).
- [ ] Add integration tests for billing lifecycle (`collect -> webhook paid -> subscription active`).
- [ ] Add regression tests for admin role enforcement on all admin APIs.
- [ ] Add smoke tests for webhook signature validation and duplicate-event handling.
- [ ] Add CI gate to run `lint`, `tsc --noEmit`, and tests before deploy.

## 6) Ops and Observability

- [ ] Add structured logs for billing/webhook pipelines.
- [ ] Add alerting for webhook failures and payment reconciliation lag.
- [ ] Add dashboard for failed webhook events with replay action.
- [ ] Add runbook for payment incidents and manual recovery.

## 7) UX Completion for Admin

- [ ] Show payment reference and checkout-link state in revenue tables.
- [ ] Add one-click resend of payment links to centre contacts.
- [ ] Add confirmation + risk copy for destructive billing actions.
- [ ] Add immutable audit trail viewer for all billing/admin actions.

## Exit Criteria for "Admin Can Do Everything"

Admin is considered complete when all below are true:

- [ ] Admin can trigger collections and payment is reconciled automatically.
- [ ] Subscription status transitions happen from actual billing events, not only manual edits.
- [ ] Failed payments and overdue accounts are automatically handled by policy.
- [ ] Critical admin actions are transactional and fully audited.
- [ ] Security controls (rate limits, redirect constraints, fail-closed behavior) are in place.
- [ ] Core admin lifecycle has automated integration tests and CI enforcement.
