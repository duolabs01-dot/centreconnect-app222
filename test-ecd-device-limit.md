# Quick Test Guide: ECD Admin Device Limit (2 Devices)

## 1. Apply the migration
```bash
npx supabase db push --include-locals 20260318_ecd_admin_multi_sessions.sql
```

## 2. Start the app
```bash
npm run dev
```

## 3. Test Scenarios

### A. First and second login (should succeed)
- Open two different browsers or two incognito windows.
- Log in as the same ECD Admin.
- Both should stay logged in and access `/ecd/dashboard`.

### B. Third login (should prune oldest)
- Open a third browser/incognito.
- Log in as the same ECD Admin.
- After login, the **first** browser’s session should be pruned.
- Navigating to any `/ecd/*` page in the first browser should redirect to `/ecd/login?error=session_revoked`.

### C. Verify Sessions page
- In any active admin session, go to `/ecd/sessions`.
- You should see at most 2 sessions.
- The most recent session is marked **Current**.
- Click **Revoke** on the non‑current session → it disappears immediately.
- Trying to revoke the **Current** session should be disabled.

### D. Non‑admin access
- Log in as a non‑admin (parent/staff).
- Visit `/ecd/sessions` → should show “Access Restricted”.

### E. Edge: Revoking all but current
- With 2 active sessions, revoke the non‑current one.
- Only the current session remains.
- Any new login will prune the current (since it’s the only one).

## 4. Expected DB State
```sql
SELECT user_id, device_hint, created_at, last_seen_at
FROM public.user_sessions
WHERE user_id = '<admin_uuid>'
ORDER BY created_at DESC;
-- Should show ≤2 rows for ECD Admins.
```

## 5. Middleware Logs (optional)
Add a temporary console.log in `lib/middleware-ecd-device-limit.ts` to see redirects:
```ts
console.log('[ECD Device Limit] userId:', user.id, 'isValid:', isValid)
```

## 6. Cleanup (if needed)
```sql
DELETE FROM public.user_sessions WHERE user_id = '<admin_uuid>';
```

---

When you’re ready, run the migration and start the dev server to test the above flows.
