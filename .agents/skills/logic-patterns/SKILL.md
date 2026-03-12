---
name: logic-patterns
description: Define and enforce reusable interaction logic patterns across features. Use when building or refactoring flows to standardize modal behavior, transitions, action hierarchy, empty states, and escalation patterns so UX stays consistent across parent, ECD, and admin surfaces.
---

Use these default interaction contracts:

1) Modal contract
- Include top-right close button.
- Include clear primary and secondary actions.
- Use `DialogHeader > DialogTitle > DialogDescription` hierarchy.
- Use subtle bounce/scale-in transition (respect reduced-motion settings).

2) Primary action contract
- One dominant action per surface.
- Secondary actions must not visually compete with primary action.

3) Empty state contract
- Explain why empty.
- Provide one clear next action.
- Avoid dead ends.

4) Escalation contract (admin)
- Show SLA levels (`>24h`, `>72h`).
- Show direct escalation link/runbook action.

5) Review/approval contract (bulk data imports)
- Always show confidence signal.
- Allow quick edit + remove.
- Never auto-commit without explicit user confirmation.

When adding new UI:
- Reuse existing shadcn/ui patterns first.
- Keep naming semantic (token classes, no literal color values).
- Keep behavior consistent with existing contracts.
