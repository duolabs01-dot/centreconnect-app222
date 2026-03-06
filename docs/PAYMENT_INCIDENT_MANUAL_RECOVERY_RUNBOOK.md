# Payment Incident + Manual Recovery Runbook

Last updated: 2026-03-06  
Owner: Platform Admin (CentreConnect)

## Purpose

Use this runbook when payment processing, invoice reconciliation, or webhook handling is degraded and you need a repeatable, safe recovery path.

## Incident Classes

1. `WEBHOOK_PIPELINE_DEGRADED`
   - Symptoms: `payment_webhook_events.status = failed` spike, lagging `processed_at`, retry noise.
2. `INVOICE_COLLECTION_FAILED`
   - Symptoms: collect/resend actions fail, missing `payment_url`, repeated provider errors.
3. `RECONCILIATION_DRIFT`
   - Symptoms: successful provider charges but invoice remains `sent/overdue` and subscription not re-activated.
4. `ALERT_STORM_OR_SILENCE`
   - Symptoms: too many webhook alerts or expected alerts missing while failures rise.

## Primary Console Surfaces

- Revenue operations: `/admin/revenue`
- Failed webhook queue + replay: `/admin/webhook-failures`
- Immutable action timeline: `/admin/audit-trail`

## First 10 Minutes (Containment)

1. Confirm incident type and blast radius:
   - Count failed events in `/admin/webhook-failures`.
   - Identify affected invoices/tenants by reference + invoice number.
2. Freeze risky manual edits:
   - Do not mass-edit invoice/subscription statuses while root cause is unknown.
3. Capture evidence:
   - Screenshot failure counts and top errors.
   - Copy 3-5 representative webhook event IDs.
4. Start incident log entry in `/admin/audit-trail` context notes (include timestamp + owner).

## Triage Checklist

1. Signature/verification path
   - Confirm webhook secret is configured and not recently rotated incorrectly.
2. Provider API health
   - Validate collect initialization still returns authorization URLs for test invoice.
3. DB mutation health
   - Check whether `payment_webhook_events` rows are being inserted but not processed.
4. Reconciliation path
   - Confirm reconcile path still updates `invoices` and `subscriptions` for known good events.

## Audit Log Degradation (BL-REL-002)

If admin actions are succeeding but `/admin/audit-trail` is missing expected entries:

1. Check server logs for:
   - `platform_activity_log_write_failed`
   - `platform_activity_log_alert_failed`
2. Confirm alert email with subject `Activity Log Write Failure` was sent.
3. Review context fields in logs:
   - `action`
   - `entityType`
   - `entityId`
   - `actorEmail` / `actorUserId`
4. Keep operating in reduced-risk mode:
   - avoid high-volume bulk mutations
   - capture manual notes for critical actions until logging is restored

### Failure Simulation (non-production only)

Use this to verify alert path works end-to-end:

1. Set `CC_ACTIVITY_LOG_FORCE_FAIL=1` in local/dev environment.
2. Trigger any admin action that writes platform activity.
3. Verify:
   - structured error log emitted (`platform_activity_log_write_forced_failure`)
   - throttled alert email is sent
4. Remove `CC_ACTIVITY_LOG_FORCE_FAIL` and re-test normal activity logging.

## Manual Recovery Workflow

### A) Replay failed webhook events

1. Open `/admin/webhook-failures`.
2. Filter to `Failed only`.
3. Replay one representative event first.
4. Confirm status transition result in toast and row refresh.
5. Validate invoice/subscription mutation reflected in `/admin/revenue`.
6. Continue replay in small batches (10-20), pausing if error patterns change.

### B) API-level replay fallback

If UI replay is unavailable, replay directly:

```bash
POST /api/internal/platform-admin/webhooks/paystack/events/{eventId}/replay
```

Expected success payload:

```json
{
  "ok": true,
  "id": "event-row-id",
  "processed": true,
  "status": "processed",
  "previousStatus": "failed"
}
```

### C) Reconciliation verification

For each sampled recovered invoice:

1. Invoice status moved to `paid` for successful charge events.
2. `paid_at` is populated.
3. Related subscription is `active` when appropriate.
4. Audit event exists in `/admin/audit-trail` for replay action.

## Escalation Rules

Escalate immediately when:

- More than 25% of events in last hour are `failed`.
- Replayed events keep failing with the same root error.
- Invoice statuses diverge from provider truth after replay.
- Any auth/permission anomaly appears on admin internal APIs.

## Operator Communication Templates

### Internal (Founder/Operator)

`Payment incident detected at {time}. Scope: {n} webhook events, {m} invoices. Containment started, manual replay in progress, next update in 30 minutes.`

### Centre-facing (if delays impact payment links)

`Hi, we are resolving a temporary payment processing issue on CentreConnect. Your billing data is safe. We will resend your payment link shortly and confirm when complete.`

## Exit Criteria

Incident is closed only when all are true:

1. Failed webhook queue returns to baseline.
2. Replayed sample set reconciles correctly end-to-end.
3. No new high-severity errors for 60 minutes.
4. Post-incident note added to `/admin/audit-trail` with root cause + follow-up task IDs.

## Post-Incident Follow-up

Create or update backlog tasks for:

- root cause hardening
- missing alerts
- coverage gaps in integration tests
- documentation updates

Always record the exact task IDs in `docs/BACKLOG_EXECUTION_SCOREBOARD.md`.
