## Marketplace Listing Restore Results - 2026-03-19
- [x] Restored the app-side marketplace logic so public directory, shortlist, compare, claim, centre-profile, and apply surfaces are ready to read all published non-deleted centre listings again.
- [x] Added `supabase/migrations/20260319_001_restore_public_directory_listings.sql` to widen `public_ecd_centres` back to website-published, non-deleted centres instead of only active pilot-style centres.
- [x] Verification: `npm run lint` PASS.
- [x] Verification: `npm run build` PASS.
- [ ] Pending live DB step: apply `20260319_001_restore_public_directory_listings.sql` in Supabase so production/public directory expands from 4 visible centres to the broader published marketplace set.
## Directory Visibility Cleanup Results - 2026-03-19
- [x] Removed the forced `Alexandra` default from the public directory page, the directory search API, and parent discover so anonymous browsing now starts on all eligible centres.
- [x] Updated directory/discover copy so the product now says it is showing centres across Johannesburg instead of implying a pilot-only Alexandra slice.
- [x] Verified live data state: `64` centres exist in `ecd_centres`, `4` are currently public (`is_active = true` and `website_published = true`): Bajabulile Day Care Centre, Lombardy East Sunshine Seeds ECD, Sakhisizwe Day Care Centre, and Sunshine Early Learning Centre.
- [x] Confirmed the remaining `60` centres are still hidden because they are inactive, not because of the directory filter bug.
- [x] Verification: `npm run lint` PASS.
- [x] Verification: `npm run build` PASS.
## Session Plan - 2026-03-19 Directory Visibility Cleanup
- Task: Make the public directory show all eligible ECD centres by default instead of quietly starting on the Alexandra pilot slice.
- Why now: The current directory experience still looks pilot-only because anonymous users are auto-filtered to `Alexandra`, which makes it appear that only two centres exist.
- Definition of done:
  - Public `/directory`, `/parent/discover`, and `/api/directory/search` no longer force `Alexandra` as the default filter.
  - Directory messaging reflects “all centres” by default while still allowing suburb filtering.
  - We can clearly explain which centres remain hidden because they are inactive or not website-published.
  - Relevant verification passes after the patch.
- Files to touch:
  - `app/api/directory/search/route.ts`
  - `app/(journey)/directory/page.tsx`
  - `components/directory/DirectoryExplorer.tsx`
  - `app/(journey)/parent/discover/discover-client.tsx`
  - `tasks/todo.md`
  - `tasks/lessons.md`
- Validation commands:
  - `npm run lint`
  - `npm run build`
  - targeted grep/search checks for forced `Alexandra` defaults
- Execution steps:
  1. Remove the forced suburb default from the public directory API and SSR page.
  2. Align the directory explorer and parent discover copy/state so the UI no longer implies Alexandra-only browsing.
  3. Verify the remaining visibility rules and record the lesson so we do not quietly ship pilot-only defaults again.
## Session Result - 2026-03-19 Bajabulile Standards + Registration Trust Sprint
- Status: DONE
- Shipped:
  - DSD/DOE export now uses the live ECD portal session, matches the Bajabulile monthly report structure more closely, and supports direct PDF download from the portal without token hacks.
  - Post-acceptance registration now opens only after enrollment/offer acceptance and saves the Bajabulile registration questions into the linked child intake record.
  - Parent application acceptance now routes straight into registration, and both parent + ECD application detail screens now show registration progress clearly.
  - Bajabulile public profile now carries stronger trust proof through permit/compliance data and the Bajabulile hero image fallback.
- Verification:
  - `npm run lint` ✅
  - `npm run audit:design` ✅
  - `npm run build` ✅
  - `npm run test:parent-uat` ✅
- Notes:
  - `next build` still prints the existing dynamic-server warning for `/api/ecd/dsd-export/pdf` during postbuild sitemap generation, but the build completes successfully.
## Session Plan - 2026-03-19 Bajabulile Standards + Registration Trust Sprint
- Task: Raise parent, ECD, and founder trust by making the DSD/DOE export match the Bajabulile government report standard, introducing a proper post-acceptance registration step, and surfacing stronger Bajabulile trust signals on the public profile.
- Why now: The export is subsidy-critical, the registration questions belong after acceptance rather than inside the application flow, and Bajabulile should visibly prove compliance and quality to parents.
- Intent summary:
  - Make the ECD export feel like the real `"Monthly Report Bajabulile Day Care Centre"` standard while still being clean and professional in-app and in PDF form.
  - Create a simple registration handoff after an offer is accepted so parents complete centre-required questions only once they are enrolled.
  - Strengthen Bajabulile's public listing/profile with the hero image, permit visibility, and centre registration details as social proof.
- P0 scope:
  - Audit the existing export against the Bajabulile source PDF and close the fidelity gaps in the ECD page and PDF route.
  - Add a post-acceptance registration flow seeded from existing parent/child data and aligned to the Bajabulile registration form.
  - Surface Bajabulile public trust markers: hero image, permit/proof block, and registration number details on the parent-facing centre page.
- P1 scope:
  - Tighten the parent acceptance success copy so the new registration step feels like the natural next action.
  - Preserve existing admissions, dashboard, and multi-child logic outside the targeted flows.
- Constraints:
  - Do not move registration questions back into the application flow.
  - Do not break the existing DSD data builder if the export page and PDF route can reuse it.
  - Keep changes mobile-safe, TypeScript-safe, and honest to the real Bajabulile documents.
- Definition of done:
  - ECD export page and PDF output present the full data set in a government-ready structure aligned to the Bajabulile monthly report.
  - After a parent accepts placement, they are guided into a centre registration form based on the Bajabulile registration questions.
  - Bajabulile public centre detail shows stronger compliance/trust proof, including permit context and registration number.
  - `npm run lint`, `npm run audit:design`, `npm run build`, and `npm run test:parent-uat` all pass.
- Files to inspect/touch:
  - `app/ecd/(portal)/dsd-export/page.tsx`
  - `app/api/ecd/dsd-export/route.ts`
  - `app/api/ecd/dsd-export/pdf/route.ts`
  - `lib/ecd/dsd-export.ts`
  - `app/c/[slug]/page.tsx`
  - `app/c/[slug]/centre-client.tsx`
  - acceptance / registration handoff files under `app/(journey)/parent/applications/*`, `app/api/parent/applications/*`, and new parent registration route(s) as needed
  - `tasks/todo.md`
  - `tasks/lessons.md`
- Validation commands:
  - `npm run lint`
  - `npm run audit:design`
  - `npm run build`
  - `npm run test:parent-uat`
- Commit message: `fix: align bajabulile export and registration trust flows`
- Execution steps:
  1. Extract the real Bajabulile monthly report, registration form, and permit details and map them to the current export/profile/registration surfaces.
  2. Upgrade the DSD/DOE export page and PDF route to use the live ECD session data and the stronger government-style presentation.
  3. Add the post-acceptance registration flow and parent-facing trust enhancements, then rerun the full verification gate and record lessons before commit/push.
## Session Plan - 2026-03-19 Parent Daily Updates + Staff Invite + Notifications Sprint
- Task: Make the parent dashboard show the latest enrolled-child daily updates cleanly, replace the fake support-assisted staff invite with a real ECD admin invite flow, and harden in-app notification reliability for parent-facing surfaces.
- Why now: Parents with enrolled children still lose child-specific daily context on the dashboard, ECD admins cannot truly add staff from settings, and notification trust breaks when inbox/bell state is inconsistent or under-filtered.
- Intent summary:
  - Parent dashboard should stay household-first but show one latest daily update card per enrolled child when a family has multiple enrolled children.
  - ECD profile staff management should use the real `/api/ecd/invitations` flow, not a support-ticket placeholder.
  - Parent notification reads, lists, and bell updates should stay explicitly scoped to the logged-in parent and react to new inserts immediately.
- P0 scope:
  - Parent dashboard: derive latest published daily report per enrolled child and render a simple per-child updates section.
  - Staff management: replace the support-assisted invite form in `/ecd/profile` with a real invite submission that hits the existing ECD invite API.
  - Notifications: add explicit `parent_id` filtering where missing, and make the parent notification bell update live on insert/update without waiting for a manual refresh.
- P1 scope:
  - Tighten empty states and copy so multi-child / multi-centre households still understand where to tap next.
  - Preserve current ECD sidebar / layout / admissions behavior.
- Constraints:
  - Do not redesign the parent IA or add a new child selector flow.
  - Do not touch onboarding or admin invite flows unless shared invite logic must be reused safely.
  - Keep changes mobile-safe, TypeScript-safe, and scoped to the affected surfaces.
- Definition of done:
  - Parent dashboard shows the latest published daily update for each enrolled child, with sensible single-child and multi-child presentation.
  - ECD admins can invite staff from `/ecd/profile` without opening a support ticket.
  - Parent inbox and bell stay filtered to the authenticated parent and reflect new notification inserts/reads reliably.
  - `npm run lint`, `npm run audit:design`, `npm run build`, and `npm run test:parent-uat` all pass.
- Files to inspect/touch:
  - `app/(journey)/parent/dashboard/page.tsx`
  - `app/(journey)/parent/notifications/page.tsx`
  - `app/(journey)/parent/notifications/notifications-inbox.tsx`
  - `components/notifications/parent-notification-bell.tsx`
  - `app/ecd/(portal)/profile/page.tsx`
  - `app/api/ecd/invitations/route.ts` only if shared invite logic must be extracted
  - `tasks/todo.md`
  - `tasks/lessons.md`
- Validation commands:
  - `npm run lint`
  - `npm run audit:design`
  - `npm run build`
  - `npm run test:parent-uat`
- Commit message: `fix: ship parent updates and real staff invites`
- Execution steps:
  1. Rework parent dashboard daily-update derivation so enrolled children each get a current update card without introducing a selector-first flow.
  2. Replace the `/ecd/profile` support-ticket staff invite path with a real invite submission backed by the existing ECD invite API.
  3. Harden parent notification reads and realtime bell/inbox updates with explicit parent scoping and live insert/update handling.
  4. Re-run the full verification gate, capture lessons, then commit and push only the shipping diff.
## Parent Daily Updates + Staff Invite + Notifications Results - 2026-03-19
- [x] Parent dashboard now derives the latest published daily report per enrolled child and shows separate update cards when a household has multiple enrolled children.
- [x] Added a lightweight dashboard realtime bridge so parent-facing ECD updates refresh the household home without a manual reload.
- [x] `/ecd/profile` now uses the real ECD invite API via a client invite form, so ECD admins can add staff without creating support tickets.
- [x] Staff invite delivery now succeeds even when direct SMTP falls back to the queued email path; the UI receives a success response with a delivery warning instead of a false failure.
- [x] Parent inbox loading and mark-read actions are now explicitly scoped to `parent_id`, and realtime inserts hydrate centre contact metadata before rendering CTAs.
- [x] Parent notification bell now refreshes live on insert/update.
- [x] Verification: `npm run lint` PASS.
- [x] Verification: `npm run audit:design` PASS.
- [x] Verification: `npm run build` PASS.
- [x] Verification: `npm run test:parent-uat` PASS.
- [x] Known build note: the existing postbuild dynamic-server warning for `/api/ecd/dsd-export/pdf` is unchanged in this sprint.
# CentreConnect — Active Tasks

## Session Plan - 2026-03-19 ECD Admissions + Household Sync Sprint
- Task: Restore ECD admissions opening/accept flow, make the parent dashboard show the full household smartly, notify parents after child linking, sync parent profile fields with ECD priority, and stop mobile horizontal overflow.
- Why now: ECD admins are blocked from opening/accepting admissions, parents still see a partial household story, linked-profile updates are not consistently flowing from the ECD side, and mobile overflow keeps damaging trust.
- Definition of done:
  - ECD admins can open an application record and complete admissions actions again.
  - Parent dashboard shows the whole family state clearly without adding a complicated selector-first experience.
  - Successful child linking creates a parent notification with on-brand CentreConnect messaging.
  - Parent profile sync gives ECD-supplied phone data priority on link, while preserving an additional number when the parent already had one.
  - Mobile pages no longer introduce horizontal scrolling from the app shell/common layouts on narrow screens.
  - `npm run lint`, `npm run audit:design`, `npm run build`, and `npm run test:parent-uat` all pass.
- Files to inspect/touch:
  - `app/(journey)/parent/dashboard/page.tsx`
  - `app/ecd/(portal)/applications/page.tsx`
  - `app/ecd/(portal)/applications/[id]/page.tsx`
  - `app/ecd/(portal)/applications/_*` and related admissions action components
  - `app/account/link-child/*` or linked account activation screens
  - `lib/ecd/parent-link-requests.ts`
  - `lib/notifications/*`
  - `app/globals.css` and shared layout/shell files causing overflow
  - `tasks/todo.md`
  - `tasks/lessons.md`
- Validation commands:
  - `npm run lint`
  - `npm run audit:design`
  - `npm run build`
  - `npm run test:parent-uat`
- Commit message: `fix: restore admissions and household sync flows`
- Execution steps:
  1. Reproduce and fix the ECD admissions detail/action failure so opening and accepting applications works again.
  2. Upgrade the parent household dashboard from summary-only to a clearer all-family view without adding complexity.
  3. Add justified parent notification after successful child linking and align parent profile sync so ECD data wins for primary phone while preserving a secondary number when needed.
  4. Apply a shared mobile overflow guard plus targeted fixes for confirmed offenders, then rerun the full verification gate and record lessons.
## ECD Admissions + Household Sync Results - 2026-03-19
- [x] Fixed the ECD application detail page so admissions records open again even when the live schema no longer exposes `applications.fee_notes`.
- [x] Added a split-query fallback for application detail loading so embed-heavy joins do not blank the page when one select shape drifts from production.
- [x] Updated fee agreement saving to persist `monthly_fee_cents` plus a tagged fee note inside `admin_notes`, avoiding the missing `fee_notes` column entirely.
- [x] Expanded the parent dashboard `Family at a glance` card into a simple household view that shows every child journey without introducing a new selector flow.
- [x] Successful child linking now sends a parent notification with CentreConnect welcome messaging and revalidates `/parent/notifications`.
- [x] Parent phone sync now gives the ECD/request phone primary priority on link and keeps a different previous number as `parents.alt_phone`.
- [x] Added shared and targeted mobile overflow fixes so the home and directory quick-filter chips wrap instead of causing horizontal scroll on small screens.
- [x] Verification: `npm run lint` PASS.
- [x] Verification: `npm run audit:design` PASS.
- [x] Verification: `npm run build` PASS.
- [x] Verification: `npm run test:parent-uat` PASS.
## Session Plan - 2026-03-19 Parent Multi-Child Home Logic
- Task: Make the parent entry flow and dashboard handle multiple children, mixed enrolment, and multiple ECDs without adding a new selector flow.
- Why now: Parents can already have more than one child and more than one application, but the current entry logic still treats the household like a single yes/no enrolment case.
- Definition of done:
  - Parent entry routing uses the full household state instead of only checking for any enrolled child.
  - Parents with enrolled children still land in the parent home, pending-only households land where the next action is clearer, and families with no children yet are not dropped into the wrong place.
  - Parent dashboard copy stays accurate when a household has multiple children, mixed statuses, or children linked to different ECDs.
  - npm run lint, npm run build, and npm run test:parent-uat all pass.
- Files to touch:
  - app/(journey)/page.tsx
  - app/(journey)/parent/dashboard/page.tsx
  - lib/parent/home-state.ts
  - lib/auth/client-auth.ts
  - lib/supabase/middleware.ts
  - tasks/todo.md
  - tasks/lessons.md
- Validation commands:
  - npm run lint
  - npm run build
  - npm run test:parent-uat
- Commit message: fix: simplify parent multi-child routing
- Execution steps:
  1. Define one household-level routing rule that works for enrolled, pending, discover, and first-child cases.
  2. Reuse that rule for authenticated parent entry points so login and / stay consistent.
  3. Update parent dashboard copy/summary to reflect multiple children and multiple ECDs without adding new navigation complexity.
  4. Re-run verification, record lessons, then commit and push the shipping fix.

## Parent Multi-Child Home Logic Results - 2026-03-19
- [x] Replaced the binary parent entry redirect with one shared household-state rule: enrolled households go to `/parent/dashboard`, pending-only households go to `/parent/applications`, households with children but no applications go to `/parent/discover`, and first-time households go to `/parent/children/new`.
- [x] Updated parent auth and middleware defaults so parent sign-in lands on `/`, letting the server choose the right household route consistently.
- [x] Updated the parent dashboard copy and summary so multiple children, mixed enrolment, and multiple creches stay accurate without adding a new selector flow.
- [x] Shared parent home-state helpers now keep landing redirects, dashboard state, and progress calculations aligned.
- [x] Verification: `npm run lint` PASS.
- [x] Verification: `npm run audit:design` PASS.
- [x] Verification: `npm run build` PASS.
- [x] Verification: `npm run test:parent-uat` PASS.
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







## Session Plan - 2026-03-19 ECD Sidebar + Settings Refresh
- Task: Make the ECD sidebar clearer for admins by surfacing tier status, restoring a visible WhatsApp support action, and turning the profile/settings surface into a more useful account hub.
- Why now: The ECD admin shell already has the data, but the operator needs faster visibility into tier, billing, and support without hunting through multiple screens.
- Definition of done:
  - ECD sidebar shows the tier clearly and has a visible WhatsApp support action on desktop and mobile.
  - The primary ECD sidebar entry is labeled as Settings rather than a generic admin bucket.
  - The settings/profile page shows account and billing context that helps an admin understand card/payment status quickly.
  - `npm run lint` and `npm run build` pass after the change.
- Files likely to touch:
  - `components/layout/ecd-navigation.ts`
  - `components/layout/ecd-portal-sidebar.tsx`
  - `components/layout/mobile-nav-menu.tsx`
  - `app/ecd/(portal)/profile/page.tsx`
  - `tasks/todo.md`
  - `tasks/lessons.md`
- Validation commands:
  - `npm run lint`
  - `npm run build`
  - Browser spot-check: ECD sidebar on desktop + mobile, then `/ecd/profile` settings summary
- Commit message: `fix: clarify ecd settings and support access`

## Session Outcome - 2026-03-19 ECD Sidebar + Settings Refresh
- [x] ECD sidebar now surfaces the current tier clearly on desktop and mobile.
- [x] The primary ECD sidebar entry is labeled `Settings`, and the profile page now acts as the account hub.
- [x] WhatsApp support was restored as a visible sidebar action for ECD admins.
- [x] The profile page now shows billing and payment context, including subscription tier and card details when available.
- [x] Verification passed: `npm run lint`
- [x] Verification passed: `npm run build`
