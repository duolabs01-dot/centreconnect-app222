# CentreConnect — AI Agent Reference Guide

> This file is the single source of truth for any AI agent (Claude, ChatGPT, Cursor, Copilot, etc.) working on this codebase.
> Read this before touching any file. It will save you from making wrong assumptions.

---

## What This Product Is

**CentreConnect** is a South African SaaS platform for Early Childhood Development (ECD) centres — commonly called "creches". It serves three user types:

1. **Parents** — find creches, apply, track applications, receive daily reports on enrolled children
2. **ECD Owners / Staff** — manage admissions, attendance, compliance, DOE reporting, parent communications
3. **Platform Admin** — CentreConnect staff who manage tenants, billing, support

The product is live and in production. There are real paying customers. Treat every change carefully.

**Domain:** `centreconnect.co.za`
**Currency:** South African Rand (ZAR)
**Primary market:** Gauteng, South Africa (Alexandra, Sandton, Tembisa area)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.1.0 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3.3 + shadcn/ui (Radix UI) |
| Database | Supabase (PostgreSQL + RLS + Realtime) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Payments | Paystack (ZAR, webhooks at `/api/webhooks/paystack`) |
| Email | Nodemailer + SMTP |
| AI | Google Gemini (`GEMINI_API_KEY`) |
| OCR | Tesseract.js (attendance register scanning) |
| Maps | MapLibre GL (no Google Maps dependency) |
| Push Notifications | Web Push API + VAPID keys |
| Rate Limiting | Upstash Redis (optional) |
| Bot Protection | Cloudflare Turnstile |
| Analytics | Vercel Analytics |
| PDF Export | HTML → new window → Ctrl+P (no Puppeteer in user flow) |
| Runtime | Node.js 20.20.0 (via Volta) |

---

## Repository Structure

```
centreconnect-app222/
├── app/                        # Next.js App Router pages & API routes
│   ├── (auth)/                 # Parent/admin login + register
│   ├── (journey)/              # Main public + parent portal routes
│   │   ├── page.tsx            # Home page (server) + page.client.tsx
│   │   ├── directory/          # Centre search directory
│   │   ├── for-centres/intro/  # ECD marketing/conversion page
│   │   ├── ecd/welcome/        # Post-signup ECD welcome pack
│   │   ├── join/               # ECD onboarding flow
│   │   └── parent/             # Full parent portal
│   ├── ecd/                    # ECD centre portal
│   │   ├── (portal)/           # All authenticated ECD pages
│   │   ├── login/              # ECD login
│   │   ├── register/           # ECD registration (4-step wizard)
│   │   ├── claim/              # Claim existing centre
│   │   └── onboarding/         # Post-registration onboarding
│   ├── admin/                  # Platform admin workspace
│   ├── apply/[identifier]/     # Public application form (no auth needed)
│   ├── c/[slug]/               # Public centre profile page
│   ├── api/                    # All API route handlers
│   └── ...                     # Legal, auth callbacks, misc
├── components/
│   ├── auth/                   # ParentAuthShell + auth UI
│   ├── ecd/                    # ECD-specific components
│   ├── layout/                 # Sidebar, nav, shells, headers
│   ├── parent/                 # Parent portal components (CentreCard.tsx DEPRECATED — do not use)
│   ├── shared/                 # Shared components used across portals
│   │   └── CentreCard.tsx      # Unified card — variant="full" (grid) or "compact" (list)
│   ├── ui/                     # shadcn/ui base components
│   └── ...
├── types/
│   ├── centre-card.ts          # CentreCardData type + age group parsers
│   └── ...                     # Other global TypeScript types
├── lib/
│   ├── auth/                   # Auth utilities, role provisioning
│   ├── billing/                # Plans, tiers, Paystack integration
│   ├── ecd/                    # Feature gates, DOE export, provisioning
│   ├── email/                  # Email templates + sender
│   ├── supabase/               # Client, server, admin Supabase clients
│   ├── actions/                # Server Actions (admissions, guardians, etc.)
│   └── ...
├── supabase/
│   └── migrations/             # 125+ SQL migration files
├── types/                      # Global TypeScript types
├── public/                     # Static assets
├── .claude/
│   ├── rules/                  # Locked UX/UI rules — READ THESE
│   └── launch.json             # Dev server config (port 3010)
├── CLAUDE.md                   # This file
├── launch_guide.md             # Pre-launch checklist (may be out of date)
└── BACKLOG.md                  # Prioritised feature backlog
```

---

## The Three Portals

### 1. Parent Portal (`/parent/*` and `/(journey)/*`)

**Auth:** `parent_user` role
**Theme:** Light — white/cream backgrounds, teal accents
**Entry:** `/` home → `/directory` → `/apply/[identifier]` → `/register` → `/login` → `/parent/dashboard`
**Shell:** `components/layout/parent-app-shell.tsx`
**Mobile nav:** State-based bottom tab bar (`components/layout/bottom-nav.tsx`)

**Parent home state machine** (`lib/parent/home-state.ts`):
The parent dashboard and bottom navigation change based on three states:

| State | Condition | Dashboard shows | Bottom nav |
|---|---|---|---|
| `discover` | No applications, no enrolled child | Warm greeting + suggested crèches + single CTA | Find · Applied · Updates · Profile |
| `pending` | Has active applications, no enrolled child | Per-application cards with plain English status | Find · Applied · Updates · Profile |
| `enrolled` | Has enrolled child | Child's daily report, teacher notes, pickup code | Today · Inbox · Pickup · Profile |

The state is derived by `deriveParentHomeState()` and flows through `ParentLayoutProvider` context to both the dashboard page and `FooterConditionalRenderer` (which renders the bottom nav).

**Nav arrays** (`lib/navigation-config.ts`):
- `PARENT_NAV_ITEMS_PRE_ENROLLMENT` — Find, Applied, Updates, Profile
- `PARENT_NAV_ITEMS_ENROLLED` — Today, Inbox, Pickup, Profile

Key pages:
- `/parent/dashboard` — emotion-first home screen (content varies by state)
- `/parent/applications` — all applications with status tracking
- `/parent/children` — child profiles, documents, guardians
- `/parent/daily-reports` — daily updates from ECD staff
- `/parent/shortlist` — saved centres
- `/parent/compare` — side-by-side centre comparison
- `/parent/onboarding` — multi-step setup wizard

### 2. ECD Portal (`/ecd/(portal)/*`)

**Auth:** `ecd_admin`, `ecd_staff`, or `ecd_supervisor` role
**Theme:** DARK — `bg-slate-900`, teal accents (`text-teal-300`, `bg-teal-500/15`)
**Entry:** `/ecd/login` → `/ecd/dashboard`
**Shell:** `app/ecd/layout.tsx` + `components/layout/ecd-portal-sidebar.tsx`
**Mobile nav:** Hamburger → Sheet drawer (same dark style as desktop sidebar — NO bottom tab bar)

Navigation groups (from `components/layout/ecd-navigation.ts`):

| Group | Items |
|---|---|
| Daily Ops | Dashboard, Children, Attendance, Daily Reports, Report Cards, Calendar |
| Management | Admissions, Communications, DOE Monthly Return, Compliance |
| Grow | Financials, Website |
| Account | Billing, Settings |

Key pages:
- `/ecd/dashboard` — stats overview, quick actions
- `/ecd/(portal)/attendance` — DSD-compliant attendance register
- `/ecd/(portal)/applications` — admissions pipeline
- `/ecd/(portal)/dsd-export` — DOE monthly report generation + PDF download
- `/ecd/(portal)/children` — enrolled child records
- `/ecd/(portal)/communications` — parent messaging (Growth tier+)
- `/ecd/(portal)/daily-reports` — staff daily logs
- `/ecd/(portal)/report-cards` — child assessments

### 3. Admin Portal (`/admin/*`)

**Auth:** `platform_admin` role
**Theme:** Dark, same as ECD
**Entry:** `/admin/command`

Key pages:
- `/admin/command` — primary command centre
- `/admin/tenants` — manage all ECD centres (CRUD, approve applications)
- `/admin/revenue` — billing + Paystack payments
- `/admin/support` — support tickets
- `/admin/webhook-failures` — failed Paystack webhook tracking
- `/admin/audit-trail` — system audit logs
- `/admin/invites` — pending invitations
- `/admin/ai-os` — AI assistant commands

---

## Auth & Roles

### Roles (stored in `user_profiles.role`)

```typescript
type AuthRole =
  | 'platform_admin'   // CentreConnect internal team
  | 'ecd_admin'        // Centre owner / principal
  | 'ecd_staff'        // Centre staff member
  | 'ecd_supervisor'   // Supervisory staff
  | 'parent_user'      // Parent / guardian
```

### Auth Flows

**Parents:**
- Email/password OR Google OAuth
- Email confirmation required before first login
- `POST /api/auth/register-parent` → confirms email → `GET /auth/confirm` → `/parent/onboarding`

**ECD users:**
- Email/password only (no Google OAuth)
- Invited via `/api/ecd/invitations` → secure link in email → set password → login
- On login: calls `POST /api/ecd/bootstrap-centre` — returns 403 if application not yet approved by admin
- **New ECD registrations are gated** — they submit an application (`ecd_service_applications` table) and must be manually approved by a platform admin before they can access the portal

**Supabase clients (three different clients — never mix them up):**
```
lib/supabase/client.ts    → Browser client (anon key, client components)
lib/supabase/server.ts    → Server client (anon key + cookies, server components/actions)
lib/supabase/admin.ts     → Admin client (service_role key — server only, bypasses RLS)
```

---

## Billing & Tiers

### Plans

| Public Name | Internal Tier | Price | Paystack |
|---|---|---|---|
| Starter | `basic` | R0/month | No subscription |
| Growth | `standard` | R299/month or R2,990/year | Active subscription |
| Pro | `premium` | R499/month or R4,990/year | Active subscription |

### Feature Gates

File: `lib/ecd/feature-gates.ts`
Function: `hasEcdFeatureAccess({ supabase, ecdId, feature })` → `{ allowed, tier, minimumTier }`

| Feature Key | Minimum Tier | Notes |
|---|---|---|
| `attendance` | `basic` (Starter) | Current month only on Starter |
| `attendance-history` | `standard` (Growth) | Month navigation, past months |
| `dsd-export` | `basic` (Starter) | 1 export/quarter on Starter |
| `dsd-export-unlimited` | `standard` (Growth) | Unlimited exports |
| `applications` | `basic` (Starter) | 3 full applications on Starter |
| `applications-full` | `standard` (Growth) | Unlimited |
| `communications` | `standard` (Growth) | Parent messaging |
| `calendar` | `standard` (Growth) | |
| `daily-reports` | `standard` (Growth) | |
| `report-cards` | `standard` (Growth) | |
| `compliance` | `standard` (Growth) | |
| `employment` | `standard` (Growth) | |
| `financials` | `standard` (Growth) | |
| `pickup` | `standard` (Growth) | QR-based safe collection verification |
| `website-builder` | `premium` (Pro) | Coming soon |

### Subscription Status Values
`trial` | `active` | `past_due` | `canceled` | `suspended`

---

## Database Key Tables

All tables use Supabase RLS. Use `lib/supabase/admin.ts` only on the server when you need to bypass RLS.

### Core Tables

| Table | Purpose |
|---|---|
| `user_profiles` | id, role, full_name, phone — one row per auth user |
| `ecd_centres` | id, slug, name, email, address, suburb, city, province, lat/lng, logo_url, cover_image_url, is_active, onboarded_at, **is_public_listing** (BOOLEAN), **onboarding_complete** (BOOLEAN), **onboarding_completed_at** (TIMESTAMPTZ — set when owner completes `/ecd/onboarding`; used to gate first-week dashboard experience and Day 14 drip email), **onboarding_progress** (JSONB — keys: `logo`, `cover`, `description`, `children`, `attendance`, `pickup`, `published`) |
| `ecd_admins` | Links user → centre (user_id, ecd_id, role, invited_at, accepted_at) |
| `children` | id, ecd_id, first_name, last_name, date_of_birth, class_id, gender |
| `attendance` | child_id, date, status (present/absent/sick/late), ecd_id |
| `applications` | Parent → centre application (ecd_id, status, child details) |
| `subscriptions` | ecd_id, tier, status, monthly_price, trial_ends_at |
| `invoices` | ecd_id, subscription_id, amount, status, paystack_reference |
| `ecd_service_applications` | New centre registration applications (status: pending/approved/provisioned) |
| `ecd_classes` | id, ecd_id, name, practitioner_name |
| `dsd_export_log` | Tracks DOE export usage per centre per quarter (quota enforcement) |
| `announcements` | Centre-to-parent broadcast messages |
| `push_subscriptions` | VAPID push notification endpoints |
| `support_tickets` | id, ecd_id or parent_id, status, subject, messages |
| `audit_logs` | Platform-wide action audit trail |
| `payment_webhook_events` | Paystack webhook payloads (for replay/debugging) |

### Confirmed Real Data
- **Bajabulile Day Care Centre**: ~30 children, 17 boys, 13 girls — active pilot
- **Sakhisizwe Day Care Centre**: Account exists, `onboarding_complete = false`, 0 children

**NEVER hardcode counts or numbers that should come from the database. Always query.**

### Public Listings (unclaimed centres)
The `public_ecd_centres` PostgreSQL VIEW exposes centres to the directory:
- `is_public_listing BOOLEAN` on `ecd_centres` base table — set `TRUE` for seeded-but-unclaimed centres
- View filter: `WHERE (website_published = TRUE OR is_public_listing = TRUE) AND is_deleted = FALSE`
- `is_claimed` is **NOT a DB column** — derived at API/component level as `Boolean(owner_id?.trim())`
- **Column trap**: View exposes `contact_phone` and `contact_whatsapp`, NOT `phone`. Using `phone` when querying the view returns null data silently. Always use `contact_phone`.
- Migration `20260326_002_add_address_to_view.sql` adds `address` to the view (must be applied to Supabase before address displays on centre profiles)
- Three unclaimed seed centres: "Lombardy East Sunshine Seeds ECD", "Alexandra Brightnest Early Learning", "Alexandra Little Explorers ECD Centre"

---

## API Routes Reference

### Auth
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register-parent` | Create parent account |
| POST | `/api/auth/resend-parent-confirmation` | Resend confirmation email |
| POST | `/api/auth/ensure-profile` | Bootstrap user profile |
| POST | `/api/auth/sign-out` | Sign out |
| POST | `/api/auth/activate-role-transition` | Switch roles |

### Directory
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/directory/search` | Search centres (suburb, age, fee, registered) |
| POST | `/api/directory/waitlist` | Join centre waitlist |

### ECD
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/ecd/bootstrap-centre` | Initialize centre workspace (called on ECD login) |
| POST | `/api/ecd/dsd-export` | Generate DOE HTML export |
| POST | `/api/ecd/invitations` | Send staff invite email |
| POST | `/api/ecd/claim` | Claim/register centre listing |
| POST | `/api/ecd/service-applications/submit` | Submit new centre registration |
| POST | `/api/ecd/resend-welcome-pack` | Resend welcome email |
| GET | `/api/ecd/parent-documents/[id]/file` | Download parent doc |

### Parent
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/parent/applications/[id]` | Get application |
| POST | `/api/parent/applications/[id]/decision` | Accept/reject placement offer |
| POST | `/api/parent/applications/[id]/registration` | Submit registration |
| POST | `/api/parent/applications/[id]/pickup-activation` | Activate pickup |
| GET | `/api/parent/notifications` | Fetch notifications |
| GET | `/api/parent/shortlist/summary` | Shortlist summary |

### Internal (Platform Admin only)
All under `/api/internal/platform-admin/` — require `platform_admin` role:
- `centres/` — CRUD, activate, upgrade
- `invoices/` — generate, collect, resend
- `subscriptions/[id]` — update
- `support-tickets/` — create, update status
- `webhooks/paystack/events/[id]/replay` — replay failed webhooks
- `tenants/[id]/welcome-pack` — send welcome email
- `revalidate` — trigger ISR revalidation

### Cron Jobs
| Method | Path | Schedule | Purpose |
|---|---|---|---|
| POST | `/api/cron/onboarding-drip` | 0 7 * * * (07:00 SAST daily) | Send onboarding drip emails (Day 1 resume, Day 3 children nudge, Day 7 go-live, Day 14 features, 48h fallback) |
| POST | `/api/cron/parent-lifecycle` | 0 8 * * * (08:00 SAST daily) | Parent lifecycle emails (Day 1 no-child nudge, Day 3 apply nudge, Day 7 post-enrollment feedback) |

### Webhooks
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/webhooks/paystack` | Paystack payment events |
| POST | `/api/webhooks/resend` | Email delivery events |

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App URLs
NEXT_PUBLIC_APP_URL=https://centreconnect.co.za
NEXT_PUBLIC_ROOT_DOMAIN=centreconnect.co.za
ROOT_DOMAIN=centreconnect.co.za
TENANT_ROOT_DOMAIN=centreconnect.co.za     # for subdomain routing

# Paystack (ZAR payments)
PAYSTACK_SECRET_KEY=
PAYSTACK_WEBHOOK_SECRET=
PAYSTACK_CALLBACK_URL=
PAYSTACK_PAYMENT_METHOD_CALLBACK_URL=
PAYSTACK_PAYMENT_METHOD_UPDATE_AMOUNT_ZAR=5

# Billing config
BILLING_DUNNING_GRACE_DAYS=7
BILLING_WEBHOOK_LAG_ALERT_MINUTES=15
BILLING_WEBHOOK_FAILURE_ALERT_LOOKBACK_HOURS=24

# Email (SMTP)
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SMTP_PORT=465
SMTP_SECURE=true
SUPPORT_EMAIL=admin@centreconnect.co.za
BOOKKEEPER_EMAIL=

# Security
NEXT_PUBLIC_TURNSTILE_SITE_KEY=   # Cloudflare Turnstile (bot protection)
TURNSTILE_SECRET_KEY=
CRON_SECRET=                       # For scheduled tasks

# Push notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# AI
GEMINI_API_KEY=                    # Google Gemini (AI features, OCR)

# Rate limiting (optional)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Misc
ENFORCE_ECD_DEVICE_LIMIT=          # Set to "1" to enforce single-device ECD sessions
ENABLE_MW_TIMING=                  # Set to "1" for middleware timing logs
TEST_USER_PASSWORD=                 # For Playwright E2E tests
```

---

## Key Library Files

### `lib/ecd/portal-session.ts`
Call `requireEcdPortalSession()` in any ECD server component to get `{ supabase, user, ecdId, role }`. Throws and redirects if not authenticated.

### `lib/ecd/feature-gates.ts`
```typescript
// Check if a centre has access to a feature
const { allowed, tier } = await hasEcdFeatureAccess({ supabase, ecdId, feature: 'communications' })

// Redirect to upgrade page if not allowed
await requireEcdFeatureAccess({ supabase, ecdId, feature: 'attendance-history' })
```

### `lib/ecd/dsd-export-render.ts`
`buildDsdPdfHtml()` is the **single source of truth** for the DOE monthly report HTML.
The PDF download button opens this HTML in a new window — it does NOT call `window.print()` automatically.
The user is instructed to press Ctrl+P → Save as PDF.

### `lib/billing/plans.ts`
```typescript
// Convert between public plan names and internal tiers
toPublicPlan('standard')     // → 'growth'
toInternalTier('growth')     // → 'standard'
getPublicPlanPrice('growth') // → 299
```

### `lib/hooks/use-card-view-preference.ts`
Persists the centre card view mode (`full` / `compact`) in localStorage (`cc-card-view`).
Default is `full` on screens ≥390px, `compact` on smaller screens. Both `/directory` and `/parent/discover` use this hook for the ⊞/≡ toggle.

### `lib/parent/progress.ts`
Profile completeness is calculated from **5 profile fields only** (full_name, phone, relationship_type, suburb, child present). Formula: `Math.round((profileFieldsComplete / 5) * 100)`. Documents are tracked separately and do **not** affect the completeness percentage.

### `lib/supabase/`
```typescript
// Client component (browser)
import { createClient } from '@/lib/supabase/client'

// Server component / Server Action / API route
import { createClient } from '@/lib/supabase/server'

// Admin operations (bypasses RLS — server only)
import { createAdminClient } from '@/lib/supabase/admin'
```

### Welcome Pack & Onboarding Drip

**ECD Welcome Pack Strategy — Complete Flow**

1. **On first ECD login** (`app/api/ecd/bootstrap-centre/route.ts`):
   - `POST /api/ecd/bootstrap-centre` provisions centre workspace
   - Immediately sends welcome pack email via `POST /api/ecd/resend-welcome-pack` (ALL new centres, not just pilot)
   - Logged to `invite_logs` table with `inviteType = 'welcome_pack'` and `status = 'sent'`

2. **Welcome pack email** (`lib/email/templates/pilot-welcome-pack.tsx`):
   - Sent on first login; includes 6-step checklist (logo, cover, bio, children, attendance, pickup)
   - Uses magic link + tracked CTAs for analytics
   - Recipients are ECD centre owners

3. **In-app welcome banner** (`components/ecd/ecd-welcome-banner.tsx`):
   - Shown on `/ecd/dashboard` if `onboarding_complete = false`
   - Displays progress bar, step count, and quick-action links
   - Dismissible via localStorage (key: `cc-ecd-welcome-banner-dismissed-v1`)
   - Falls back gracefully when all steps done

4. **Onboarding completion action** (`app/ecd/onboarding/actions.ts`):
   - `completeOnboarding()` server action called when owner submits the final onboarding step
   - Stamps `onboarding_complete = true` AND `onboarding_completed_at = now()` on `ecd_centres`
   - Fire-and-forgets `renderDayZeroCelebrationEmail` (idempotent via `notification_logs`)
   - Redirects to `/ecd/dashboard?celebrate=1` — triggers the celebration modal

5. **Onboarding drip cron** (`app/api/cron/onboarding-drip/route.ts`):
   - Runs daily at **07:00 SAST** (configured in `vercel.json`)
   - Protected by `CRON_SECRET` environment variable
   - Sends 5 types of emails:
     - **Day 0**: centre just completed onboarding — celebration + share toolkit (fired from action, not cron)
     - **Day 1**: onboarding not complete, 1–3 days old — resume nudge ("5 min to finish")
     - **Day 3**: centre has 0 children — "have you added your children yet?"
     - **Day 7**: no logo/cover image — "share your page with families"
     - **Day 14**: anchored to `onboarding_completed_at`, tier-aware — Growth shows daily-reports/pickup/comms features; Starter shows share + upgrade CTA
     - **48h fallback**: welcome email unopened + owner hasn't logged in — "did our email reach you?"
   - All logged to `notification_logs` with `event_type` in `[onboarding_day0_celebration, onboarding_day1_resume, onboarding_day3, onboarding_day7, onboarding_day14_features, welcome_pack_fallback]`
   - Idempotent — never fires twice per centre via `notification_logs` lookups
   - Bulk fetches subscription tiers for all centres (used for Day 14 tier-aware content)

6. **Onboarding progress tracking** (`lib/actions/onboarding-progress.ts` + migration):
   - Column: `ecd_centres.onboarding_progress` (JSONB, default `{}`)
   - Step keys: `logo`, `cover`, `description`, `children`, `attendance`, `pickup`, `published`
   - RPC function: `stamp_onboarding_step(p_ecd_id, p_step_key, p_completed_at)` — idempotent
   - Call `stampOnboardingStep('children')` from ECD server actions when a step is completed
   - Read progress via `getOnboardingProgress()` server action

**Email Templates:**
- `lib/email/templates/pilot-welcome-pack.tsx` — welcome pack (6-step checklist + tracking)
- `lib/email/templates/onboarding-drip.ts` — all drip emails:
  - `renderDripDay3Email` — Day 3 children nudge
  - `renderDripDay7Email` — Day 7 go-live nudge
  - `renderDayZeroCelebrationEmail` — Day 0 celebration (fired from `completeOnboarding` action)
  - `renderDripDay1ResumeEmail` — Day 1 resume nudge (onboarding incomplete)
  - `renderDripDay14FeaturesEmail` — Day 14 tier-aware feature spotlight (anchored to `onboarding_completed_at`; `isGrowthPlus = tier !== 'basic'`)

**First-Week Dashboard Experience** (components rendered in `app/ecd/(portal)/dashboard/page.tsx`):

- `isFirstWeek` — computed as `(Date.now() - new Date(onboarding_completed_at).getTime()) < 7 * 24 * 60 * 60 * 1000`. `false` if `onboarding_completed_at` is null.
- **During the first week**, the dashboard:
  - Shows `OnboardingCelebrationModal` (once only, show-guard via localStorage `cc-ecd-celebrate-shown-v1:{ecdId}`) when `?celebrate=1` is in the URL
  - Shows `DashboardContextStrip` above the hero card — a single priority-ordered next-action prompt
  - Shows `FeatureDiscoveryCards` instead of `FeatureBanner`
  - Hides `startHereActions` and `OnboardingChecklistCard` (avoids duplicate nudges)
- **After the first week**, the dashboard reverts to the standard layout

**New ECD Components** (`components/ecd/`):
- `onboarding-celebration-modal.tsx` — confetti modal shown once after onboarding completion. Props: `{ ecdId, centreName, suburb?, publicProfileUrl }`. Uses inline `<style>` tag for confetti CSS (`@keyframes ecd-confetti-fall`, `.ecd-confetti-piece`). Respects `prefers-reduced-motion`.
- `dashboard-context-strip.tsx` — single next-action strip. Priority: add children → take attendance → upload logo → add cover → all done. Props: `{ childrenCount, attendanceToday, hasLogo, hasCover, tier }`.
- `feature-discovery-cards.tsx` — tier-filtered feature grid. Props: `{ tier: InternalTier, publicProfileUrl?: string }`. Starter (basic) gets 4 basic feature cards + amber upgrade card spanning 2 cols.

**Onboarding page** (`app/ecd/onboarding/page.tsx`):
- Step 4 shows a live preview card (centre name, suburb, "No registration fee" copy) instead of a plain URL box
- Copy link button + WhatsApp `wa.me/?text=` share link in the share toolkit

**Parent Welcome Notifications:**
- `lib/notifications/parent-welcome-sequence.ts` — 4 warm, actionable in-app notifications
- Sent on parent registration via `enqueueParentWelcomeSequence()`
- Copy emphasizes "no registration fee" and "apply to many crèches"

### `lib/public-centres/query.ts`
`fetchFeaturedPublicCentres(admin, { limit? })` — canonical public centre query for all parent-facing surfaces. Queries `public_ecd_centres` view (never `ecd_centres` directly), enriches with `owner_id` for `is_claimed`, applies pilot/featured sorting. Returns `FeaturedPublicCentre[]`. Used by landing page; should be used by any new parent-facing centre listing surface.

### `lib/email/templates/parent-lifecycle.ts`
Three parent lifecycle email templates:
- `renderParentNoChildDay1Email` — Day 1 nudge when parent has no child added yet
- `renderParentChildNoEnrollmentDay3Email` — Day 3 nudge, state-aware (`pending` = check applications, `discover` = browse crèches)
- `renderParentPostEnrollmentFeedbackEmail` — Day 7 post-enrollment feedback using real child + centre name

---

## UX/UI Rules — LOCKED

These rules must not be changed without explicit instruction from the product owner.

### ECD Portal Navigation
- **Mobile:** Hamburger → Sheet drawer (left side, `bg-slate-900`)
- **Desktop:** Fixed left sidebar, `w-[220px]`, `bg-slate-900`
- **FORBIDDEN:** No bottom tab bar on ECD pages. No duplicate nav.
- Active nav item style: `bg-teal-500/15 text-teal-300`

### Colour Themes
| Portal | Theme |
|---|---|
| ECD | Dark — `bg-slate-900`, teal accents |
| Parent | Light — white/cream, teal accents |
| Admin | Dark — same as ECD |

### Hero Image Resolution — LOCKED
File: `lib/ui/centre-hero-images.ts`

Pilot centres (Bajabulile, Sakhisizwe) have **curated local hero images** in `public/centres/[slug]/hero.jpg`. The `getCentreHeroImage()` function resolves hero images in this order:

1. If slug is in `CURATED_HERO_SLUGS` → always use the local curated image (ignore DB value)
2. If `cover_image_url` from DB is valid and not a placeholder → use it
3. If slug has a seed entry in `ECD_HERO_BY_SLUG` → use the seed image
4. Fallback → generic ECD hero image

**Why curated slugs override DB:** A centre owner may upload an incorrect or low-quality cover image. For pilot centres we maintain curated images locally that are known to be correct. The DB value is ignored entirely for these slugs.

### CentreCard — LOCKED
File: `components/shared/CentreCard.tsx` (canonical). `components/parent/CentreCard.tsx` is **deprecated** — do not use.

**Variants:**
- `variant="full"` — vertical card with 140px hero image, logo bubble, age badges, fee stats, CTA buttons, trust line. Used in directory grid and Find tab grid.
- `variant="compact"` — horizontal card with 100px image, inline details. Used in dashboard suggested section and list view.

**View toggle:** `lib/hooks/use-card-view-preference.ts` — localStorage key `cc-card-view`, defaults `full` on ≥390px screens. Both `/directory` and `/parent/discover` share this hook.

**Copy principles:**
- **Lead with "No registration fee"** — South African parents expect to pay registration fees when applying to crèches. Removing this expectation is our biggest conversion lever. Every CentreCard on a claimed centre says "No registration fee. Apply free and hear back directly."
- Badge text for claimed centres: "Free to apply" (not "Apply now")
- CTA button: "Apply free" (not "Apply online")
- Copy for unclaimed centres: "Call or WhatsApp the crèche to ask about space."
- Parent-first psychology: lead with emotion (free, easy, direct) not features (online, digital, portal)
- `whileTap={{ scale: 0.97 }}` spring animation on the card wrapper (stiffness 400, damping 25) — gives tap feedback on mobile

### Notification Bell — LOCKED
File: `components/notifications/parent-notification-bell.tsx`

- Uses framer-motion spring animations: bell shake on new notifications, badge scale-in, item stagger
- Supabase Realtime subscription for live updates (INSERT/UPDATE on `parent_notifications`)
- Error boundary wrapping: if the bell crashes, falls back to a plain link to `/parent/notifications`
- Skeleton loading state (3 shimmer rows) while fetching
- Mark-as-read with optimistic UI (instant visual update, background PATCH)
- "Mark all read" button in dropdown header
- Max 8 items in dropdown, full inbox link at bottom
- Unread badge: rose-500 background, pulses on new arrival, scales to 0 when cleared

### Homepage Hero — LOCKED
File: `app/(journey)/page.client.tsx`

- **Single primary CTA only:** "Find crèches near me" → `/directory`
- Secondary link (text, not button): "Want to apply? Create a free account →" → `/register`
- **No WhatsApp share button** in the hero — removed, can stay in footer only
- Suburb filter pills have `whileTap={{ scale: 1.08 }}` spring animation (stiffness 500, damping 20)
- Below-fold images use `loading="lazy"` — do not add `priority` to them

### Loading Screens — LOCKED
File: `app/loading.tsx`

- The root loading screen is a **content-first cream skeleton** matching the homepage layout
- It is **NOT** a dark splash screen with logo and "Opening CentreConnect…" text — that was removed
- Skeletons use `animate-pulse`, cream/stone background (`bg-[rgb(250,248,244)]`)
- Directory loading (`app/(journey)/directory/loading.tsx`) uses card-shaped skeletons matching CentreCard dimensions

### PDF / DOE Export
- The Download PDF button opens a new window with HTML content
- It does NOT call `window.print()` automatically
- A banner instructs the user to press Ctrl+P → Save as PDF
- `buildDsdPdfHtml()` in `lib/ecd/dsd-export-render.ts` is the single source of truth

### Data & Numbers
**NEVER hardcode, guess, or assume any number that comes from a database.**
Boys/girls counts, attendance totals, child numbers — always read from queries.

### Application Status Copy — LOCKED
Application statuses must always be shown in plain English. Use `statusToPlainEnglish()` in `app/(journey)/parent/dashboard/page.tsx` or follow this mapping:

| Raw status | What the parent sees |
|---|---|
| `submitted` / `partial` / `draft` | Application sent |
| `in_review` | The crèche is reviewing your application |
| `awaiting_documents` | Documents needed |
| `offer_made` / `offer_sent` / `offer_pending` | Crèche has made an offer — respond now |
| `approved` / `accepted` | Accepted — confirm your start date |
| `enrolled` | Enrolled |
| `rejected` | Not accepted this time |
| `withdrawn` | Application withdrawn |

### Parent Dashboard Design Principles — LOCKED
- The dashboard is **emotion-first** — it responds to the parent's current situation
- `discover` state = crèche directory feel. No profile cards, no readiness checks
- `pending` state = acknowledge the wait. Show per-application cards, not ticket systems
- `enrolled` state = window into the child's day. Teacher notes, mood chips, pickup code
- ProfileReadinessCard belongs on `/parent/profile` only — **never** on the dashboard
- Bottom nav changes by state (pre-enrollment vs enrolled)

### Centre Profile Page (`/c/[slug]`) — Design Rules
File: `app/c/[slug]/centre-client.tsx`

- Class count displayed must match `visibleClassrooms.length` (capped at 3 for claimed centres), not the full `classrooms.length`
- Trust copy must lead with "No registration fee to apply"
- Apply CTA helper text: "No registration fee. Apply free and hear back directly from the crèche."
- Classroom card limit: 3 visible for claimed centres (prevents clutter, encourages contact)
- Aftercare, classes, and schedule are shown as stat cards — always sourced from DB, never hardcoded

### MobileCentreDetailsSheet (`app/c/[slug]/mobile-centre-details-sheet.tsx`) — LOCKED
- Renders on mobile (`lg:hidden`) as a bottom sheet over the centre profile
- **No drag-to-close** — `onTouchMove` / `onTouchStart` / `onTouchEnd` handlers were removed; they intercepted page scroll events and closed the sheet unexpectedly. Sheet closes only via backdrop click or the "Close details" button.
- Sheet div: `max-h-[85dvh] overflow-y-auto rounded-t-[2rem]` — scroll happens inside the sheet, not the page
- `showClaimLink = !isClaimed` — shows the "Claim this crèche" link to **all** users including parents (previously was hidden from `parent_user` role, but parents should know they can claim a listing)

### Copywriting Principles — LOCKED
All parent-facing copy across the platform follows these rules:

1. **Lead with emotion, not features.** "Find the right crèche for your child" not "Search our directory of centres"
2. **Acknowledge the parent's state.** "You are waiting to hear back" not "Applications in progress"
3. **Remove financial barriers upfront.** "No registration fee" is the single most important message. Parents in our market expect to pay R500+ just to apply. Saying "free" removes the biggest blocker.
4. **Plain English statuses.** Never show database codes. Always use `statusToPlainEnglish()`.
5. **Use "crèche" not "centre" in parent-facing copy.** Parents call it a crèche. We use "centre" in the code/admin.
6. **Use South African English.** "Colour" not "color", "organised" not "organized" in UI copy.
7. **No jargon.** "Documents needed" not "awaiting_documents". "The crèche sent you a message" not "New notification received".

---

## Middleware (`middleware.ts`)

Runs on every request. Does four things in order:

1. **Session refresh** — calls Supabase `updateSession()` to keep auth tokens fresh
2. **Subdomain routing** — if hostname matches `[slug].centreconnect.co.za`, rewrites to `/c/[slug]`
3. **Reserved subdomain protection** — blocks `www`, `app`, `admin`, `api` subdomains
4. **Device limit enforcement** — if `ENFORCE_ECD_DEVICE_LIMIT=1`, prevents multiple concurrent ECD admin sessions (only on `/ecd/*` routes, excluding `/ecd/login`)

---

## Dev Server

```bash
npm run dev        # starts on port 3010
npm run dev:safe   # port cleanup + start
npm run build      # production build
npm run start      # production server on port 3010
```

The `.claude/launch.json` is configured for preview tools to use port 3010.

---

## Common Patterns

### Server Component with Auth Guard
```typescript
// ECD page
export default async function MyEcdPage() {
  const { supabase, user, ecdId } = await requireEcdPortalSession()
  const { allowed } = await hasEcdFeatureAccess({ supabase, ecdId, feature: 'communications' })
  // ...
}
```

### Feature Gate in Client Component
```typescript
// Pass isAllowed as a prop from server component
<MyFeatureComponent isGrowthTier={allowed} />
```

### Bottom Nav Visibility Logic
File: `lib/navigation/parent-bottom-nav.ts`

`shouldHideParentBottomNav(pathname)` returns `true` on routes where the nav should be suppressed (e.g. `/parent/applications/*`, `/parent/profile/*`). Always check this before adding new parent routes — if the nav would interfere with a multi-step form or detail view, add it here.

`FooterConditionalRenderer` (`components/layout/FooterConditionalRenderer.tsx`) is the single place that decides which nav renders. Logic:
- Signed-in parent on `isParentPortal` routes → `PARENT_NAV_ITEMS_PRE_ENROLLMENT` or `PARENT_NAV_ITEMS_ENROLLED` (based on `homeState`)
- Admin on `/admin/*` → `ADMIN_MOBILE_NAV_ITEMS`
- ECD portal gets **no** bottom nav — hamburger drawer only

### Attendance Page Pattern
- `revalidate = 0` (no cache — always fresh)
- Month/year/class passed as URL search params
- Server component re-fetches on `router.push()` with new params
- Client component receives `initialAttendance` and resets local state via `useEffect`

### ECD Registration Flow
1. Centre submits `/api/ecd/service-applications/submit`
2. Platform admin approves in `/admin/tenants`
3. On next ECD login, `POST /api/ecd/bootstrap-centre` provisions the centre workspace
4. Centre is redirected to `/ecd/welcome` for onboarding

---

## Pilot Centres

Defined in `lib/ecd/pilot-centres.ts`.

- **Bajabulile Day Care Centre** — slug: `bajabulile-day-care-centre` — Active, ~30 children
- **Sakhisizwe Day Care Centre** — Active account, `onboarding_complete = false`, needs in-person activation

These centres have special handling in some parts of the codebase (featured on homepage, pilot badges).

---

## Business Context

- **Pilot offer:** Onboarding fee waived + first month free until end of April 2026
- **Billing cliff:** Pilot period ends May 1 2026 — Paystack billing activates
- **Pricing:** R299/month (Growth), R499/month (Pro), annual plans at 10-month price
- **Support email:** `admin@centreconnect.co.za` ← note spelling (not "center")
- **Founder:** Mandlenkosi ("Mandla") — built in Alexandra, Johannesburg
- **Legal:** Registered company (PTY) in South Africa
- **Compliance framework:** DSD (Department of Social Development) — the DOE monthly report is a government-required document that every registered creche must submit

---

## E2E Testing (Playwright)

### Setup
- Config: `playwright.config.ts` — two projects: `chromium-desktop` (Desktop Chrome) and `android-chrome` (Pixel 5)
- Test file: `tests/browser/e2e-journey.spec.ts`
- Screenshots saved to: `test-results/` (numbered, e.g. `01-home.png`)
- Console errors report: `test-results/console-errors.json`
- Credentials loaded from `.env.local`: `TEST_PARENT_EMAIL`, `TEST_PARENT_PASSWORD`, `TEST_ECD_EMAIL`, `TEST_ECD_PASSWORD`

### Running tests
```bash
# Desktop Chrome
npx playwright test tests/browser/e2e-journey.spec.ts --project=chromium-desktop

# Android Chrome (Pixel 5 simulation)
npx playwright test tests/browser/e2e-journey.spec.ts --project=android-chrome
```

### Known dev-server test behaviours
- Directory "< 2s" check will fail on first cold compile (16s+). This is a dev artefact — production Vercel is much faster.
- Apply CTA on Bajabulile is inside `MobileCentreDetailsSheet` (`lg:hidden`). Desktop tests cannot click it because it is hidden. Desktop Apply CTA is in the right sidebar of `centre-client.tsx`.
- CSP error for `va.vercel-scripts.com` (Vercel Analytics) appears in console on localhost — this is dev-only, not a bug.
- Text-match for "error" on Applications/Attendance pages may false-positive if the word "error" appears in page content.

---

## What NOT to Do

1. **Do not import `EcdOsShell`** — it was removed. Use the portal layout directly.
2. **Do not hardcode children/attendance counts** — always query the database.
3. **Do not add a bottom tab bar to ECD pages** — mobile nav is hamburger → drawer only.
4. **Do not widen the ECD sidebar beyond `w-[220px]`**.
5. **Do not add a white/light theme to the ECD portal** — it is dark by design.
6. **Do not call `window.print()` from the DOE export button** — it opens a new window with HTML.
7. **Do not use the admin Supabase client in browser/client components** — service role key must stay server-side.
8. **Do not call `/api/ecd/dsd-export` from the PDF button** — the button receives `htmlContent` as a prop and opens it directly.
9. **Do not add fake/placeholder numbers to the UI** — zero assumptions on data.
10. **Do not change the support email** — it is `admin@centreconnect.co.za` (with "re", not "er").
11. **Do not put ProfileReadinessCard on the dashboard** — it belongs on `/parent/profile` only.
12. **Do not show raw status codes to parents** — always use `statusToPlainEnglish()` or the mapping above.
13. **Do not use a single static bottom nav for parents** — the nav changes by `homeState` (pre-enrollment vs enrolled). Use `PARENT_NAV_ITEMS_PRE_ENROLLMENT` or `PARENT_NAV_ITEMS_ENROLLED`.
14. **Do not use unescaped apostrophes in JSX string literals** — use `&apos;`, `\u2019`, or template literals to avoid SWC parse errors.
15. **Do not use `components/parent/CentreCard`** — it is deprecated. Use `SharedCentreCard` from `components/shared/CentreCard.tsx` with `variant="full"` or `variant="compact"`.
16. **Do not use `overflow-x-hidden` on full-height containers** — it creates a scroll container that breaks vertical scroll on iOS Safari and Android Chrome. Use `overflow-x-clip` instead (set on `body` in `app/layout.tsx` and the root div in `components/layout/public-shell.tsx`).
17. **Do not select `phone` when querying `public_ecd_centres`** — that column does not exist in the view. Use `contact_phone` and `contact_whatsapp` instead. Selecting a non-existent column causes Supabase to return `null` data with no error.
18. **Do not add drag-to-close to bottom sheets** — `onTouchMove` handlers intercept page scroll events on mobile and close the sheet unexpectedly. Sheets should only close via explicit backdrop click or a "Close" button.
19. **Do not query `ecd_centres` directly for parent-facing centre listings** — use `fetchFeaturedPublicCentres()` from `lib/public-centres/query.ts` which uses the `public_ecd_centres` view as the source of truth.
