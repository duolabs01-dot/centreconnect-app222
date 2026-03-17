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

