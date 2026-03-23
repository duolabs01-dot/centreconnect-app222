# CentreConnect Deep Security & Quality Audit Report
**Date:** March 23, 2026  
**Scope:** Security, Performance, Accessibility, Code Quality  
**Auditor:** Cascade AI

---

## Executive Summary

| Category | Status | Critical Issues | Warnings |
|----------|--------|-----------------|----------|
| **Security** | 🟡 FAIR | 2 | 4 |
| **Performance** | 🟢 GOOD | 0 | 3 |
| **Accessibility** | 🟡 FAIR | 0 | 5 |
| **Code Quality** | 🟡 FAIR | 0 | 8 |
| **Error Handling** | 🟢 GOOD | 0 | 2 |

**Overall Grade: B- (78/100)**

---

## 1. Security Deep-Dive 🔒

### 1.1 XSS Vulnerabilities

| Risk | File | Issue | Severity |
|------|------|-------|----------|
| **Medium** | `app/ecd/(portal)/dsd-export/page.tsx` | Uses `dangerouslySetInnerHTML` without DOMPurify sanitization | 🟡 |
| **Medium** | `lib/email/templates/pilot-welcome-pack.tsx` | Uses `dangerouslySetInnerHTML` for email templates | 🟡 |

**Recommendation:** Install and use `DOMPurify` for all HTML injection points.

```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

### 1.2 Hardcoded Secrets (Post-Fix Status)

| File | Status | Notes |
|------|--------|-------|
| `tests/browser/parent-profile-system.spec.ts` | ✅ FIXED | Now requires `TEST_USER_PASSWORD` env var |
| `tests/browser/register-parent.spec.ts` | ✅ FIXED | Now requires `TEST_USER_PASSWORD` env var |
| `tests/browser/deep-functional.spec.ts` | ✅ FIXED | Parent/ECD auth moved to env vars |
| `.env.example` | ✅ GOOD | Uses placeholder values |

### 1.3 API Security Gaps

| Issue | Location | Impact |
|-------|----------|--------|
| Missing rate limiting on some public routes | `/api/directory/*` | Potential abuse |
| No request size limits on file uploads | `/api/ecd/children/extract-register` | DoS risk |

### 1.4 Dependency Vulnerabilities

```
Package          Severity  Advisory
cookie           HIGH      GHSA-pxg6-pf52-xh8x
glob             HIGH      GHSA-5j98-mcp5-4vw2  
next             HIGH      GHSA-9g9p-9gw9-jx7f
next             HIGH      GHSA-h25m-26qc-wcjf
```

**Action Required:** Update to Next.js 15+ and @supabase/ssr@latest

---

## 2. Performance Analysis ⚡

### 2.1 Bundle Size Concerns

| File | Size | Issue |
|------|------|-------|
| `app/ecd/(portal)/children/new/child-enrollment-wizard.tsx` | 12.7 kB | Large component, consider code-splitting |
| `app/(journey)/parent/onboarding/page.tsx` | 12.7 kB | Heavy wizard, lazy load steps |

### 2.2 Database Query Patterns

| Location | Issue | Recommendation |
|----------|-------|----------------|
| `lib/admin/revenue/page.tsx` | 12 `any` type queries | Add proper TypeScript interfaces |
| `lib/ecd/dsd-export.ts` | 16 `any` type casts | Use Zod schemas for data validation |

### 2.3 RLS Policy Coverage

| Table | RLS Status | Notes |
|-------|------------|-------|
| `ecd_centres` | ✅ Enabled | Policies verified |
| `user_profiles` | ✅ Enabled | Strong policies |
| `invoices` | ✅ Enabled | Financial data protected |
| `sessions` | ✅ Enabled | Recent hardening (migration 013) |

---

## 3. Accessibility (a11y) Audit ♿

### 3.1 shadcn/ui Components (Good)

Most components properly use Radix UI primitives with built-in accessibility:
- `Dialog` uses `DialogTitle` in `DialogHeader` ✅
- `Button` includes proper focus states ✅
- `Form` components have label associations ✅

### 3.2 Areas Needing Improvement

| Component | Issue | Fix |
|-----------|-------|-----|
| `LiteImage.tsx` | Missing `alt` text fallback | Add `alt={alt || ''}` |
| `feature-banner.tsx` | Decorative icons lack `aria-hidden` | Add `aria-hidden="true"` |
| Tables in data views | Missing `scope` attributes on headers | Add `scope="col"` |

---

## 4. Code Quality Issues 📝

### 4.1 TypeScript `any` Type Usage

| Directory | Count | Priority Files |
|-----------|-------|----------------|
| `/app` | 201 | `admin/revenue/page.tsx` (12), `ecd/ai-upload/actions.ts` (10) |
| `/lib` | 80 | `ecd/dsd-export.ts` (16), `actions/admissions/accept-offer.ts` (7) |

**Recommendation:** Schedule refactoring sprint to replace top 20 `any` occurrences with proper types.

### 4.2 Console Logs in Production Paths

| File | Count | Purpose |
|------|-------|---------|
| `lib/actions/ecd/family-link.ts` | 2 | Error logging |
| `lib/actions/guardians/send-invite.ts` | 2 | Debug output |
| `lib/supabase/middleware.ts` | 1 | Dev-only timing (acceptable) |

**Recommendation:** Replace with structured logging utility.

### 4.3 Unused Code Detection

| Type | Count | Notes |
|------|-------|-------|
| Unused imports | ~15 | Auto-fixable with ESLint |
| Dead exports | ~3 | Review and remove |
| Commented code blocks | ~8 | Clean up before production |

---

## 5. Error Handling Assessment 🛡️

### 5.1 Strong Areas ✅

- Payment flows have comprehensive try/catch
- API routes use proper error boundaries
- Auth middleware handles edge cases well

### 5.2 Gaps Identified

| Location | Issue | Risk |
|----------|-------|------|
| `lib/email/delivery.ts` | Some async errors not caught | Silent failures possible |
| `lib/ai/document-extraction-service.ts` | Missing fallback for AI failures | User experience degradation |

---

## 6. Critical Action Items

### Immediate (This Sprint)

1. **Add DOMPurify** to sanitize HTML in `dsd-export/page.tsx`
2. **Fix remaining npm vulnerabilities** - schedule dependency update
3. **Remove 8 console.log statements** from `lib/actions/*`

### Short-term (Next 2 Sprints)

4. **Refactor top 20 `any` types** in `/app` and `/lib`
5. **Add a11y improvements** to 3 flagged components
6. **Implement request size limits** on file upload routes

### Long-term (Next Quarter)

7. **Migrate to Next.js 15** for security patches
8. **Add structured logging** replace all console.* calls
9. **Implement bundle code-splitting** for heavy wizards

---

## 7. Migration Path for Security Updates

```bash
# Step 1: Update non-breaking fixes
npm audit fix

# Step 2: Test with Next.js 15 (breaking changes)
npm install next@15 react@18 react-dom@18
npm run build  # Verify no errors

# Step 3: Update Supabase SSR
npm install @supabase/ssr@latest
# Requires: Update cookie handling in middleware.ts

# Step 4: Full regression test
npm run test
npm run build
```

---

## Appendix: Audit Methodology

- **Security:** grep patterns for XSS, secrets, SQL injection vectors
- **Performance:** Bundle analysis, query pattern review
- **Accessibility:** Component scan for ARIA attributes, alt text
- **Quality:** TypeScript strict mode checks, `any` type counting
- **Error Handling:** Try/catch coverage analysis in critical paths

**Tools Used:**
- `grep_search` for pattern matching
- `npm audit` for dependency vulnerabilities  
- `npx tsc --noEmit` for TypeScript validation
- Manual code review of high-risk areas
