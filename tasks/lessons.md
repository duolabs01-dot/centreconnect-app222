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

- LESSON: PowerShell fallback edits can corrupt markdown when the inserted text contains backticks inside a double-quoted here-string.
  RULE: When patch tooling is unavailable on Windows, use single-quoted here-strings for markdown/code literals before writing tracked docs.
  PREVENTION: Re-read the edited file immediately after every fallback `Set-Content` write and repair formatting before continuing.

- LESSON: Grep-based nav budget checks can miscount when the type definition uses the same `href:` token as the data rows.
  RULE: Keep release-gate verification commands aligned with file structure so the count reflects actual nav items, not type metadata.
  PREVENTION: Use a type shape like `Record<'href', string>` or tighten the verification pattern before calling the nav budget done.

- LESSON: Pilot expansion readiness cannot be inferred from green code gates alone; the March 18, 2026 live query still showed Sakhisizwe with `onboarding_complete = false` and `child_count = 0`.
  RULE: Never declare pilot expansion ready without a live centre-data check for the named pilot centres.
  PREVENTION: Keep a release-day readiness query or checklist that validates live pilot-centre activation data before the final sign-off.

- LESSON: Inline Node edit scripts should build markdown from joined string arrays, not template literals, when the content contains backticks.
  RULE: If fallback shell edits are needed, avoid JS template strings for tracked markdown files that embed code spans.
  PREVENTION: Use line arrays + `join("\n")`, then re-read the file immediately after writing.

- LESSON: On Windows, a running `next dev` process can lock `.next/trace` and make `npm run build` fail with `EPERM` even when the code is fine.
  RULE: If build hits a `.next` trace lock, identify and stop the repo's dev server, clear `.next`, then rerun build.
  PREVENTION: Before release-gate builds on Windows, check for a running repo-local Next dev server and avoid sharing the same `.next` output.

- LESSON: `test:parent-uat` enforces scoreboard continuity, not just product code; dropping the `BL-PARENT-030`/`BL-PARENT-031` sequence or the active parent item will fail the gate.
  RULE: Keep `docs/BACKLOG_EXECUTION_SCOREBOARD.md` aligned with the parent reliability sequence whenever the parent UAT gate is part of release verification.
  PREVENTION: Update the scoreboard before rerunning `npm run test:parent-uat` whenever a session changes top-of-board priorities.

- LESSON: Bulk wrapper-removal edits need a post-pass for literal `` `r`n `` artifacts and missing closing tags before trusting the result.
  RULE: After scripted JSX wrapper removal, immediately grep for literal newline escape text and rerun syntax checks before broader validation.
  PREVENTION: Add a targeted `Select-String` sanity check plus `npm run lint` right after any multi-file wrapper cleanup.
