# CentreConnect Sprint — Post-Audit Fixes

**Date:** 2026-03-22
**Priority:** HIGH — Security & Stability
**Goal:** Ship 10/10 by eliminating the remaining findings

---

## CRITICAL (Do First)

### 1. `npm audit` — Resolve 8 Dependency Vulnerabilities
**Risk:** Medium — must be done carefully to avoid breaking Next.js
**Command:**
```bash
npm audit --audit-level=high
```
**What to fix:**
- `undici` — HTTP client, upgrade via `npm update undici`
- `ws` — WebSocket, upgrade via `npm update ws`
- `tar` / `path-scurfather` — filesystem, upgrade via `npm update tar`
- Do NOT force-upgrade Next.js or `@supabase/ssr` — will break
- Do NOT `npm audit fix --force`
**Commit:** `chore: resolve 8 dependency vulnerabilities`

---

## HIGH PRIORITY

### 2. Client Supabase URL/Key in Source Code
**Risk:** Low — already partially fixed
**Still broken:** The client.ts has duplicate lines, `supabaseUrl` and `supabaseAnonKey` are referenced before being declared
**File:** `lib/supabase/client.ts`
**Fix:** Rewrite the top 15 lines:
```typescript
import { createBrowserClient } from '@supabase/ssr'

let browserClient: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      '[CentreConnect] Missing Supabase env vars. ' +
      'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env'
    )
  }

  if (browserClient) return browserClient
  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return browserClient
}
```
**Commit:** `fix: rewrite client.ts to remove duplicate declarations`

### 3. Strict TypeScript — Return to `strict: true`
**Risk:** Low — only enables full type checking
**File:** `tsconfig.json`
**After fixing remaining `any` types, re-enable:**
```json
"strict": true
```
**Commit:** `types: re-enable strict mode after resolving remaining any casts`

### 4. Remaining `any` Type Casts in API Routes (~2 instances)
**Risk:** Low — targeted type fixes
**Files:**
- `app/api/ecd/notifications-inbox/route.ts` — `sendNotification(...data as any)`
- `app/ecd/(portal)/children/new/actions.ts` — `profile: data as any`
**Fix each `as any` with explicit types**
**Commit:** `types: replace any casts with explicit types in 2 API routes`

---

## MEDIUM PRIORITY

### 5. Test Passwords in Browser Tests
**Risk:** Low — test infrastructure
**Files:** `tests/browser/*.spec.ts`
**Fix:** Replace hardcoded password with `process.env.TEST_USER_PASSWORD`
**Add to `.env.example`:** `TEST_USER_PASSWORD=your-test-password-here`
**Commit:** `test: use env var for test credentials`

### 6. Upgrade `@supabase/ssr` (Future Sprint)
**Risk:** HIGH — will break auth across 8 files
**Version:** 0.0.10 → 0.5.x removes `CookieOptions` type
**Must be done with full auth regression testing**
**Commit after migration:** `deps: upgrade @supabase/ssr to 0.5.x with full auth testing`

---

## DO NOT TOUCH (Without Dedicated Sprint)

- `git filter-repo` — Leaked key already rotated. Low priority.
- `npm audit fix --force` — Will break Next.js 16.2.0
- CSP `unsafe-inline` — Requires nonces, Next.js future work

---

## SPRINT GATE (All Must Pass)

```bash
npm run lint          # PASS
npm run audit:high   # 0 high vulnerabilities
npm run build        # PASS
```

**Total estimated time:** 2-3 hours
