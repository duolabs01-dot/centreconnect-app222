# Billing Invoice Generation Runbook

Use this when the automated subscription invoice job fails or needs replay for a specific month.

## Automated Job

- Endpoint: `POST /api/internal/platform-admin/invoices/generate`
- Trigger: Vercel Cron (`0 2 * * *`, daily UTC)
- Auth: `Authorization: Bearer <CRON_SECRET>`

## Collections Automation Job

- Endpoint: `POST /api/internal/platform-admin/billing/automation`
- Trigger: Vercel Cron (`0 3 * * *`, daily UTC)
- Scope:
  - Reminder cadence (`D-7`, `D-3`, due date, overdue cadence).
  - Dunning transitions (`past_due` and `suspended` after grace period).
  - Reminder event logging (`notification_logs`) and invoice reminder state updates.
  - Webhook pipeline health checks + alerting for failures/lag.

## Manual Replay / Fallback

### 1) Generate the current month

Run while authenticated as platform admin:

```bash
curl -X POST "https://<your-domain>/api/internal/platform-admin/invoices/generate"
```

### 2) Replay a specific month

Use `period=YYYY-MM`:

```bash
curl -X POST "https://<your-domain>/api/internal/platform-admin/invoices/generate?period=2026-03"
```

### 3) Run as cron identity (server-to-server)

```bash
curl -X POST "https://<your-domain>/api/internal/platform-admin/invoices/generate?period=2026-03" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Expected Response Fields

- `generated`
- `skippedExisting`
- `skippedInactiveCentre`
- `skippedNonBillable`
- `periodStart`
- `periodEnd`

## Proration Rule

- If a subscription starts after month start, invoice amount is prorated:
  - `monthly_price * (billable_days / total_days_in_month)`
- Proration metadata is stored in invoice `line_items[].proration`.

## Receipt + Payment Method Events

- On Paystack `charge.success` for an invoice:
  - Invoice is marked `paid`.
  - Subscription is reactivated to `active` when previously `trial`, `past_due`, or `suspended`.
  - Receipt delivery is attempted once and tracked via `receipt_sent_at`.
- On Paystack `charge.success` with `payment_method_update=true` metadata:
  - Card authorization details are upserted into `ecd_billing_payment_methods`.
  - Matching `billing_payment_method_updates` request is marked `completed`.

## Admin Collections UX

- Revenue tables now show:
  - `payment_reference`
  - checkout link state (`Link ready` vs `Missing`)
  - reminder stage + dunning state
- Admin can resend payment links with:
  - `POST /api/internal/platform-admin/invoices/:id/resend-payment-link`

## Failure Handling

1. Verify `CRON_SECRET` is configured in Vercel.
2. Check Vercel function logs for `/api/internal/platform-admin/invoices/generate`.
3. Check Vercel function logs for `/api/internal/platform-admin/billing/automation`.
4. Replay month manually with `period=YYYY-MM`.
5. Run automation manually:

```bash
curl -X POST "https://<your-domain>/api/internal/platform-admin/billing/automation" \
  -H "Authorization: Bearer $CRON_SECRET"
```

6. Confirm invoices created in `public.invoices` with `invoice_number` format `INV-<YYYYMM>-<ECDKEY>`.
7. Confirm reminder states on invoices (`reminder_last_stage`, `reminder_last_sent_at`) and dunning transitions on subscriptions.
