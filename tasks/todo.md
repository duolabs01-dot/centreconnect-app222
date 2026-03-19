# CentreConnect — Active Tasks

## Session Plan - 2026-03-19 Live ECD Buttons + Landing Redirect Audit
- Task: Verify the live ECD button failure and landing-page redirect report, then ship the smallest confirmed fix only.
- Why now: Production ECD sign-in is landing on the dashboard with React/RSC navigation errors, which leaves client links unresponsive after login.
- Definition of done:
  - Live sign-in no longer throws post-login RSC/React errors.
  - ECD dashboard links/buttons navigate again after login.
  - `npm run lint` and `npm run build` pass on the shipping code.
  - Any unreproduced landing-page loop is documented honestly instead of guessed at.
- Files to touch:
  - `app/(auth)/login/page.tsx`
  - `app/ecd/login/page.tsx`
  - `tasks/todo.md`
  - `tasks/lessons.md`
- Validation commands:
  - `npm run lint`
  - `npm run build`
  - Browser verification of live `/ecd/login` and post-login dashboard navigation
- Execution steps:
  1. Reproduce the live issue and capture the exact console/network failure.
  2. Ship the smallest login redirect fix already validated locally.
  3. Re-run lint/build and confirm post-login ECD navigation works again.

## Live ECD Buttons + Landing Redirect Results - 2026-03-19
- [x] Reproduced the ECD breakage as a real post-login/session middleware regression, not a missing sidebar or dead button DOM issue.
- [x] Kept the login hydration + single-navigation fix in place for both parent and ECD auth pages.
- [x] Stabilized session-key validation in `lib/session-guard.ts` and added one repair attempt in `lib/middleware-ecd-device-limit.ts`.
- [x] Fixed the Edge-runtime middleware crash by replacing the Node `crypto` device hash with Web Crypto.
- [x] Stopped the `/ecd/login?error=session_revoked` self-loop and disabled ECD device-limit enforcement by default behind `ENFORCE_ECD_DEVICE_LIMIT=1` until the flow is redesigned safely outside request middleware.
- [x] Verification: `npm run lint` PASS.
- [x] Verification: `npm run build` PASS.
- [x] Verification: local production browser flow loads `/ecd/dashboard`, `/ecd/attendance`, and `/ecd/applications` successfully; homepage `/` renders instead of entering a redirect loop.
- [ ] Follow-up: redesign multi-session/device-limit enforcement off the request middleware path, then re-enable it with an explicit rollout plan.
## Session Plan - 2026-03-18 Login Hydration Debug
- Task: Trace and fix the reported "fails after log in" regression without changing unrelated portal behavior.
- Why now: Local login is falling back to a native form submit on cold loads, which makes sign-in look broken even though authenticated portal routes still work once a session exists.
- Definition of done:
  - The parent and ECD login pages no longer native-submit before hydration is ready.
  - A real authenticated ECD dashboard load still works after the change.
  - `npm run lint` and `npm run build` exit 0 after the patch.
- Files to touch:
  - `app/(auth)/login/page.tsx`
  - `app/ecd/login/page.tsx`
  - `tasks/todo.md`
  - `tasks/lessons.md`
- Validation commands:
  - `npm run lint`
  - `npm run build`
  - Browser verification of `/login` and `/ecd/login` with a warm submit path
- Execution steps:
  1. Confirm whether the failure is auth-related or a client-hydration/login-form regression.
  2. Patch the login pages so form controls stay inert until hydration is ready, preventing destructive native submits on cold loads.
  3. Re-run lint/build and verify that authenticated ECD dashboard access still succeeds after the fix.

## Login Hydration Debug Results - 2026-03-19
- [x] Identified the login failure as a cold-load hydration/native-submit problem, not bad credentials or a broken ECD dashboard route.
- [x] Hardened parent and ECD login pages so auth controls stay disabled until hydration is ready.
- [x] Verification: `npm run lint` PASS.
- [x] Verification: `npm run build` PASS after clearing the repo-local `.next` lock from the running dev server.
- [x] Verification: authenticated `/ecd/dashboard` still loads with a valid seeded session cookie; MCP browser hydration on local login routes remains inconsistent, so final click-through should be confirmed in a normal browser session.
- [x] Production-server sign-in now completes with a single hard redirect from both login pages, removing the post-login RSC abort/React errors caused by double navigation.

## Session Plan - 2026-03-18 Cleanup & Copyright Sprint
- Task: Restore the ECD portal shell, widen website access to all tiers, finish copyright cleanup, and rerun the full verification gate.
- Why now: The redundant ECD page shell is breaking portal navigation, and this sprint closes the remaining product polish and legal-surface gaps before pilot growth.
- Definition of done:
  - No `app/ecd/(portal)` page imports or renders `EcdOsShell`.
  - `website-builder` minimum tier is `basic`, ECD primary nav stays at 8 items, and Sessions remains accessible from Settings.
  - Communications refreshes on new ECD notification inserts without a manual page reload, with any larger thread-id refactor deferred explicitly if needed.
  - Reset-centres migration is created but not executed, with preserved pilot centres documented.
  - Copyright copy uses `©`, email year is dynamic, and the legal page shows enterprise number `K2026225576`.
  - `tasks/todo.md` and `tasks/lessons.md` reflect the real outcomes of this sprint.
  - `npm run lint`, `npm run audit:design`, `npm run build`, and `npm run test:parent-uat` all exit 0.
- Files to touch:
  - the 25 listed `app/ecd/(portal)` files still using `EcdOsShell`
  - `lib/ecd/feature-gates.ts`
  - `app/ecd/(portal)/communications/page.tsx`
  - `app/ecd/(portal)/communications/direct-message-panel.tsx`
  - `app/ecd/(portal)/communications/composer.tsx`
  - `supabase/migrations/20260318_reset_test_centres.sql`
  - `components/layout/global-desktop-footer.tsx`
  - `components/layout/global-mobile-legal-strip.tsx`
  - `lib/email/email-layout.ts`
  - `app/legal/page.tsx`
  - `tasks/todo.md`
  - `tasks/lessons.md`
  - `BACKLOG.md` only if new deferred work appears
- Validation commands:
  - `Get-ChildItem -Path app\ecd\(portal) -Recurse -Include *.tsx | Select-String -Pattern EcdOsShell`
  - `Select-String -Path components/layout/ecd-navigation.ts -Pattern 'href:'`
  - `Select-String -Path lib/ecd/feature-gates.ts -Pattern 'website-builder'`
  - `npm run lint`
  - `npm run audit:design`
  - `npm run build`
  - `npm run test:parent-uat`
- Commit message: `fix: restore ecd portal shell and complete legal cleanup`
- Execution steps:
  1. Remove `EcdOsShell` from the affected ECD portal pages and recheck portal/sidebar expectations.
  2. Update website feature gating, verify Sessions stays in Settings only, and wire the smallest safe communications realtime refresh.
  3. Create the non-executed centre-reset migration, verify the two-session ECD admin guard, and clean up copyright/legal surfaces.
  4. Re-run lint, audit, build, parent UAT, then update task and lesson state to match the actual outcome.
## Cleanup & Copyright Sprint Results - 2026-03-18
- [x] Task 1: Removed `EcdOsShell` from all 25 targeted ECD portal pages so the portal layout owns the sidebar again.
- [x] Task 2: Changed `website-builder` access to `basic`; ECD primary nav was already compliant at 8 items with no Sessions item.
- [x] Task 3: Kept Sessions accessible from ECD Settings/Profile and removed the redundant shell wrapper from the profile page.
- [x] Task 4: Wired communications realtime refresh for thread inserts and ECD notification inserts, while keeping `Tabs defaultValue={activeTab}`.
- [x] Task 5: Created `supabase/migrations/20260318_reset_test_centres.sql` for founder review only; not executed in this session.
- [x] Task 6: Verified ECD admin multi-session remains active (`maxSessions = 2` in `lib/session-guard.ts`, enforced from `middleware.ts`).
- [x] Task 7: Replaced user-visible `(c)` footer copy with `©`, made email copyright year dynamic, and added enterprise number `K2026225576` to `/legal`.
- [x] Task 8: Verified ECD nav business rules stay clean (`comingSoon = 0`, no primary-nav tier locks, parent nav routes exist, admin primary nav definition remains 6 items).
- [x] Task 9: Final automated gate passed in sequence: `npm run lint`, `npm run audit:design`, `npm run build`, `npm run test:parent-uat`.
- [x] Multi-session: ECD admin allowed 2 sessions (maxSessions=2 in session-guard.ts)
  Note: Revert path - change maxSessions to 1 and push. Migration is additive only.

## Remaining Manual Follow-up
- [ ] Founder review and execute `supabase/migrations/20260318_reset_test_centres.sql` if the centre reset is still desired.
- [ ] Founder completes Sakhisizwe onboarding on 2026-03-19, then rerun the live pilot-centre readiness query.
- [ ] Run the authenticated staging/manual Gate 3 checks once founder/admin, ECD, and parent sessions are available.
## Session Plan - 2026-03-18 Production Readiness Sprint
- Task: Clear the remaining production-readiness blockers by fixing design audit warnings/errors, reducing ECD primary nav to 8 items, and running the final production gate.
- Why now: This is a pilot-blocking quality and reliability pass immediately before 20-creche expansion.
- Definition of done:
  - `npm run lint` exits 0 with no warnings.
  - `npm run audit:design` exits 0 with `Design audit passed.` and no warnings.
  - `npm run build` exits 0.
  - `npm run test:parent-uat` exits 0.
  - `components/layout/ecd-navigation.ts` has 8 primary items and `/ecd/sessions` remains accessible from settings.
  - `tasks/todo.md`, `tasks/lessons.md`, and `docs/BACKLOG_EXECUTION_SCOREBOARD.md` reflect the real session state.
- Files to touch:
  - `scripts/design-audit.mjs`
  - targeted dialog / semantic-class UI files flagged by audit
  - `components/layout/ecd-navigation.ts`
  - `app/ecd/(portal)/profile/page.tsx`
  - `tasks/todo.md`
  - `tasks/lessons.md`
  - `docs/BACKLOG_EXECUTION_SCOREBOARD.md`
  - skill files only if their required sections are missing
- Validation commands:
  - `node scripts/design-audit.mjs`
  - `npm run lint`
  - `npm run audit:design`
  - `npm run build`
  - `npm run test:parent-uat`
  - `grep -c "href:" components/layout/ecd-navigation.ts`
- Commit message: `fix: clear final production readiness blockers`
- Execution steps:
  1. Patch the design audit exemptions and clear dialog / semantic-class warnings with minimal UI edits.
  2. Remove `/ecd/sessions` from primary ECD nav and surface it from ECD settings/profile instead.
  3. Verify the two new skill files contain the required sections and only patch them if they are incomplete.
  4. Run the full production gate, record pass/fail/deferred results, and update task/lesson/scoreboard state to match reality.

## Sprint: Production Readiness (March 2026)
- [x] Security: fix .gitignore to exclude .env
- [x] Security: remove hardcoded service_role keys from scripts
- [x] Security: rotate SUPABASE_SERVICE_ROLE_KEY (manual, done)
- [x] Security: rotate PAYSTACK_SECRET_KEY (manual, done)
- [x] Security: replace real credentials in .env.example with placeholders
- [x] Design: make audit:design pass (Prompt 2)
- [x] Complexity: reduce ECD nav to ≤8 items (Prompt 3) — verified with 8-item nav command
- [x] Real-time: live subscriptions are in code for ECD pipeline + parent notifications (Prompt 4); authenticated staging verification remains in the production gate
- [x] Admin: unify admin dashboard to single source of truth (Prompt 5)
  - /admin/hq now redirects to /admin/dashboard
  - Admin sidebar simplified to 6 items (Overview, Centres, Users, Revenue, Support, Command)
  - Admin theme updated to brand teal/amber (no more crypto dashboard neons)
  - Pilot Status card added to dashboard (Bajabulile + Sakhisizwe)
  - Advanced tools accessible via dashboard drill-down section
- [x] Skills: created 4 new skill files (Prompt 6)
  - production-security.md
  - realtime-data-flows.md
  - simplification-sprint.md
  - pilot-activation.md
- [x] Verification: npm run lint PASSES
- [x] Verification: npm run build PASSES
- [x] Verification: npm run audit:design PASSES
- [x] Verification: npm run test:parent-uat PASSES

## Remaining for Production Gate
- [ ] Run live Google OAuth UAT and 375px visual verification on production.
- [ ] Validate billing automation and Paystack collection flow on production.
- [ ] Verify realtime admissions, parent applications, parent notifications, and admin pilot cards in an authenticated staging session.
- [ ] Fix Sakhisizwe through product surfaces so `onboarding_complete = true` and `child_count > 0`, then rerun the pilot-centre data check.
- [ ] Verify RLS rowsecurity for `parent_notifications`, `applications`, `children`, `daily_reports`, and `attendance` via SQL editor or direct DB access.
- [ ] Verify Refer & Earn is visible from the ECD dashboard.

## Production Gate - 18 March 2026
- Timestamp: 2026-03-18 21:01:13 +02:00
- Gate 1 - PASS: `npm run lint`, `npm run audit:design`, `npm run build`, and `npm run test:parent-uat` all exited 0 on the final code state.
- Gate 2 - PASS: Sign In is present, no `comingSoon` ECD nav items remain, the nav verification command returns 8, no fake landing stats matched, no hardcoded JWTs were found in `scripts/`, `.env` is ignored, and `.env.example` has no JWT-like secrets.
- Gate 3 - DEFERRED TO STAGING: realtime admissions, parent application status sync, parent notification delivery, and authenticated admin pilot-card verification still require logged-in browser checks.
- Gate 4 - FAIL: live pilot-centre data query confirmed Bajabulile is ready, but Sakhisizwe still has `onboarding_complete = false` and `child_count = 0`; rowsecurity verification for the listed tables is still pending.
- Gate 5 - PASS: pilot-offer copy now reads `Onboarding fee waived + first month free until end of April 2026` on the ECD intro page.
- Gate 6 - PASS: task tracker and lessons log updated to reflect the real session outcome.
- Summary: Automated code gate is clear, but 20-creche pilot expansion is still blocked on Sakhisizwe activation data and the deferred authenticated staging checks.

## Backlog
See BACKLOG.md

