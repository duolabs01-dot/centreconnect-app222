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

- LESSON: A cold Next dev load can leave login pages visible before their client handlers hydrate, which makes the browser fall back to a native form submit and look like auth is broken.
  RULE: Critical auth forms must stay inert until hydration is ready, especially when local debug flows depend on large app chunks compiling on demand.
  PREVENTION: Gate login form controls behind a tiny `isHydrated` state so cold-start users cannot trigger a destructive non-JS submit.

- LESSON: Mixing `router.replace()` and a delayed `window.location.assign()` after auth can abort the RSC payload and throw misleading React errors even when sign-in succeeds.
  RULE: Post-login redirects must use one navigation strategy only.
  PREVENTION: Prefer a single hard navigation when the destination depends on fresh authenticated server state.

- LESSON: Edge middleware cannot import Node-only modules like `crypto`; even a small helper inside a shared auth file can take every protected route down in production.
  RULE: Any code imported by `middleware.ts` must stay Edge-runtime safe.
  PREVENTION: Keep middleware helpers on Web APIs only (`crypto.subtle`, `TextEncoder`, standard fetch) and run a production build after any middleware change.

- LESSON: A middleware redirect target must never be re-checked by the same revocation guard, or it will recurse into `next=%2Flogin%3Fnext=...` loops.
  RULE: Login/recovery routes must be excluded from any session-revocation middleware that redirects to them.
  PREVENTION: For every new middleware redirect, verify the target route is an explicit allowlist case before shipping.

- LESSON: Route-level security middleware that breaks ECD navigation is worse than temporarily relaxing that one control.
  RULE: If a production guard blocks core portal navigation, gate it behind an explicit env flag and restore the product first.
  PREVENTION: Roll out device/session-limit enforcement behind a feature flag with browser regression coverage for login, dashboard, and first-click navigation.

## 2026-03-19
- LESSON: Public marketplace visibility should follow `website_published` and `is_deleted`, not only `is_active`, or the directory collapses into a pilot-only slice.
  RULE: If a centre should remain discoverable as a public listing, keep the public view aligned with publishing state rather than onboarding/activation state.
  PREVENTION: When changing centre lifecycle rules, re-check directory, shortlist, compare, claim, and profile surfaces against the live public view count before shipping.
- LESSON: A default suburb filter can quietly make the marketplace look pilot-only even when more public centres exist.
  RULE: Public discovery must open on all eligible centres unless the user explicitly chooses an area.
  PREVENTION: Audit SSR defaults, API defaults, and client copy together whenever discovery feels too narrow.
- LESSON: Server-generated PDF/print renderers can legitimately need raw hex values even when the app UI should stay token-based.
  RULE: Exempt non-UI print/render files from the design audit instead of weakening the printed output.
  PREVENTION: When adding a new PDF or email-like renderer, decide upfront whether it belongs in `HEX_EXEMPT_PATTERNS` and record that with the feature.

- LESSON: The Windows `apply_patch` path can fail with `CreateProcessWithLogonW failed: 1326` even for small tracked-doc edits.
  RULE: If the patch tool fails twice on Windows, switch immediately to a single-quoted PowerShell here-string write and re-read the file before continuing.
  PREVENTION: Treat tracked markdown/doc updates like any other risky write: verify the exact output right after the fallback write.
- LESSON: Supabase realtime insert payloads do not carry joined centre contact metadata, so inbox cards can lose reply/action context if we render `payload.new` directly.
  RULE: When an inbox item depends on relational CTA data, hydrate the inserted row by id before trusting the realtime payload.
  PREVENTION: Keep realtime notification handlers narrow and refetch joined metadata on insert for inbox or bell surfaces.

- LESSON: Server-rendered parent dashboard cards stay stale unless a small client bridge listens for the parent notification events that represent fresh ECD updates.
  RULE: If a dashboard section is server-rendered but must react to live operational updates, pair it with a minimal client refresh bridge instead of rewriting the whole page client-side.
  PREVENTION: Prefer one debounced realtime refresh bridge per dashboard over scattered client state copies.

- LESSON: Parent entry routing cannot assume one child, one centre, or one household state.
  RULE: Parent redirects must be derived from the household state (`hasChildren`, `hasPendingApplications`, `hasEnrolledChild`), not a single enrolled yes/no check.
  PREVENTION: Keep one shared parent home-state helper and reuse it in `/`, auth redirects, and progress/dashboard logic so mixed families stay consistent.

- LESSON: Parent dashboard copy that says "your child" or "your creche" becomes misleading as soon as a family has multiple active journeys.
  RULE: Parent home should stay household-first, with child-level detail living in Applications and child pages.
  PREVENTION: Add a compact household summary instead of inventing a new selector every time a family spans multiple children or creches.

- LESSON: Live schema drift in one embedded select (`applications.fee_notes`) can blank an entire admissions detail page even when the record itself still exists.
  RULE: Never assume a production column still exists just because older code or generated types reference it.
  PREVENTION: Verify the live column list before touching a critical join and keep a smaller split-query fallback for recovery paths.
- LESSON: A support queue button with no handler is still a broken workflow, even if the page loads and the table data is correct.
  RULE: If a row action is visible in an operations screen, it must either navigate, open a drawer, or call a server action.
  PREVENTION: Browser-test every admin row action once before shipping support or triage surfaces.

- LESSON: ECD admins need tier visibility in the sidebar itself, not only on billing or profile screens.
  RULE: If the plan affects website/billing support decisions, surface it in the shell so admins do not hunt for it.
  PREVENTION: When adjusting the ECD nav, pair the label change with a compact tier card and a direct settings/billing shortcut.
- LESSON: A stale or dev-contaminated `.next` can keep serving dev-style chunk URLs even after a seemingly successful start, which breaks hydration and makes client buttons look dead.
  RULE: If a browser test sees `main-app.js` / `app-pages-internals.js` 404s, rebuild production output before blaming the feature.
  PREVENTION: After any dev-server work, rerun `npm run build` and spot-check the HTML script tags before testing client-side buttons.

- LESSON: Official DOE/DSD exports must read from the canonical staff records table, not from live portal-login members merged at render time.
  RULE: Use `ecd_staff` as the export source of truth and sync portal invites/role changes into that table as a separate step.
  PREVENTION: If a login profile has an incomplete or one-word name, skip auto-sync rather than fabricating a placeholder employee row in a government report.
