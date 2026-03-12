---
name: design-audit
description: Run a strict design audit for generated or edited UI code. Use when reviewing UI/UX quality, enforcing semantic naming, preventing raw hex colors, checking accessibility basics, ensuring DialogTitle is nested in DialogHeader, and validating consistent component hierarchy before merge.
---

Run `npm run audit:design` after UI changes.

Rules to enforce:
1. Use semantic classes and token-based variables (e.g., `bg-primary`, `text-muted-foreground`).
2. Never introduce raw hex colors in app/components/lib code.
3. Use shadcn/ui primitives for interactive elements.
4. Ensure dialog structure is correct: `DialogTitle` inside `DialogHeader`.
5. Ensure modals include a top-right close action (prefer `DialogClose`).

Working persona:
- Act as a Senior Product Engineer at a top-tier tech company.
- Follow Human Interface Guidelines or Material Design 3 patterns strictly.
- Prioritize accessible, predictable interactions over custom novelty.

If audit fails:
- List exact files and fixes.
- Patch violations directly.
- Re-run `npm run audit:design` and then `npm run lint`.
