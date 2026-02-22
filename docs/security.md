# Security Model

## Multi-tenant isolation

`supabase/migrations/002_rls.sql` hardens isolation with strict Row Level Security:

- ECD admin/staff can only read or mutate tenant-owned records where `ecd_id` belongs to their membership in `ecd_admins`.
- Parents can only access records where `parent_id = auth.uid()` (or their own parent profile id).
- Platform admins (`user_profiles.role = platform_admin`) retain cross-tenant access for support/operations.

## Tenant key coverage

The migration ensures tenant-scoped tables include `ecd_id` and are policy-enforced:

- Existing: `ecd_admins`, `subscriptions`, `invoices`, `applications`, `ecd_media`, `ecd_content`, `calendar_events`, `announcements`, `support_tickets`, `audit_logs`
- Added in `002_rls.sql`:
  - `application_status_history.ecd_id`
  - `support_ticket_messages.ecd_id`
  - `ecd_admin_invitations` table (with required `ecd_id`)

## Parent ownership coverage

Parent-scoped isolation is enforced on:

- `parents` (`id = auth.uid()`)
- `children` (`parent_id = auth.uid()`)
- `applications` (`parent_id = auth.uid()`, plus child ownership check on insert)

## Public directory exposure

Raw `ecd_centres` is no longer the intended anonymous source.  
Use `public_ecd_centres` view for directory/centre public pages. It exposes only public fields:

- `id`, `slug`, `name`, `tagline`, `description`
- `suburb`, `city`, `province`, `postal_code`
- `age_groups`, `logo_url`, `cover_image_url`, `primary_color`, `is_registered`

## Internal platform-admin capabilities

Server-side endpoints were added and require an authenticated `platform_admin`:

- `POST /api/internal/platform-admin/centres`
  - Creates an ECD centre and initial subscription.
- `POST /api/internal/platform-admin/invitations`
  - Invites an ECD admin/staff account and records invitation metadata.

These endpoints use the server-only Supabase admin client (`lib/supabase/admin.ts`) after role verification (`lib/auth/platform-admin.ts`).

## Quick testing (seed + curl)

1. Apply migrations, then run seed SQL:

- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_rls.sql`
- `supabase/seed/internal_admin_seed.sql`

2. Create a platform admin auth user in Supabase Auth (if not already present):

- `platform-admin@centreconnect.co.za` (preferred) or `platform-admin@example.com`

3. Obtain a platform admin access token (Supabase Auth sign-in).

4. Create a centre:

```bash
curl.exe -X POST "http://localhost:3010/api/internal/platform-admin/centres" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <PLATFORM_ADMIN_ACCESS_TOKEN>" ^
  -d "{\"slug\":\"oak-tree-centre\",\"name\":\"Oak Tree ECD\",\"email\":\"oak@example.com\",\"phone\":\"+27110000000\",\"address\":\"1 Oak Road\",\"suburb\":\"Sandton\",\"city\":\"Johannesburg\",\"province\":\"Gauteng\",\"monthlyPrice\":1999,\"tier\":\"standard\"}"
```

5. Invite ECD admin:

```bash
curl.exe -X POST "http://localhost:3010/api/internal/platform-admin/invitations" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <PLATFORM_ADMIN_ACCESS_TOKEN>" ^
  -d "{\"ecdId\":\"<ECD_UUID>\",\"email\":\"new-admin@example.com\",\"role\":\"ecd_admin\",\"fullName\":\"New ECD Admin\"}"
```
