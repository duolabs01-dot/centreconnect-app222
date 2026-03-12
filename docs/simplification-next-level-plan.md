# CentreConnect Simplification — Next Level P0 Plan

## Goal
Simplify the app at workflow and logic level (not just nav), while preserving capability.

## P0 Findings (code-backed)

### 1) ECD provisioning logic is duplicated
Current provisioning logic is repeated across:
- `app/api/ecd/bootstrap-centre/route.ts`
- `lib/admin/service-application-actions.ts`
- `app/api/internal/platform-admin/centres/route.ts`

Risk:
- Slug/centre creation behavior can drift
- Admin linkage and subscription setup can become inconsistent
- Harder to debug onboarding failures

### 2) Tier gating is mostly advisory
Some views read tier, but route/action-level enforcement is inconsistent.

Risk:
- Starter users can still hit Growth/Pro paths directly by URL/API in some cases
- Product trust drops when UX and backend disagree

### 3) Admissions workflow duplicated
Both `/ecd/applications` and `/ecd/pipeline` represent admissions state management.

Risk:
- Rule drift between views
- Ambiguous “official” workflow for staff

### 4) Alias/duplicate routes increase cognitive + maintenance load
Examples:
- `/c/[slug]` vs `/centre/[slug]`
- `/for-centres/register` re-exporting `/ecd/register`
- `/apply/[identifier]` mixed semantics
- `/login` and `/ecd/login` overlapping logic

Risk:
- Users and support teams don’t know canonical path
- SEO/cache and analytics fragmentation

---

## P0 Implementation Plan (actionable)

## PR 1 — Centralize ECD provisioning
Create:
- `lib/ecd/provisioning.ts`

Move all centre provisioning rules into shared functions:
- slug generation + dedupe
- centre creation
- admin user/profile linkage
- initial subscription/tier assignment
- onboarding state initialization

Refactor callers to use shared service:
- `app/api/ecd/bootstrap-centre/route.ts`
- `lib/admin/service-application-actions.ts`
- `app/api/internal/platform-admin/centres/route.ts`

Definition of done:
- Single source of truth for provisioning
- Existing flow behavior preserved
- Tests/fixtures updated for shared provisioning service

## PR 2 — Enforce tier gates server-side
Create:
- `lib/ecd/feature-gates.ts`
- `lib/billing/tiers.ts`

Add centralized checks:
- `assertFeatureAccess(ecdId, featureKey)`
- route/action guards for Growth/Pro features

Apply to:
- ECD page entry routes (server components)
- write actions/API handlers for gated features

Definition of done:
- Starter cannot execute Growth/Pro-only actions by direct URL or form post
- UI gating matches backend enforcement

## PR 3 — Unify admissions status model
Create:
- `lib/ecd/application-status.ts`

Centralize:
- valid statuses
- allowed transitions
- transition helper + audit logging

Make `/ecd/pipeline` a redirected view mode only (already started):
- canonical state updates happen through one status module

Definition of done:
- One status machine governs all admissions updates
- No duplicated transition logic in page components/actions

## PR 4 — Canonical route policy + redirects
Define canonical routes and keep aliases as explicit redirects only.

Targets:
- Keep `/centre/[slug]` canonical; maintain `/c/[slug]` redirect
- Keep one register entry point for centres; alias routes redirect only
- Standardize apply path semantics (`id` vs `slug`) and enforce one contract
- Consolidate `/login` + `/ecd/login` where possible (or explicit role-routing wrapper)

Definition of done:
- Every duplicate route has a declared canonical destination
- Analytics events emit canonical route name

## PR 5 — ECD “Today mode” + advanced mode split
Simplify daily operations:
- Today mode surfaces only high-frequency tasks
- Advanced/less-frequent tools moved to secondary layer

Keep feature completeness by moving, not deleting.

Definition of done:
- Staff/supervisor can complete core loop with minimal decisions:
  - attendance
  - children updates
  - parent communication
  - support/escalation

---

## Shared modules to introduce
- `lib/ecd/provisioning.ts`
- `lib/ecd/feature-gates.ts`
- `lib/billing/tiers.ts`
- `lib/ecd/application-status.ts`

---

## Rollout sequence
1. Provisioning consolidation
2. Tier gate enforcement
3. Admissions state unification
4. Canonical route cleanup
5. Today mode UX split

---

## Definition of Done (overall)
- One canonical workflow per core job
- One canonical route per intent
- Tier restrictions enforced server-side and mirrored in UI
- Admissions transition logic centralized
- No duplicate provisioning logic across APIs/services
- Faster onboarding support because “where do I do this?” ambiguity drops materially
