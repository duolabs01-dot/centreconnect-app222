# ECD Admin Device Limit (2 Devices) – Implementation & Behavior

## Overview
ECD Admin users are restricted to **at most 2 concurrent device logins**. When a third login occurs, the oldest session is automatically pruned. Admins can view and revoke active sessions via the **Sessions** page in the ECD portal.

## Architecture

### Database
- `user_sessions` table now supports **multiple rows per user** (unique constraint on `user_id` removed).
- Added `device_fingerprint` (SHA256 hash of device_hint + user_agent + IP) for deduplication.
- Indexes on `(user_id, created_at DESC)` and `(user_id, device_fingerprint)` for performance.
- RLS policy: users can only manage their own sessions.

### Session Registration
- `registerSession` (in `lib/session-guard.ts`) now:
  - Determines if the user is an `ecd_admin`.
  - If admin: enforces a 2‑session limit by pruning the oldest sessions beyond the limit.
  - Stores a device fingerprint for better deduplication.
  - Non‑admins get a generous default of 10 sessions.

### Middleware Enforcement
- New middleware guard `enforceEcdAdminDeviceLimit` runs **after** the main session middleware for `/ecd/*` routes.
- For ECD Admins, it validates that the current session token still exists in `user_sessions`.
- If the token is missing (pruned/revoked), the admin is redirected to `/ecd/login?error=session_revoked`.

### UI: Sessions Page
- Path: `/ecd/sessions` (visible only to ECD Admins).
- Lists active sessions with device hint, IP, last‑seen, and a truncated user‑agent.
- **Current** session badge (determined by most recent `last_seen_at`).
- **Revoke** button (disabled for current session) to immediately log a device out.
- Added to the ECD portal sidebar under the **Settings** group.

## Behavior Scenarios

### 1. Admin logs in on a new device (≤2 existing)
- New session is recorded.
- No pruning occurs.
- Admin can continue on all devices.

### 2. Admin logs in on a third device
- New session is recorded.
- Oldest session is deleted automatically (pruned to 2).
- The oldest device, on next request within `/ecd/*`, is redirected to login with `session_revoked` error.

### 3. Admin revokes a session manually
- Session row is deleted immediately.
- The affected device is logged out on the next middleware check.

### 4. Admin accesses `/ecd/sessions`
- Only ECD Admins can view the page.
- All active sessions are displayed.
- Revoking a non‑current session removes it instantly.

## Security Notes
- Session tokens are **never stored in plaintext**; only Supabase’s JWT `access_token` is stored.
- Device fingerprinting helps reduce duplicate session rows per device but is **not** used for enforcement.
- Pruning is done server‑side; the client cannot bypass the 2‑session limit.

## Migration
- Migration `20260318_ecd_admin_multi_sessions.sql` updates the schema and indexes.
- Existing data: the old unique constraint is dropped; existing rows remain valid.

## Testing
- Verify that after 3 logins, only the 2 newest sessions remain.
- Confirm that accessing an ECD page from a pruned session redirects to login with `session_revoked`.
- Use the Sessions page to view and revoke sessions; ensure the current session cannot be revoked.
- Non‑admin users should see an access‑restricted message on `/ecd/sessions`.

## Future Enhancements
- Add “Revoke all other sessions” button.
- Show geographic location based on IP.
- Allow admins to label devices (e.g., “Work Laptop”, “Home Phone”).
