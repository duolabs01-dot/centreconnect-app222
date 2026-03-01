# CentreConnect — Workspace Rules
# Always loaded. Every agent. Every session.

## What This Product Is
CentreConnect is a South African SaaS platform with three distinct user portals:
- **Parent Portal** (`/parent/*`, `/directory`) — Parents find, apply to, and track their children's ECD applications
- **ECD Portal** (`/ecd/*`) — Early Childhood Development centre owners manage admissions, attendance, daily reports, compliance, billing
- **Admin Portal** (`/admin/*`) — Platform operator manages centres, revenue, support

The business is pre-revenue / early launch. Real users are starting to onboard. Every change you make will be seen by actual parents and teachers.

## Tech Stack (Never Deviate)
- **Next.js 15** with App Router — Server Components by default, `'use client'` only when necessary
- **Supabase** — Auth, database (PostgreSQL), RLS for all tables
- **Tailwind CSS** — No inline styles except for dynamic values (colors, transforms)
- **framer-motion v12** — Already installed. Use for animations, never raw CSS transitions for complex motion
- **Shadcn/UI primitives** — `components/ui/*`. Never replace these with raw HTML
- **TypeScript** — Strict. No `any` unless existing code already uses it
- **Resend** — Email sending via `lib/email/send.ts`. Never use SMTP directly

## Design System Rules (Critical)
- **Border radius standard**: `rounded-2xl` (16px) for cards/overlays. `rounded-xl` for inputs/buttons. `rounded-full` for pills/avatars
- **Shadow standard**: `shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)]` for elevated surfaces
- **Colour palette**: Teal/cyan (`#0891b2`, `#0d9488`) = primary brand. Slate grays for text. Rose for destructive. Amber for warnings
- **Parent portal font**: Nunito (`--font-parent`)
- **ECD portal font**: DM Sans (`--font-ecd`)
- **Never use** raw `<img>` — always `next/image`
- **Never hardcode** z-index above `z-[200]` (bottom nav lives there)

## Architecture Rules
- Server Actions live in `lib/actions/**/*.ts`. Never put DB calls in route handlers when a server action will do
- `createClient()` = user-scoped Supabase client. `createAdminClient()` = service role (only in server actions and API routes, never in components)
- RLS is the security layer. Never disable it. Never use `createAdminClient()` in a client component
- `loading.tsx` is required for every route that fetches data
- `error.tsx` is required for every portal section

## What NOT to Do
- Never break existing RLS policies when adding features
- Never add `export const dynamic = 'force-dynamic'` to parent portal pages (they need ISR)
- Never replace the `BottomNav` component — it uses framer-motion spring physics; keep it
- Never add more Google Fonts — use the 4 already loaded (`Plus_Jakarta_Sans`, `Inter`, `Nunito`, `DM_Sans`)
- Never create new globals.css — one exists at `app/globals.css`

## QA Mindset
Before marking any task done, ask yourself:
1. Does this break the mobile experience? (Most parents use phones)
2. Does this work offline or degrade gracefully? (Rural SA has patchy connectivity)
3. Will an ECD teacher with basic phone literacy understand this? (Not all users are tech-savvy)
4. Could this accidentally expose one parent's data to another? (POPIA compliance)
5. Does this add meaningful value, or is it cosmetic noise?
