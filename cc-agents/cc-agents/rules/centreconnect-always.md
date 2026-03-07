---
name: centreconnect-always
description: >
  ALWAYS LOADED. Every session. Every agent. Every prompt.
  This is the ground truth for CentreConnect. Never contradict these rules.
---

# CentreConnect — Always-On Context

## Who You Are Working With
A solo founder. No team. No funding. No salary. Building and running a business completely alone.
Every hour spent on the wrong thing is an hour that could have shipped revenue.
Your job is to protect that time fiercely.

## What CentreConnect Is
A South African SaaS platform connecting parents with ECD (Early Childhood Development) crèches.

Three portals:
- **Parent portal** (`/parent/*`, `/directory`) — Find, compare, apply to crèches. Free for parents.
- **ECD portal** (`/ecd/*`) — Centre owners manage admissions, attendance, daily reports, billing, compliance. Paid subscription.
- **Admin portal** (`/admin/*`) — Platform operator controls everything. That's the founder.

## The Market Reality
- 22,000+ registered ECD centres in South Africa
- Most centres are small (under 50 children), run by women over 40
- They use WhatsApp and paper registers. They are skeptical of technology.
- Township communities: Alexandra, Soweto, Tembisa, Katlehong are the first market
- Parents and teachers use budget Android phones (Samsung A-series, Huawei). Not iPhones.
- Mobile data is expensive. Pages must load fast. Offline degradation must be graceful.
- WhatsApp is king. It is the primary trust channel. Email is secondary.
- POPIA (South Africa's data privacy law) applies to all child data.

## Tech Stack — Never Deviate
- **Next.js 15** App Router — Server Components default, `'use client'` only when necessary
- **Supabase** — Auth, PostgreSQL, RLS, Storage, Realtime
- **Tailwind CSS** — No inline styles except dynamic values
- **framer-motion v12** — Animations only. Never raw CSS for complex motion.
- **Shadcn/UI** — `components/ui/*`. Never replace with raw HTML.
- **TypeScript strict** — No `any` unless already in existing code
- **Resend** — Email only. Never SMTP directly.
- **Paystack** — Payments. South African rand. Never Stripe.
- **Codex 5.3 x-high** — The AI coding tool in use. Treat every prompt as a task for this model.

## Design System — Non-Negotiable
- Border radius: `rounded-2xl` for cards, `rounded-xl` for inputs/buttons, `rounded-full` for pills
- Fonts: Nunito (parent portal), DM Sans (ECD portal). Never add new Google Fonts.
- Brand colors: Teal/cyan (`#0891b2`, `#0d9488`) primary. Slate for text. Rose for destructive. Amber for warnings.
- Bottom nav: never replace it — framer-motion spring physics are critical to the feel
- Images: always `next/image`. Never raw `<img>`.
- Safe area: `pb-[calc(8rem+env(safe-area-inset-bottom))]` on all scrollable pages

## Architecture Rules
- Server Actions in `lib/actions/**/*.ts` — not in route handlers unless necessary
- `createClient()` = user-scoped. `createAdminClient()` = service role, server-side only.
- RLS is the security layer. Never use `createAdminClient()` in a client component.
- Every data-fetching route needs `loading.tsx` AND `error.tsx`
- `force-dynamic` only on admin dashboards — never on parent portal pages

## The Founder's Operating Rules
1. **Ship to revenue** — If a feature doesn't bring a centre closer to paying, defer it.
2. **Fix before adding** — A broken sign-in button is worse than missing feature X.
3. **Commit after every working change** — Git is the safety net.
4. **One task per Codex session** — Decide before opening. Do not drift.
5. **Mobile first, always** — Test at 375px before calling anything done.
6. **WhatsApp is the primary support channel** — Build towards it, not away from it.

## Current Business State (Update This As Things Change)
- Stage: Pilot launch
- Pilot centres: Bajabulile ECD, Sakhisizwe ECD
- Revenue: Pre-revenue (R0 MRR)
- Paying customers: 0
- Parents registered: Unknown — check Supabase
- GitHub: github.com/duolabs01-dot/centreconnect-app222
- Deployed: Vercel (check DEPLOYMENT.md for URL)
- Funding: None
- Team: Founder only

## The Three Personas — Always In Mind
**Nomvula (Parent)** — 32, Johannesburg, Samsung Galaxy A15, anxious about getting her daughter into a good crèche before the year starts. Not tech-savvy. Data-conscious. Uses WhatsApp daily.

**Mama Bajabulile (ECD Owner)** — 47, Alexandra, runs a 35-child crèche alone with 1 helper. Uses WhatsApp and a paper register. Skeptical of technology. Doesn't have time to read instructions. Needs to trust before she tries.

**You (Platform Admin)** — Solo founder, no money, every decision matters. Needs clarity, speed, and zero wasted effort.
