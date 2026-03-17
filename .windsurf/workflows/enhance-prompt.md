---
description: Enhance a rough product idea or user request into a comprehensive, implementation-ready prompt with UX, logic, copy, and acceptance criteria
---

# Prompt Enhancer Workflow

When the user provides a rough idea, feature request, or bug report, transform it into a structured, implementation-ready specification using the steps below.

## Step 1: Clarify Intent
- Identify what the user ACTUALLY wants (not just what they said)
- Separate the core request from nice-to-haves
- Note any implicit requirements (e.g. mobile-first, accessibility, data integrity)

## Step 2: Define the Problem Statement
Write a single paragraph that captures:
- **Who** is affected (ECD Admin, Parent, Staff, Supervisor)
- **What** is broken or missing
- **Why** it matters (business impact, user frustration, compliance risk)
- **Where** it happens (which page, flow, or API)

## Step 3: Write Acceptance Criteria
For each deliverable, write clear pass/fail criteria:
```
GIVEN [precondition]
WHEN [action]
THEN [expected result]
```

## Step 4: UX & Copy Specification
- Define the UI layout (which components, where they go)
- Write actual copy/labels (not placeholders like "Title goes here")
- Specify empty states, error states, loading states
- Note any animations or transitions
- Reference existing design patterns in the codebase (shadcn/ui, Tailwind, rounded-2xl cards, teal accent)

## Step 5: Data & Logic Layer
- Identify which tables/columns are affected
- Define any new queries, mutations, or RPC calls
- Specify validation rules and edge cases
- Note RLS policy implications

## Step 6: Prioritize & Sequence
Order the work into:
1. **Must-have** — Core functionality that solves the problem
2. **Should-have** — Improvements that make it feel polished
3. **Nice-to-have** — Extras that can wait for a future iteration

## Step 7: Output the Enhanced Prompt
Combine all sections into a single, actionable specification formatted as:

```markdown
## Feature: [Name]
### Problem
[Problem statement from Step 2]

### Acceptance Criteria
[From Step 3]

### UX Specification
[From Step 4]

### Data Layer
[From Step 5]

### Implementation Order
[From Step 6]

### Verification
- [ ] [Testable checklist items]
```

## Rules
- Never add features the user didn't ask for
- Always reference existing codebase patterns
- Keep copy simple — ECD admins are not developers
- Default to mobile-first responsive design
- Use the existing tech stack: Next.js, Supabase, Tailwind, shadcn/ui
- Prefer server components; use client components only when interactivity requires it
