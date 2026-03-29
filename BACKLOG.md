## BACKLOG - CentreConnect
Last updated: 2026-03-29

### This Week (max 5 items)
- [ ] Run live Google OAuth UAT and 375px visual verification on production
- [ ] Validate billing automation and Paystack collection flow on production
- [ ] Verify both pilot centres are fully activated (all 5 funnel stages)

### Up Next
- [ ] Tighten platform admin user reset/runbook for safe live tenant cleanup
- [ ] Add pre-commit hook to scan for JWT patterns in .env.example and tracked files
- [x] Implement 48-hour no-login alert for pilot centres (churn prevention) — added as "Dormant owners" card in admin command page Action Now section
- [x] Add activation funnel dashboard widget showing per-centre stage progress — added to admin command page (5 stages: Active → Branded → Children → Attendance → Live)

### Ideas (not tasks yet - needs gate check before moving up)
- ECD role- and tier-aware UI: differentiate ECD Admin, ECD Teacher/Staff, and ECD Supervisor experiences; also vary features/options by subscription tier, show each user's tier clearly, research how successful companies handle role/tier UI, and draw inspiration from strong shadcn + Tailwind app patterns.
- Admin command palette (keyboard shortcut to jump between admin pages quickly)
- Weekly automated activation metrics email to founder

### Shelved (good ideas, wrong timing)
- Autonomous AI actions from admin surfaces (needs audit logging and founder signal quality first)
- External CEO/CTO brief sharing (needs access rules and redaction)
