---
name: production-security
description: >
  Security checklist for CentreConnect production. Covers POPIA compliance for
  child data, secrets management, git hygiene, pre-push verification, and
  incident response for leaked credentials. Load before any deployment or
  security-sensitive work.
---

# Production Security — CentreConnect

## 1. POPIA Compliance Checklist (Child Data)

### Data Handling
- [ ] All child records are scoped to `ecd_id` via RLS — never expose across tenants
- [ ] Parent PII (name, phone, email) is only readable by the linked ECD centre and the parent themselves
- [ ] Child medical data (allergies, conditions) is never exposed to other parents or public APIs
- [ ] Attendance data is scoped per-centre — no cross-centre attendance queries exist
- [ ] Application data containing child details is filtered by `ecd_id` and `parent_id`

### Consent Flows
- [ ] Parent consent checkbox exists on the application form before any data is submitted
- [ ] T&Cs link is functional and up to date (check `/terms` and `/privacy`)
- [ ] Data deletion request path exists (even if manual via support ticket)
- [ ] ECD centre owners accepted T&Cs during onboarding

### RLS Verification
- [ ] Every table with PII has RLS enabled — run: `SELECT tablename FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity;`
- [ ] No `createAdminClient()` calls exist in any client component — run: `grep -rn "createAdminClient" --include="*.tsx" app/ components/ | grep "'use client'"`
- [ ] Service role key is never used in API route handlers that face the public
- [ ] Test: log in as parent A, confirm you cannot see parent B's children

### Breach Protocol
1. Immediately rotate the compromised credential
2. Check `git log` for when the credential was first committed
3. Audit Supabase logs for unauthorized access during exposure window
4. Notify affected users if PII was potentially accessed
5. Document in `tasks/lessons.md`
6. File POPIA breach notification if required (within 72 hours)

## 2. Secrets Management Rules

### Never-Do List
- ❌ Never hardcode API keys, JWTs, or passwords in source files
- ❌ Never commit `.env` files (only `.env.example` with placeholder values)
- ❌ Never log secrets to console, even in development
- ❌ Never pass secrets as URL query parameters

### Always-Do List
- ✅ Use `process.env.VARIABLE_NAME` for all secrets
- ✅ Keep `.env.example` updated with placeholder keys (e.g. `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here`)
- ✅ Rotate keys every 90 days or immediately after any suspected exposure
- ✅ Use Vercel environment variables for production — never hardcode in `vercel.json`

### Key Inventory
| Secret | Location | Rotation Schedule |
|--------|----------|-------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | `.env` / Vercel | Every 90 days |
| `SUPABASE_URL` | `.env` / Vercel | On Supabase project change |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env` / Vercel | On Supabase project change |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env` / Vercel | Every 90 days |
| `PAYSTACK_SECRET_KEY` | `.env` / Vercel | Every 90 days |
| `RESEND_API_KEY` | `.env` / Vercel | Every 90 days |
| `GOOGLE_CLIENT_ID` | `.env` / Vercel | On OAuth app change |
| `GOOGLE_CLIENT_SECRET` | `.env` / Vercel | On OAuth app change |

## 3. Git Security Hygiene

### Before Every Commit
```bash
# Check no secrets are staged
git diff --cached --name-only | xargs grep -l "eyJhbGci\|service_role\|sk_live\|sk_test" 2>/dev/null

# Verify .env is not tracked
git check-ignore -v .env

# Check no new .env files are staged
git diff --cached --name-only | grep -i "\.env"
```

### Pre-Commit Checklist
- [ ] `git status` shows no `.env` files
- [ ] No JWT patterns (`eyJhbGci`) in staged files
- [ ] No `service_role` references outside of `process.env.` patterns
- [ ] No raw API key strings in staged TypeScript/JavaScript files

## 4. Pre-Push Checklist for Founder

Run this every time before `git push`:

```bash
# 1. Secrets scan
grep -r "eyJhbGci" --include="*.ts" --include="*.tsx" --include="*.js" app/ lib/ scripts/ components/

# 2. Service role usage check
grep -r "service_role" --include="*.ts" --include="*.js" scripts/ | grep -v "process.env"

# 3. .env is gitignored
git check-ignore -v .env

# 4. Lint passes
npm run lint

# 5. Build passes
npm run build

# 6. No new client components using admin client
grep -rn "createAdminClient" --include="*.tsx" app/ components/ | head -5
```

## 5. Incident Response: Leaked Key Scenario

### Immediate Actions (First 15 Minutes)
1. **Revoke** the leaked key immediately in the provider dashboard (Supabase, Paystack, etc.)
2. **Generate** a new key in the provider dashboard
3. **Update** `.env` locally and in Vercel environment variables
4. **Redeploy** to production with `vercel --prod`
5. **Force-push** a commit that removes the key from git history if it was committed:
   ```bash
   # Use BFG Repo-Cleaner or git filter-branch
   bfg --replace-text passwords.txt
   git push --force
   ```

### Investigation (First Hour)
6. Check Supabase dashboard → Logs for any unauthorized requests during exposure
7. Check Paystack dashboard for unauthorized transactions
8. Review `git log --all --oneline` to find when the key was first exposed
9. Check if the repo was ever public (GitHub settings → Danger Zone)

### Documentation (Same Day)
10. Add entry to `tasks/lessons.md` with:
    - What leaked, when, how
    - Exposure window
    - Evidence of unauthorized access (or confirmed none)
    - Prevention measure added
11. Update this checklist if a new pattern is discovered

### Notification (If PII Accessed)
12. If evidence suggests PII was accessed:
    - Notify affected users within 72 hours (POPIA requirement)
    - File with Information Regulator if more than 100 records affected
    - Document notification in `tasks/lessons.md`
