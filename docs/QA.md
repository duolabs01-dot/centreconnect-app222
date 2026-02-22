# QA Checklist

## Environment

- [ ] `.env.local` exists and has valid `NEXT_PUBLIC_SUPABASE_URL`.
- [ ] `.env.local` has valid `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] `.env.local` has valid `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] `.env.local` has valid `PAYSTACK_SECRET_KEY`.
- [ ] `.env.local` has valid `PAYSTACK_WEBHOOK_SECRET` (or intentionally omitted to fallback to secret key).
- [ ] Supabase migration `supabase/migrations/001_initial_schema.sql` has been applied.
- [ ] Supabase migration `supabase/migrations/019_payments_webhook_and_invoice_fields.sql` has been applied.

## Build and Startup

- [ ] `npm run build` completes successfully.
- [ ] `npm run start` serves the app without runtime errors.
- [ ] Landing page (`/`) loads.

## Auth Flows

- [ ] `/login` renders and accepts valid credentials.
- [ ] `/register` creates a user successfully.
- [ ] After login, users are redirected by role:
  - [ ] `platform_admin` -> `/admin/dashboard`
  - [ ] `ecd_admin` or `ecd_staff` -> `/ecd/dashboard`
  - [ ] `parent_user` -> `/parent/dashboard`

## Route Protection

- [ ] Anonymous user opening `/parent/dashboard` is redirected to `/login`.
- [ ] Anonymous user opening `/ecd/dashboard` is redirected to `/login`.
- [ ] Anonymous user opening `/admin/dashboard` is redirected to `/login`.
- [ ] Signed-in parent cannot access `/ecd/*` or `/admin/*`.
- [ ] Signed-in ECD user cannot access `/admin/*`.
- [ ] Signed-in admin cannot access `/parent/*` unless explicitly allowed.

## Supabase Safety

- [ ] Client code does not reference `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Service role key is only used server-side.
- [ ] No real credentials are committed in `.env.example`.

## Regression Smoke

- [ ] No infinite redirect loops across `/login`, `/register`, and dashboards.
- [ ] Middleware runs without throwing for static assets and Next internals.

## Offer Acceptance + Auto-Withdraw

- [ ] Parent applies to 3 different centres for the same child.
- [ ] One centre sets the application status to `Approved` and sees: `Offer sent. Parent must accept to finalize.`
- [ ] Parent sees an `Offer received` card with `Accept` and `Decline` actions.
- [ ] Parent clicks `Accept`.
- [ ] Accepted application keeps `Approved` and sets `offer_accepted_at`.
- [ ] Other active applications for the same child (`Submitted`, `In Review`, `Waitlisted`) automatically become `Withdrawn`.
- [ ] Auto-withdrawn applications set `withdrawn_at` and `withdraw_reason=auto_after_accept`.
- [ ] Other centres only see withdrawal status update and do not learn where the child enrolled.

## Billing Collection + Webhook

- [ ] Admin Revenue page can initialize collection for an unpaid invoice via **Collect** action.
- [ ] Collect action returns a Paystack checkout URL and stores `payment_reference` on invoice.
- [ ] Paystack webhook `charge.success` marks invoice as `paid` and sets `paid_at`.
- [ ] `charge.success` event updates related subscription status to `active` (when prior status is `trial`, `past_due`, or `suspended`).
- [ ] Duplicate webhook deliveries are idempotent (no duplicate mutations, returns success response).
