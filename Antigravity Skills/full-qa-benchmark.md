---
name: full-qa-benchmark
description: >
  Comprehensive quality pass across the entire CentreConnect codebase.
  Run with /full-qa-benchmark.
  Covers: UI consistency, performance, security, accessibility, business logic.
  Produces a scored report with prioritised fixes.
---

# Full QA Benchmark Pass

Run this when you need a complete health check of the product. Expect this to take significant time. Be thorough.

## Benchmark Categories and Scoring

Each category is scored 0-100. Target: every category ≥ 80 before launch.

---

### Category 1: Performance (target: ≥85)

Check every route for:
```bash
# Find routes missing loading.tsx
find app -name "page.tsx" | while read page; do
  dir=$(dirname "$page")
  if [ ! -f "$dir/loading.tsx" ]; then echo "MISSING loading: $dir"; fi
done

# Find raw <img> tags (should be 0)
grep -rn "<img " app components --include="*.tsx" | grep -v "next/image"

# Find sequential awaits that should be parallelised
grep -rn "await supabase" app lib --include="*.ts" --include="*.tsx" | grep -v "// parallel"
```

Score deductions:
- -5 per missing loading.tsx
- -10 per raw `<img>` tag
- -8 per sequential DB query that could be parallelised
- -15 if bottom nav flash bug is still present
- -20 if PageTransition double-animates

---

### Category 2: Security (target: ≥95)

Check every server action for:
```bash
# Server actions that don't verify user ownership
grep -rn "getUser\|getSession" lib/actions --include="*.ts" | wc -l
# Compare to:
find lib/actions -name "*.ts" | wc -l
# Every action file should have at least one auth check
```

Manual checks:
- [ ] Every server action calls `supabase.auth.getUser()` before any mutation
- [ ] `createAdminClient()` never imported in client components
- [ ] Invite tokens are single-use (nulled after accept)
- [ ] File upload size limits enforced
- [ ] Rate limiting on auth endpoints

Score deductions:
- -30 per server action missing auth check
- -20 per client component using admin client
- -15 per reusable invite token
- -10 per missing rate limit on public endpoint

---

### Category 3: UI Consistency (target: ≥80)

Check design system adherence:
- [ ] All cards use `rounded-2xl` (not `rounded-lg`, `rounded-md`, `rounded-sm`)
- [ ] All dialogs use the same shadow/radius/overlay
- [ ] All sheets use the same width/padding
- [ ] All dropdowns use `rounded-2xl` items
- [ ] All inputs use `rounded-xl` with cyan focus ring
- [ ] No hardcoded hex colors outside of design tokens
- [ ] `hover-lift` defined and working on buttons
- [ ] `shadow-card` and `shadow-float` defined in tailwind.config

Score deductions:
- -5 per component with inconsistent border radius
- -10 if `hover-lift` is undefined (affects all buttons)
- -10 if `shadow-card`/`shadow-float` are undefined (affects all surface cards)
- -8 per overlay (dialog/sheet/dropdown) with inconsistent styling
- -15 if root globals.css duplicate still exists

---

### Category 4: Accessibility (target: ≥75)

Check using browser agent:
- Run Lighthouse on `/parent/dashboard`, `/ecd/dashboard`, `/directory`
- Check accessibility score (target ≥75)
- Manually verify: tab order, focus indicators, label associations, colour contrast

Score deductions:
- -10 if Lighthouse accessibility < 75
- -5 per form field missing a `<label>`
- -8 if bottom nav items missing `aria-label`
- -10 if colour contrast fails WCAG AA for body text

---

### Category 5: Business Logic Correctness (target: ≥90)

Verify critical flows:
- [ ] Parent can submit application → ECD receives it → ECD approves → Parent sees enrolled
- [ ] ECD can log attendance for all enrolled children
- [ ] Daily report published by teacher → parent notification sent → parent sees report
- [ ] Pickup code generated → driver scans → child marked as picked up
- [ ] Co-parent invite → email sent → invite accepted → co-parent sees same data as primary parent
- [ ] Guardian added → shows in ECD application detail view

Score deductions:
- -20 per broken core flow (application, attendance, daily reports)
- -10 per broken notification pathway
- -15 if co-parent sees primary parent's other children's data (privacy issue)
- -10 per missing edge case handling (empty states, errors)

---

### Category 6: Mobile UX (target: ≥85)

Open browser agent. Navigate to each main view at 375px:
- `/parent/dashboard`
- `/parent/applications`
- `/ecd/dashboard`
- `/ecd/applications`
- `/directory`

Check each:
- [ ] Bottom nav visible and not obscuring content
- [ ] All tap targets ≥44px
- [ ] No horizontal scroll at 375px
- [ ] Sheets open/close without layout shift
- [ ] Forms scroll correctly when keyboard opens

Score deductions:
- -20 if bottom nav obscures content on any screen
- -5 per tap target below 44px
- -15 if any core page has horizontal scroll at 375px
- -10 per broken sheet interaction

---

## Benchmark Report Format

Produce a report in this format:

```
# CentreConnect QA Benchmark Report
Date: [date]
Version: [git commit or zip date]

## Scores
Performance:        [X/100]
Security:           [X/100]
UI Consistency:     [X/100]  
Accessibility:      [X/100]
Business Logic:     [X/100]
Mobile UX:          [X/100]

Overall:            [X/100]

## Status: [PASS ≥80 average | CONDITIONAL 70-79 | FAIL <70]

## Critical Issues (fix before launch)
1. [Issue] — [Impact] — [Fix]

## Major Issues (fix within 1 week)
1. [Issue] — [Impact] — [Fix]

## Minor Issues (fix this sprint)
1. [Issue] — [Impact] — [Fix]

## What's Working Well
- [Genuine strengths to preserve]
```
