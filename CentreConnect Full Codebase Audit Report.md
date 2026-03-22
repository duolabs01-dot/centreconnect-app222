# CentreConnect Full Codebase Audit Report

**Date:** March 21, 2026  
**Auditor:** Manus AI  
**Target Repository:** duolabs01-dot/centreconnect-app222

## 1. Executive Summary

CentreConnect is a comprehensive Early Childhood Development (ECD) platform built to connect parents with ECD centres while providing operational, admissions, and billing tools for centre administrators. The application is a large-scale, production-ready SaaS built on a modern Next.js and Supabase stack, encompassing over 110,000 lines of code across 770+ source files.

The overall architecture is robust, utilizing the Next.js App Router, Supabase for backend-as-a-service capabilities, and integrations with Paystack for billing and Google Gemini for AI document extraction. However, the audit revealed **critical security vulnerabilities** involving hardcoded secrets in the repository, as well as significant **technical debt** related to TypeScript type safety and outdated dependencies. These issues must be addressed before further scaling or a full public launch.

## 2. Architecture & Tech Stack Analysis

The project leverages a modern and capable technology stack tailored for a multi-tenant SaaS application. The frontend is powered by Next.js 14.2 utilizing the App Router paradigm, React 18, and Tailwind CSS for styling. UI components are built using shadcn/ui, which relies on Radix UI primitives for accessibility. The backend infrastructure relies heavily on Supabase, utilizing its PostgreSQL database, Authentication services, and Edge Functions written in Deno. External integrations include Paystack for payment processing and the Google Gemini API for AI-driven document extraction and OCR capabilities.

The repository follows a logical and standard Next.js App Router structure. The architecture effectively separates concerns between different user personas, which is critical for a multi-tenant application.

| Directory | Purpose & Contents |
|-----------|--------------------|
| `/app` | Contains route handlers and pages organized by persona, including `(auth)`, `(journey)`, `/admin`, `/ecd`, and `/api`. |
| `/components` | Houses reusable UI components categorized by domain, such as `admin`, `ecd`, `parent`, and `ui`. |
| `/lib` | Contains core business logic, database clients, billing rules, and security middleware. |
| `/supabase` | Stores database migrations (over 120 files), Edge Functions, and seed data. |
| `/scripts` | Includes extensive operational and migration scripts used for maintenance and deployments. |

## 3. Security Audit

### 3.1 🚨 CRITICAL: Hardcoded Secrets

The most pressing finding of this audit is the presence of hardcoded secrets within the repository. These credentials pose a severe security risk and must be rotated immediately.

Real Supabase URLs and Anon Keys are hardcoded directly into the `lib/supabase/client.ts` file. Furthermore, the `.env.example` file contains actual keys instead of the expected placeholder values. A review of the Git history also revealed that a `.env` file containing sensitive information was previously tracked in commit `703b57a`. Finally, hardcoded passwords, such as `AuditPassword123!`, exist within the Playwright test files.

### 3.2 Authentication & Authorization

The application employs robust authentication and authorization mechanisms. Row Level Security (RLS) is enabled on all core tables within the PostgreSQL database. A recent security hardening migration (`013_security_hardening_and_enrolled.sql`) significantly improved these policies by replacing broad `FOR ALL` access with explicit `SELECT`, `INSERT`, `UPDATE`, and `DELETE` rules.

Custom middleware (`middleware.ts`) correctly updates sessions and enforces a strict two-device limit for ECD administrators. Platform Admin authentication is implemented securely in `lib/auth/platform-admin.ts`, utilizing an email allowlist combined with database role verification to restrict access to sensitive administrative functions.

### 3.3 API & Webhook Security

External API interactions and webhooks are handled securely. The Paystack webhook implementation includes a `verifyPaystackSignature` function that validates the `x-paystack-signature` header using the configured webhook secret before processing any payloads. 

To mitigate abuse, rate limiting is implemented in `lib/security/rate-limit.ts` using Upstash Redis, with an in-memory fallback designed for development environments. Additionally, Cloudflare Turnstile bot protection is integrated via the `components/security/turnstile-widget.tsx` component to secure public-facing forms.

## 4. Code Quality & Technical Debt

### 4.1 TypeScript Usage

While the project is configured with strict TypeScript settings (`"strict": true` in `tsconfig.json`), the codebase suffers from significant type safety issues. There are over 200 instances of the `any` type or `as any` assertions in the `/app` directory, and an additional 88 instances within the `/lib` directory. This extensive use of `any` defeats the primary purpose of TypeScript, masking potential runtime errors and increasing technical debt.

### 4.2 Dependencies

The project relies on several outdated dependencies that require attention. Most notably, the `@supabase/ssr` package is pinned to version `0.0.10`, which is extremely outdated compared to the current `0.5.x` releases. An `npm audit` revealed 8 vulnerabilities, including 6 high-severity issues in packages such as `next`, `glob`, and `minimatch`.

### 4.3 Documentation & Process

The development team maintains excellent internal documentation practices. The `tasks/lessons.md` file serves as a valuable knowledge base, documenting past failures—such as issues with hardcoded service role keys and Next.js caching—and establishing rules to prevent their recurrence. The presence of an actively maintained `AUDIT_REPORT.md` indicates a mature Quality Assurance process prior to deployments.

## 5. Performance Audit

The application demonstrates proactive performance tuning at the database level. Recent migrations, such as `020_revenue_performance_indexes.sql` and `024_app_wide_performance_boost.sql`, introduced specific indexes for common queries, including sorting invoices by creation date and filtering support tickets. Furthermore, complex data aggregations are efficiently offloaded to PostgreSQL RPC functions, such as `get_ecd_application_counts`, which reduces data transfer overhead and client-side processing burdens.

On the application side, Progressive Web App (PWA) support is enabled via a service worker (`public/sw.js`), providing offline caching and faster load times for returning users. The project leverages Next.js App Router optimizations; however, the `next.config.js` configuration indicates that ESLint is bypassed during the build process, which may obscure performance anti-patterns.

## 6. Recommendations & Next Steps

Based on the audit findings, the following actions are recommended to ensure the security, stability, and maintainability of the CentreConnect platform.

| Category | Recommended Action |
|----------|--------------------|
| **Security Remediation** | Rotate all exposed credentials immediately, including Supabase keys and Paystack secrets. Scrub the Git history of the previously tracked `.env` file using tools like `git-filter-repo`. Ensure `.env.example` contains only dummy values. |
| **Dependency Management** | Upgrade `@supabase/ssr` to the latest stable version to ensure security and compatibility with Next.js. Run `npm audit fix` to address the high-severity vulnerabilities identified in the build tools and framework. |
| **Code Quality** | Initiate a refactoring sprint to replace `any` types with proper Zod schemas or TypeScript interfaces, particularly in API route payloads and Supabase realtime callbacks. Remove the 43 lingering `console.log` statements from production paths in the `/lib` directory. |
| **Testing** | Expand Playwright test coverage for the parent application submission flow and attendance marking features, as noted in the existing internal `AUDIT_REPORT.md`. |

---
*End of Report*
