# AI Company Operating System Plan

## Goal
Design an internal CentreConnect operating system powered by role-based AI agents, starting with CEO and CTO, then optional Ops and Growth. Keep the first pass safe, admin-only, and reversible. Prepare light persona interfaces for CEO and CTO without exposing unfinished automation to live customers yet.

## Audit Summary

### Best integration points already in the app
- `app/admin/layout.tsx`
  Existing platform-admin shell. New internal OS surfaces should inherit this instead of creating a parallel shell.
- `components/admin/admin-shell.tsx`
  Shared admin frame, breadcrumbs, spacing, and dark theme container. Best place to keep any new OS route visually consistent.
- `app/admin/command/page.tsx`
  Existing operations-oriented admin surface. Good long-term home for live operational controls, alerts, and agent handoff workflows.
- `app/admin/dashboard/page.tsx`
  Existing founder KPI surface. Good source for CEO-oriented summaries and executive briefings.
- `app/admin/analytics/page.tsx`
  Existing signal source for Growth and GTM-style briefings.
- `app/admin/support/page.tsx`
  Existing signal source for Ops/support triage summaries.
- `lib/auth/platform-admin.ts`
  Existing admin authorization helper. Best guard for any new internal AI OS route.
- `lib/ai/document-extraction-service.ts`
  Confirms there is already an AI namespace in the codebase. New agent infrastructure should extend `lib/ai/*`, not invent a separate top-level pattern.
- `lib/config.ts` and existing env usage
  The app already uses env-based flags/patterns. A conservative rollout should stay behind server-side feature flags.

### Current constraints to respect
- Do not touch `middleware.ts`, `app/globals.css`, `components/layout/bottom-nav.tsx`, or Supabase migrations for this feature pass.
- Keep the founder cockpit admin-only, read-only, and feature-flagged.
- Avoid new packages.
- Preserve existing parent and ECD flows.

### Hotfix gate note
- Source inspection suggests the public sign-in path, parent redirect flow, landing trust copy, and parent profile copy are aligned with the current hotfix checklist.
- One unrelated checklist issue still stands out: `components/layout/ecd-navigation.ts` currently contains more than 8 ECD sidebar items. That should stay as a separate cleanup task and not be mixed into this AI OS scaffold.

## Recommended Phase 1 Architecture

### 1. Admin-only route
- Add `app/admin/ai-os/page.tsx`
- Purpose: a safe founder-facing dashboard for AI role definitions, mock briefings, and queue ownership.
- Auth: `requirePlatformAdmin()`
- Data mode: mock-only

### 2. Shared AI company OS library
- Add `lib/ai/company-os/types.ts`
- Add `lib/ai/company-os/config.ts`
- Add `lib/ai/company-os/mock-service.ts`

This keeps the architecture stable before any provider, action layer, or database integration is chosen.

### 3. Initial role model
- CEO
  Revenue, market focus, growth priorities, centre conversion, strategic decisions.
- CTO
  Reliability, delivery, platform health, security, architecture tradeoffs.
- Ops
  Onboarding, support queues, activation, handoffs.
- Growth
  Acquisition, conversion, messaging, experiments.

CEO and CTO should also have `light` surfaces defined now so they can later power shareable or simpler persona views without changing the core contracts.

### 4. Feature flags
- `ENABLE_AI_COMPANY_OS=1`
  Turns on the internal operating system experience.
- `ENABLE_AI_LIGHT_PERSONAS=1`
  Turns on CEO/CTO light persona cards inside the admin route.

Keep both server-side first. No public rollout in phase 1.

## Data Contract for Phase 1

### Agent definition
- Stable role id
- Label and mission
- Focus lanes
- Supported surfaces (`internal`, `light`)
- Core decision question

### Agent briefing
- Status (`healthy`, `watch`, `critical`)
- Headline
- Why it matters
- Next actions
- Linked metrics

### Queue item
- Lane
- Owner agent
- Priority
- Status
- Summary

### Light persona card
- Persona id
- Intended audience
- Promise
- Summary
- CTA label
- Readiness state

## Implemented so far

### Pass 1 foundation
- Created the plan doc you are reading now.
- Scaffolded typed agent definitions and feature flags.
- Scaffolded the initial AI OS route and dashboard shell.
- Added a mock snapshot contract for CEO / CTO / Ops / Growth cards and light persona previews.

### Pass 2 live founder cockpit extension
- Added `lib/ai/company-os/service.ts` to derive a live AI OS snapshot from existing admin tables and services.
- Reused existing CentreConnect admin signals where already available:
  - `ecd_centres`
  - `claim_requests`
  - `user_profiles`
  - `parent_notifications`
  - `parent_form_submit_failures`
  - `support_tickets`
  - `notification_logs`
  - `subscriptions`
  - `invoices`
  - `ecd_analytics_events`
  - `payment_webhook_events`
- Replaced pure mock dashboard data with live-derived or safely-derived founder signals where feasible.
- Added live-grounded CEO and CTO brief logic based on:
  - centre activation / live centre coverage
  - pending collections and active subscription base
  - parent demand and application conversion
  - parent submit failures
  - support queue pressure
  - failed invite delivery
  - payment webhook incident pressure
- Added founder operating sections:
  - Daily focus
  - Weekly review
  - Sprint priorities
  - Risk summary
- Kept all founder workflow outputs advisory and read-only.
- Added feature-flagged admin-only light persona routes:
  - `/admin/ai-os/ceo`
  - `/admin/ai-os/cto`
- Added `loading.tsx` and `error.tsx` coverage for the `app/admin/ai-os` route segment.
- Kept the existing mock snapshot as a fallback path if live snapshot generation fails.

## Current live-data boundaries
- The founder cockpit now reads live admin data, but it is still a mixed-truth system rather than a complete operating model.
- Demand currently depends on tracked `ecd_analytics_events`; off-platform WhatsApp and call outcomes are still not joined to closed-won revenue.
- CTO reliability currently uses admin-table proxies:
  - parent submit failures
  - support tickets
  - invite delivery failures
  - payment webhook incidents
- There is still no deployment/runtime observability feed in the AI OS itself.
- Founder workflows and risk summaries are deterministic heuristics over live metrics, not agent autonomy or action execution.

## Follow-up Implementation Plan

### Phase 3: founder-grade signal quality
- Add true period-over-period comparisons instead of simple current-window snapshots where useful.
- Rank centres by activation readiness, churn risk, and payment likelihood instead of only using aggregate counts.
- Join parent demand to centre outcomes so the CEO brief can show:
  - top-demand centres
  - low-conversion centres
  - demand with no matching live capacity
- Introduce stronger source-of-truth selectors that can be shared by:
  - `app/admin/dashboard/page.tsx`
  - `app/admin/analytics/page.tsx`
  - `app/admin/support/page.tsx`
  - `app/admin/revenue/page.tsx`
  - `app/admin/ai-os/*`

### Phase 4: agent actions
- Add read-only recommendations first.
- Only after that, add suggested actions.
- Only after that, add executable actions with explicit confirmation and audit logging.

### Phase 5: controlled light persona rollout
- Keep `/admin/ai-os/ceo` and `/admin/ai-os/cto` admin-only until the brief copy and data redaction rules are stable.
- If external sharing is needed later, add:
  - separate auth rules
  - audience-specific redaction
  - explicit “internal estimate” language where data is incomplete
  - audit logging for brief access and shared links

## Fastest next milestones
- Build one centre-level founder table that answers: which centres are closest to going live, paying, or churning.
- Add previous-7-day / previous-30-day comparisons for parent demand, collections, support pressure, and reliability.
- Connect top parent-demand signals to actual centre outcomes so the CEO brief stops relying on funnel proxy rates alone.
- Add a lightweight observability feed for CTO:
  - failed route counts
  - deploy/build regressions
  - recent admin/runtime incidents
- Only after those are trustworthy, add one confirmed founder action flow with audit logging.

## Why this approach is the safest fit
- It uses the existing admin shell instead of creating a new portal.
- It keeps all first-pass logic mock-backed and typed.
- It does not disturb current parent, public, or ECD journeys.
- It prepares for future live AI integration without forcing provider decisions now.

## Open Questions
- Should light CEO/CTO views remain platform-admin only, or are they eventually intended for centre owners, partners, or investors?
- Should agent outputs remain advisory, or should some roles eventually trigger internal actions automatically?
- Which centre-level source of truth should drive founder revenue readiness: subscriptions, invoices, or a blended “activation to payment” model?
- Which live signals matter first for the CTO briefing once admin-table proxies are no longer enough: deploy health, runtime errors, auth failures, or slow-path traces?
- Should Ops and Growth stay visible as advisory cards, or should they collapse until centre-level live signals are stronger?
