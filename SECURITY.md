# Security Model

## Scope
This project uses Supabase Auth + PostgreSQL Row Level Security (RLS) for multi-tenant isolation across:
- Parent users
- ECD admins/staff
- Platform admins

## Core Rules
- Parent users can only access their own parent profile, children, and applications.
- Parent application creation is constrained to children they own (`child.parent_id = auth.uid()`).
- ECD admins/staff can only access tenant rows for centres in `get_user_ecd_ids()`.
- Platform admins can access all operational tables.

## Protected Tables
RLS is enabled and forced on all primary tables from the core schema, including:
- `user_profiles`
- `ecd_centres`
- `ecd_admins`
- `subscriptions`
- `invoices`
- `parents`
- `children`
- `applications`
- `application_status_history`
- `ecd_media`
- `ecd_content`
- `calendar_events`
- `announcements`
- `support_tickets`
- `support_ticket_messages`
- `audit_logs`

## Policy Pattern
Policies are explicit per action (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) and use both:
- `USING` for row visibility/mutation eligibility
- `WITH CHECK` for validating the new row on `INSERT/UPDATE`

Broad `FOR ALL` write policies were replaced for sensitive tables with explicit operation-specific policies.

## Provisioning Safety
User profile provisioning is protected by:
- `public.provision_user_profile(...)` (`SECURITY DEFINER`)
- `public.handle_new_auth_user()` trigger on `auth.users`
- Server-side recovery endpoint: `POST /api/auth/ensure-profile`

This prevents signup/login dead-ends when profile rows are missing.

## Application Status
`application_status` includes:
- `submitted`
- `in_review`
- `approved`
- `waitlisted`
- `rejected`
- `withdrawn`
- `enrolled`

`approved` = offer made.  
`enrolled` = offer accepted by parent.

## Notes
- Public directory reads use constrained views (not unrestricted base-table reads).
- Service role access is only used server-side.
- Client-side auth checks do not replace RLS; RLS is the enforcement boundary.
