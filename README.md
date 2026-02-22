# CentreConnect

CentreConnect is a Next.js 14 + Supabase application for ECD centre discovery, parent onboarding, and role-based dashboards.

## Prerequisites

- Node.js 20+
- npm 10+
- A Supabase project

## Environment Setup

1. Copy `.env.example` to `.env.local`.
2. Set these values in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
   - `NEXT_PUBLIC_APP_URL`
   - `PAYSTACK_SECRET_KEY` (server-side only)
   - `PAYSTACK_WEBHOOK_SECRET` (optional; defaults to `PAYSTACK_SECRET_KEY`)
   - `PAYSTACK_CALLBACK_URL` (optional)
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (optional, recommended for bot protection)
   - `TURNSTILE_SECRET_KEY` (optional, server-side only)
   - `UPSTASH_REDIS_REST_URL` (optional, enables distributed API rate limiting)
   - `UPSTASH_REDIS_REST_TOKEN` (optional, server-side only)

## Install and Run

```bash
npm install
npm run dev
```

Open `http://localhost:3010`.

The `dev` script performs a safe startup:
- Stops any stale process on port `3010`
- Starts Next.js on `3010`

Use this workflow for reliability and speed:
- Keep `npm run dev` running while you edit files (Next.js hot reload handles code changes).
- Use `npm run dev:restart` only if `3010` becomes unreachable.
- Use `npm run dev:clean` only when you need to clear `.next` cache for stubborn stale artifacts.
- Use `npm run dev:ensure` for a health-check + auto-recovery pass.

Security checks:
- `npm run lint` (includes form-standard guard)
- `npm run audit:high` (fails on high/critical production dependency vulnerabilities)
- `npm run security:ci` (lint + dependency audit)

## Build and Production Run

```bash
npm run build
npm run start
```

If PowerShell blocks `npm` script execution on your machine, use:

```powershell
npm.cmd run build
npm.cmd run dev
```

## Auth and Route Behavior

- Public routes: `/`, `/login`, `/register`
- Protected routes:
  - `/parent/*` requires `parent_user`
  - `/ecd/*` requires `ecd_admin` or `ecd_staff`
  - `/admin/*` requires `platform_admin`
- Unauthenticated users on protected routes are redirected to `/login?next=<path>`.
- Authenticated users visiting `/login` or `/register` are redirected to their role dashboard.

## QA Checklist

See `docs/QA.md` for a full validation checklist.

For Admin production hardening and billing-completion roadmap, see:

- `docs/ADMIN_V1_PRODUCTION_CHECKLIST.md`
