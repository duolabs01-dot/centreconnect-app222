# CentreConnect — Active Tasks

## Sprint: Production Readiness (March 2026)
- [x] Security: fix .gitignore to exclude .env
- [x] Security: remove hardcoded service_role keys from scripts
- [x] Security: rotate SUPABASE_SERVICE_ROLE_KEY (manual, done)
- [x] Security: rotate PAYSTACK_SECRET_KEY (manual, done)
- [x] Security: replace real credentials in .env.example with placeholders
- [ ] Design: make audit:design pass (Prompt 2)
- [ ] Complexity: reduce ECD nav to ≤8 items (Prompt 3) — ✅ Verified: 8 items
- [ ] Real-time: add live subscriptions to ECD pipeline + parent notifications (Prompt 4)
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

## Remaining for Production Gate
- [ ] Run live Google OAuth UAT and 375px visual verification on production
- [ ] Validate billing automation and Paystack collection flow on production
- [ ] Verify Bajabulile onboarding_complete = true in Supabase
- [ ] Verify Sakhisizwe onboarding_complete = true in Supabase
- [ ] Verify both centres have ≥1 child in children table
- [ ] Verify pilot offer copy accuracy ("onboarding + first month free until end of April 2026")
- [ ] Verify Refer & Earn is visible from ECD dashboard
- [ ] Run audit:design and fix any failures

## Backlog
See BACKLOG.md
