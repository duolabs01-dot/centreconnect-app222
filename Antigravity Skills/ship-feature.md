---
name: ship-feature
description: >
  End-to-end workflow for implementing a new feature from planning to production-ready code.
  Run with /ship-feature [feature description].
  Steps: plan → architect → implement → QA → polish → verify.
---

# Ship Feature Workflow

You are orchestrating a complete feature implementation. Work through each phase in order. Do not skip phases.

## Phase 1: Product Decision (product-strategist)
Before writing a single line of code, answer:
- What real user pain does this solve?
- What is the minimum V1 scope?
- What does success look like in numbers?
- What is the sequencing dependency?

If the feature doesn't pass this gate, STOP and explain why.

## Phase 2: Architecture Plan (architect-agent)
Design the complete technical approach:
- Database schema changes (SQL migrations)
- RLS policies
- Server actions signatures
- Component tree
- Performance and caching strategy

Output a written plan before starting implementation.

## Phase 3: Implementation
Work top-down:
1. Database migration (if needed)
2. Server actions (`lib/actions/`)
3. Page server component (data fetching)
4. UI components (interactive parts)
5. loading.tsx skeleton
6. error.tsx handling

At each step: run `npx tsc --noEmit` to catch type errors before moving on.

## Phase 4: QA Pass (qa-agent)
Run the full QA checklist:
- Functional correctness (happy path + sad path)
- Security (RLS, ownership validation)
- Mobile UX (375px, bottom nav, tap targets)
- Performance (loading states, no waterfalls)
- User reaction prediction for all three personas

## Phase 5: UI Polish (ui-ux-agent)
Final visual review:
- Consistent with design system
- Spacing, typography, color correct
- Animations feel native
- Empty and error states designed
- Three-user reaction simulation

## Phase 6: Final Verification
```bash
npx tsc --noEmit
npx next build 2>&1 | tail -20
```

Open in browser agent: test the feature at 375px mobile width. Record outcome.

## Delivery
Output a summary:
- What was built
- What was intentionally deferred to V2
- Known limitations
- QA verdict (SHIP IT / SHIP WITH FIXES / DO NOT SHIP)
