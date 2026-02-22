# UI Guidelines

## Purpose
Unified baseline for CentreConnect so all pages share the same spacing rhythm, typography, components, and responsive behavior.

## Core Primitives
- `Container`: `components/layout/container.tsx`
  - Always use for page-width control: `max-w-7xl`, `px-4 sm:px-6 lg:px-8`.
- CSS utility classes (from `app/globals.css`):
  - `.cc-container`
  - `.cc-section`
  - `.cc-card`
  - `.cc-muted`

## Typography Scale
- `h1`: `text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight`
- `h2`: `text-2xl sm:text-3xl font-semibold tracking-tight`
- `h3`: `text-lg font-semibold`
- Body: `text-sm` or `text-base`
- Secondary: `text-slate-600`

## Spacing Rules
- Section rhythm: `.cc-section` (`py-8 sm:py-10 lg:py-12`)
- Default grid/card gaps: `gap-4`
- Tight groups: `gap-2`
- Card border/surface: `border-slate-200`, `bg-white`
- Avoid arbitrary one-off margins unless needed for readability.

## shadcn Components (Phase 1)
- Existing and standardized:
  - `Button`, `Card`, `Input`, `Label`, `Textarea`, `Tabs`, `Select`
- Added in Phase 1:
  - `Badge` (`components/ui/badge.tsx`)
  - `Dialog` (`components/ui/dialog.tsx`)
  - `Sheet` (`components/ui/sheet.tsx`)
  - `Table` (`components/ui/table.tsx`)
  - `Skeleton` (`components/ui/skeleton.tsx`)
  - `Toast` (`components/ui/toast.tsx`, `components/ui/toaster.tsx`, `components/ui/use-toast.ts`)

## Motion
- Use `framer-motion` only for subtle transitions.
- Standard wrapper: `FadeIn` (`components/ui/fade-in.tsx`)
  - small `y` offset
  - short duration (`~0.35s`)
  - once-per-view
- Do not animate critical actions or create layout shifts.

## Responsive Rules (Mobile First)
- Start single-column, scale to multi-column at `sm`/`md`/`lg`.
- No fixed-width text blocks inside narrow containers.
- Tables must use horizontal scrolling wrappers (`Table` already wraps `overflow-auto`).
- Action controls should wrap (`flex-wrap`) and maintain tap target height (`h-10` minimum, prefer `h-11`/`h-12`).

## Page Consistency Rules
- Use `Container` at page and major section boundaries.
- Keep header/nav spacing consistent across `/`, `/for-centres`, `/directory`, and dashboard shells.
- Use `Badge` for compact status labels instead of ad-hoc pill classes.
- Use `Skeleton` for loading placeholders instead of custom repeated blocks.

## Portal Guidance
- Parent pages:
  - card-first, simple actions, clear status surfaces
  - larger tap targets, minimal dense data
- ECD pages:
  - operational density allowed on desktop
  - use `Table` and structured cards for workflows
  - keep mobile overflow safe (no overlap/truncation bugs)
