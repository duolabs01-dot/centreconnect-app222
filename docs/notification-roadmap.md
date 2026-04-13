# CentreConnect Notification Roadmap

## Working rule

CentreConnect notifications should solve operational problems, not create noise.

### Core policy
- **Register not marked -> remind**
- **Account not activated -> remind**
- **Everything else -> only notify if it clearly helps operations**

### Separation of concerns
- **Operational reminders** stay separate from feature/news updates.
- **`notification_logs`** is the delivery source of truth.
- **`ecd_notifications`** is the in-app centre-facing notification surface.
- Admin dashboards should show only **actionable overdue items**, not a generic event stream.

---

## Current live notification types

### 1. Attendance register reminder
- **Status:** Live
- **Audience:** ECD admins and supervisors
- **Channels:** In-app + email
- **Trigger:** Centre has enrolled/active children, but no attendance has been marked for today by reminder time.
- **Stop condition:** Attendance is marked for the current day.
- **Admin visibility:** Should be added as an overdue operational list, not a noisy feed.
- **Source of truth:** `notification_logs` + `ecd_notifications`
- **Cron:** `/api/cron/attendance-register-reminders`

### 2. Password activation reminder
- **Status:** Live
- **Audience:** Centre owner/admin only
- **Channels:** Email
- **Trigger:** `account_activation_required = true`, `first_password_set_at IS NULL`, anchored to `activation_requested_at`
- **Cadence:** Day 1, Day 3, Day 7, then weekly
- **Stop condition:** `first_password_set_at` becomes populated
- **Admin visibility:** Overdue activations card on platform admin dashboard
- **Source of truth:** `notification_logs`
- **Cron:** `/api/cron/password-activation-reminders`

---

## Recommended notification matrix

| Event | Audience | Channel | Trigger | Stop condition | Admin visibility | Priority |
|---|---|---|---|---|---|---|
| Register not marked | ECD admin/supervisor | In-app + email | No attendance marked by reminder time, but active children exist | Register marked today | Overdue register list + logs | P1 |
| Account not activated | Centre owner/admin | Email | Activation required and first password not set | First password set | Overdue activations card + logs | P1 |
| Failed owner/admin invite | Platform admin | Admin only | Invite send fails | Invite resent or issue resolved | Failed invite panel + logs | P1 |
| Parent link request not opened | ECD admin | In-app later, maybe email later | Parent link still unopened after threshold | Opened or manually dismissed | Optional follow-up list | P2 |
| Compliance docs missing/expired | ECD admin | In-app first | Required compliance item missing or expired | Status verified | Compliance attention card | P2 |
| Invoice overdue | Platform admin first, centre later if needed | Admin only first | Invoice overdue past threshold | Paid or written off | Revenue operations dashboard | P2 |
| Product/news update | Nobody by default | None | Only if deliberately scheduled | N/A | No admin urgency surface | P3 |

---

## Recommended rollout

## Phase 1, already shipped
- Gate invited ECD access behind password setup
- Send password-activation reminders
- Send daily attendance/register reminders
- Log reminder delivery in `notification_logs`
- Show overdue activations in platform admin dashboard

## Phase 2, next best operational work

### 2.1 Add overdue register visibility in admin
**Recommendation:** build this next.

Why:
- register reminders are already live
- admin still lacks one clean place to see which centres are repeatedly failing to mark attendance
- this is the natural companion to the overdue activations card

**Admin card fields**
- Centre name
- Owner/admin contact
- Reminder sent today? yes/no
- Last reminder sent at
- Days missed this week (optional if cheap)
- Quick link to centre / attendance context

**Recommended rule for v1**
- show only centres that currently qualify for the reminder
- do not show centres that already marked attendance today
- keep it operational and short

### 2.2 Tighten notification reporting primitives
**Recommendation:** do after overdue register visibility.

Add helpers for:
- `last_sent_at`
- reminder grouping by event type
- simple "due / sent / failed" summary counts
- reusable event type constants so routes and dashboards cannot drift

### 2.3 Add parent/compliance reminders only after live usage proves the need
**Recommendation:** do not build these yet unless pilot centres ask for them.

Reason:
- they are useful, but not yet as core as attendance and activation
- each extra reminder increases noise and support load

---

## What should not happen

- Do not mix feature marketing into operational reminders.
- Do not create a generic "all notifications" dashboard as the main admin surface.
- Do not send repeated reminders without a clean stop condition.
- Do not add a new notification type just because the system can support it.

---

## Practical next actions

### Now
1. Keep attendance reminder cron live and stable
2. Keep password-activation reminder flow live and stable
3. Watch logs for send failures

### Next
1. Build **overdue register reminders** admin card/list
2. Add small reporting helpers around `notification_logs`
3. Review after one week of live pilot usage

### Later
1. Consider parent link follow-ups
2. Consider compliance reminders
3. Consider centre billing reminders only when billing ops are ready

---

## Recommended owner language

When deciding whether a new notification belongs in the app, ask:

> If this notification did not exist, would someone miss a task that matters today?

If the answer is **yes**, it is probably an operational notification.
If the answer is **no**, it probably should not ship yet.
