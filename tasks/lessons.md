# CentreConnect — Lessons Learned

## 2026-03-16
- LESSON: Never hardcode service_role keys in scripts, even "one-off" scripts.
  RULE: All scripts that need Supabase admin access must use dotenv + process.env.
  PREVENTION: Add `eslint-plugin-no-secrets` or a pre-commit hook that scans for JWT patterns.

- LESSON: .env (not .env.local) was not in .gitignore, leading to tracked secrets.
  RULE: .gitignore must explicitly list `.env` not just `.env.local`.
  PREVENTION: Verify `git status` never shows .env as tracked after initial setup.

- LESSON: ECD nav grew to 18 items without a gate check.
  RULE: Orchestrator gate 8 (≤8 ECD nav items) must be checked before every session.
  PREVENTION: Add nav item count assertion to lint script.

## 2026-03-18
- LESSON: .env.example contained real Supabase URL, anon key, and service role key — not placeholders.
  RULE: .env.example must ONLY contain placeholder values like `your-supabase-service-role-key-here`.
  PREVENTION: Add a pre-commit check that scans .env.example for JWT patterns (`eyJhbGci`).

- LESSON: Admin sidebar had 15+ items across 4 grouped sections — too many for a solo founder.
  RULE: Admin nav ≤ 6 items. Advanced pages live as dashboard drill-downs, not primary nav.
  PREVENTION: Nav item budget enforced in simplification-sprint.md skill; check in every PR.

- LESSON: Two admin pages (/admin/hq and /admin/dashboard) competed as "home". Founder split attention.
  RULE: One source of truth per portal. Consolidate, don't duplicate.
  PREVENTION: Any new "overview" page must replace the existing one, never coexist.

- LESSON: Admin theme used arbitrary cyan neons (rgb(0,242,255)) that felt like a crypto dashboard.
  RULE: Even dark-themed admin portals must use brand palette (teal/amber) for accent colours.
  PREVENTION: Design audit should flag any colour not in the brand palette.
