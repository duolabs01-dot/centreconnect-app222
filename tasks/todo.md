# CentreConnect — Active Tasks

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

