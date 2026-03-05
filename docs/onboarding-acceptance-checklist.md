# Onboarding Acceptance Checklist

Use this checklist before shipping onboarding changes or sending live invites.

## 1) Preflight (Config)

Run:

```bash
npm run check:auth-url
npm run check:onboarding
npm run test:onboarding
```

Pass criteria:

- No `.vercel.app` or `.supabase.co` public links in generated onboarding links.
- Redirect host resolves to `centerconnect.co.za`.
- Role precedence tests pass.

## 2) Role Conversion Scenarios

### A. New email invited as ECD Admin

- Invite from `/admin/tenants` or admin invitation flow.
- Click invite link from email.
- Expected:
  - User lands in ECD onboarding/welcome flow.
  - `user_profiles.role = ecd_admin`.
  - Entry exists in `ecd_admins`.
  - Parent route is not shown after sign-in.

### B. Existing parent invited as ECD Admin

- Invite an email that already exists in `parents`.
- Click invite link.
- Expected:
  - User is upgraded to ECD role.
  - Parent record is removed (`parents` table cleanup).
  - Login opens ECD routes, not parent routes.

### C. Existing parent invited as ECD Staff

- Invite as `ecd_staff`.
- Expected:
  - `user_profiles.role = ecd_staff`.
  - `ecd_admins` link exists with `ecd_staff`.
  - Parent access removed.

### D. Platform admin guard

- Try inviting platform admin through ECD invite flow.
- Expected:
  - Operation blocked with explicit error.

## 3) Email + Welcome Pack

- Welcome email shows CentreConnect branding/logo.
- “See your welcome pack” opens the welcome guide.
- “Get started now” leads into valid auth flow.
- “Print parent QR poster” opens printable poster route.
- No broken image URLs.

## 4) Critical Navigation Checks

- ECD invite acceptance should not land on parent dashboard.
- Parent Discover “View Details” should not 404.
- Admin tenant list should load active tenants and allow edit/invite actions.

## 5) Release Gate

Required to release:

- `npm run build` passes.
- `npm run test:onboarding` passes.
- Manual checks in sections 2 and 3 pass for at least one fresh test account.

## 6) Incident Rollback Notes

If onboarding breaks after deploy:

1. Pause new invites.
2. Re-run:
   - `npm run check:auth-url`
   - `npm run test:onboarding`
3. Verify role resolver is active in:
   - `app/auth/confirm/route.ts`
   - `app/api/auth/ensure-profile/route.ts`
4. Revert to last known good commit if role assignment is wrong.
