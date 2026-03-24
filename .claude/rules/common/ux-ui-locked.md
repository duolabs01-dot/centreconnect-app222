# UX/UI Locked Rules — CentreConnect
## Status: LOCKED. Do not change without explicit user instruction.

---

## Mobile-First Priority

**This app is used on phones. Mobile is the primary target. Desktop is secondary.**

- Fix mobile problems first, always.
- Never optimise desktop at the expense of mobile.
- Never add UI elements that consume screen space without a clear mobile justification.
- Before adding any new navigation element, ask: "Does this exist already on mobile?"

---

## ECD Portal Navigation (LOCKED)

### Mobile
- Navigation = **hamburger icon → Sheet drawer** (left side, dark)
- The Sheet drawer IS the sidebar on mobile. No separate bottom nav. No duplicate nav.
- Drawer background: `bg-slate-900` (matches desktop sidebar exactly)
- Nav items in drawer: same dark style as desktop — `bg-teal-500/15 text-teal-300` when active
- Hamburger button: `bg-white/10 text-slate-300` on the dark mobile header bar
- Mobile header bar: `bg-slate-900/95` with backdrop blur, `md:hidden`

### Desktop (md+)
- Fixed left sidebar, `w-[220px]`, `bg-slate-900`
- Sidebar is `hidden` on mobile (`md:fixed md:flex`)
- Group labels: Daily Ops | Management | Grow | Account

### What is FORBIDDEN
- No bottom tab bar on ECD pages
- No second/duplicate navigation component for ECD
- Do not increase sidebar width beyond 220px
- Do not revert sidebar to light/white theme

---

## Portal Colour Themes (LOCKED)

| Portal | Primary Nav Style |
|--------|-------------------|
| ECD    | Dark — `bg-slate-900`, teal accents (`text-teal-300`, `bg-teal-500/15`) |
| Parent | Light — white/card background, teal accents |
| Admin  | Dark — `bg-slate-900`, same as ECD |

---

## Data & Numbers — Zero Assumptions Rule

**NEVER hardcode, guess, or assume any number that comes from a database.**

- Boys/girls counts, attendance numbers, child totals — always read from the query result.
- If a number looks wrong, investigate the query. Do not patch by changing the display value.
- Confirmed real data for Bajabulile: 30 children total, 17 boys, 13 girls.
  This is not hardcoded — it is what the database should return after the data merge fix.

---

## PDF / DOE Export (LOCKED)

- `buildDsdPdfHtml()` in `lib/ecd/dsd-export-render.ts` is the **single source of truth** for the printed document.
- The Download PDF button opens a new window with HTML. It does **NOT** call `window.print()` or trigger any print dialog automatically.
- Instruction banner is shown in the window telling the user to press Ctrl+P → Save as PDF.
- Landscape pages (Annexure A) use `@page landscape` CSS — do not remove this.

---

## General UI Principles (LOCKED)

- Premium + futuristic + simple — dark backgrounds, teal accents, subtle glows, clean typography.
- No overcrowding. Space is a feature.
- Icons accompany labels in navigation — always.
- Consistency: if a pattern exists in one portal, apply it to all portals before introducing a new pattern.
- No emoji in nav items or UI chrome (only in support links / banners where already present).
