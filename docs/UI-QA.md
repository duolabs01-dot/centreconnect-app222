# UI QA Checklist

Use this checklist after major UI changes to prevent regressions and overlapping layouts.

## Global
- [ ] No text overlap at `320px`, `375px`, `768px`, `1024px`, and `1440px`.
- [ ] Header/nav items do not wrap into each other on mobile.
- [ ] Card radius, border, and shadow feel consistent (`rounded-xl`, subtle border, low shadow).
- [ ] Vertical rhythm is consistent (`Section` spacing + predictable card padding).
- [ ] Buttons have clear hierarchy (primary vs outline vs ghost) and equal heights in grouped actions.

## Parent-Facing Pages
- [ ] `/` Home: hero content stacks cleanly on mobile, onboarding widget does not clip, CTAs remain visible.
- [ ] `/directory`: filter row wraps cleanly; cards have no clipped text; empty state is centered and readable.
- [ ] `/centre/[slug]`: tabs scroll horizontally on small screens; sidebar stacks under content on mobile.
- [ ] `/centre/[slug]`: sticky mobile Apply CTA does not hide important content and respects bottom safe area.
- [ ] `/apply/[centreId]`: form fields align, validation messages do not shift layout abruptly.
- [ ] `/login` and `/register`: no field overlap, password eye button stays inside input bounds.
- [ ] `/parent/dashboard`: stat cards and activity feed stack cleanly on mobile; no cramped action buttons.

## ECD OS Pages
- [ ] `/ecd/dashboard`: table is horizontally scrollable on smaller widths; filter controls do not collide.
- [ ] `/ecd/dashboard`: profile completeness widget keeps progress bar and checklist aligned.
- [ ] `/ecd/applications`: tabs and filters stay usable on tablet and desktop.
- [ ] `/ecd/profile`, `/ecd/announcements`, `/ecd/calendar`, `/ecd/support`, `/ecd/billing`: empty states are clear and actionable.
- [ ] Desktop sidebar (ECD): active item state is obvious; no clipping at 1280px+.

## Loading + Empty States
- [ ] Directory and applications skeletons resemble final layout proportions.
- [ ] Empty states include a clear next action where relevant.
- [ ] No layout jump larger than one card height when data loads.

## Interaction Quality
- [ ] Page transitions are subtle and fast (no jank).
- [ ] Toasts appear for key actions and do not block primary controls.
- [ ] Enrolled success moment is brief and tasteful.
- [ ] Parent bottom nav tabs are evenly spaced and icons are visually centered.

## Visual Regression
- [ ] Capture before/after screenshots at `375px` and `1440px` for:
- [ ] `/`
- [ ] `/directory`
- [ ] `/parent/dashboard`
- [ ] `/parent/applications`
- [ ] `/parent/profile`
- [ ] `/parent/notifications`
- [ ] Verify no unintended color/spacing/typography drift.
- [ ] Verify signed-out users do not see bottom nav on public routes.

## Build/Verification
- [ ] `npm run build` passes.
- [ ] Critical routes open without runtime errors in dev and production builds.
- [ ] `npm run smoke:parent` passes with dev server running on `3010`.
