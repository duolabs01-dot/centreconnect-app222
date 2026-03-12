# Design System Standardization Plan (P0/P1/P2)

## Working Persona
You are a Senior Product Engineer at a top-tier tech company.
Follow Human Interface Guidelines or Material Design 3 strictly.

## Non-negotiables
1. No raw hex colors in product UI code.
2. Use semantic tokens/classes (`bg-primary`, `text-muted-foreground`, `border-border`, etc.).
3. Use shadcn/ui primitives for interactive components.
4. Dialogs must use `DialogHeader > DialogTitle > DialogDescription` and include a top-right close action.

## Inspiration synthesis
Based on:
- component.gallery (design systems + component taxonomies)
- shadcnstudio and shadcn/ui ecosystem
- Tailwind token-driven utility patterns
- token-driven design article (shadcn + Tailwind + design tokens)

The common pattern is consistent:
- token-first system
- composable primitives
- strict component hierarchy
- explicit state/empty/error patterns

## P0 (now)
- Introduce `npm run audit:design` (done)
- Create reusable skill contracts for design and interaction logic (done)
- Remove parent search/discover from bottom nav for enrolled users (done)
- Add global transition baseline (done)

## P1 (next)
- Migrate top 10 high-traffic pages from literal classes/colors to semantic tokens
- Standardize dialogs to shadcn canonical structure
- Introduce spacing scale guardrails (`p-4/p-6`, `gap-2/gap-4/gap-6`) in design audit checks

## P2 (next level)
- Add visual regression snapshots for parent + ECD shells
- Add accessibility checks (contrast + focus states) into CI
- Introduce component usage scorecard: primitive reuse vs one-off UI

## Immediate hotspots from audit
- Auth pages (`app/(auth)/login`, `app/(auth)/register`)
- Journey pages (`app/(journey)/page.client`, directory/discover)
- Centre detail surfaces (`app/c/[slug]/*`)
- Admin and ECD custom theme files

## Outcome goal
A product UI that feels coherent, predictable, and premium — with less visual drift and faster feature shipping.
