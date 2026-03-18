---
name: pilot-activation
description: >
  Activation funnel, metrics, and churn prevention for CentreConnect pilot
  centres. Covers the full journey from invite to paying customer, how to
  query each metric, what to do when a centre goes dark, and what "fully
  activated" means. Use during weekly reviews and pilot check-ins.
---

# Pilot Activation — CentreConnect

## 1. The Activation Funnel

```
Invited → Logged In → First Child Added → Attendance Marked → Parent Linked
```

### Stage Definitions
| Stage | Trigger | Evidence |
|-------|---------|----------|
| **Invited** | Owner invite sent (WhatsApp or email) | `notification_logs.event_type = 'owner_invite'` with status `sent` or `delivered` |
| **Logged In** | Centre owner logged into ECD portal at least once | `ecd_admins` row exists with matching `ecd_id` |
| **First Child Added** | At least 1 child record created in the centre | `children` table has ≥1 row with matching `ecd_id` |
| **Attendance Marked** | At least 1 attendance record created | `attendance` table has ≥1 row with matching `ecd_id` |
| **Parent Linked** | At least 1 parent notification sent to a parent | `parent_notifications` table has ≥1 row linked to the centre's children |

## 2. Weekly Activation Metrics

Check these every Monday morning during `/weekly-review`:

### Metric 1: Onboarding Complete Count
```sql
SELECT COUNT(*)
FROM ecd_centres
WHERE onboarding_complete = true;
```

```typescript
const { count } = await admin
  .from('ecd_centres')
  .select('id', { count: 'exact', head: true })
  .eq('onboarding_complete', true)
```

### Metric 2: Centres with ≥1 Child Added
```sql
SELECT COUNT(DISTINCT ecd_id)
FROM children;
```

```typescript
const { data } = await admin
  .from('children')
  .select('ecd_id')

const centresWithChildren = new Set(data?.map(r => r.ecd_id)).size
```

### Metric 3: Centres with ≥1 Attendance Record
```sql
SELECT COUNT(DISTINCT ecd_id)
FROM attendance;
```

```typescript
const { data } = await admin
  .from('attendance')
  .select('ecd_id')

const centresWithAttendance = new Set(data?.map(r => r.ecd_id)).size
```

### Metric 4: Centres with ≥1 Parent Notification Sent
```sql
SELECT COUNT(DISTINCT c.ecd_id)
FROM parent_notifications pn
JOIN children c ON c.id = pn.child_id
WHERE pn.status IN ('sent', 'delivered');
```

```typescript
// Approximate — check parent_notifications linked to children in each centre
const { data } = await admin
  .from('parent_notifications')
  .select('child_id, children(ecd_id)')
  .in('status', ['sent', 'delivered'])

const centresWithParentLinks = new Set(
  data?.map(r => (r as any).children?.ecd_id).filter(Boolean)
).size
```

### Weekly Summary Template
```
## Activation Summary — Week of [DATE]

| Metric | Count | Target |
|--------|-------|--------|
| Onboarding complete | X | 2 (founding) |
| Centres with ≥1 child | X | 2 |
| Centres with ≥1 attendance | X | 2 |
| Centres with ≥1 parent notif | X | 1 |
| Fully activated | X | 2 |
```

## 3. Churn Prevention

### 48-Hour No-Login Alert
When a pilot centre has not logged in for 48 hours, this is a churn signal.

**Detection Query:**
```sql
SELECT ec.name, ea.last_sign_in_at
FROM ecd_centres ec
JOIN ecd_admins ea ON ea.ecd_id = ec.id
WHERE ec.is_active = true
  AND ea.last_sign_in_at < NOW() - INTERVAL '48 hours';
```

### Intervention Protocol
| Hours Since Last Login | Action |
|-----------------------|--------|
| 24h | No action — normal gap |
| 48h | Send WhatsApp check-in: "Hi [Name], how is CentreConnect working for you? Any issues with attendance or adding children?" |
| 72h | Phone call to centre owner — ask what's blocking them |
| 96h | In-person visit if local (Alexandra, Soweto) — offer to sit with them and use the app together |
| 7d+ | Classify as "at risk" — consider if the product isn't solving their problem |

### WhatsApp Check-In Templates
```
// 48h check-in
Hi [Name] 👋 It's [Founder] from CentreConnect. I noticed you haven't
logged in recently — is everything working okay? I'm here to help if
anything is confusing. Just reply here. 😊

// 72h concern
Hi [Name], I want to make sure CentreConnect is actually helping you.
Can I call you for 5 minutes today? I want to hear what's working
and what's not. 🙏

// After support resolution
Great, glad we sorted that out! Remember you can reach me anytime
on this number. Your next step: [specific action, e.g. "add your
first 5 children to the register"]. 📋
```

## 4. The Conversion Conversation

### Timeline
- **Pilot period**: Free onboarding + first month (until end of April 2026)
- **Conversion goal**: Move pilot centres to paid R199/month plan by May 2026

### Pre-Conversion Checklist (Complete Before Having "The Talk")
- [ ] Centre is fully activated (all 5 funnel stages complete)
- [ ] Centre has used the app daily for at least 2 weeks
- [ ] Centre owner has expressed positive feedback
- [ ] At least 1 parent is actively using the platform
- [ ] No unresolved support tickets for this centre
- [ ] Centre owner understands what they're paying for (attendance, parent comms, compliance)

### Conversion Conversation Script
```
Hi [Name], I hope CentreConnect has been helping you manage [specific
thing they use — attendance, parent communication, etc.].

Your free pilot period ends at the end of April. To keep using
CentreConnect from May, the subscription is R199 per month.

This covers:
✅ Unlimited children and parent accounts
✅ Daily attendance register (digital)
✅ Parent communication (notifications, reports)
✅ Compliance documents and reporting
✅ WhatsApp support from me personally

Would you like to continue? I can set up your billing right now —
it takes 2 minutes.
```

### Objection Handling
| Objection | Response |
|-----------|----------|
| "R199 is too much" | "That's less than R7 per day. Your paper register costs R50/month and doesn't send parent updates." |
| "I'll think about it" | "Of course. What would help you decide? Can I show you how [feature] saves you time?" |
| "I don't use it enough" | "Let's fix that. What daily task would you like CentreConnect to handle? I'll set it up with you right now." |
| "Can I pay later?" | "I can give you until May 15th to start. But I want to make sure you're getting value — let's look at your usage together." |

## 5. What "Fully Activated" Means

A centre is **fully activated** when ALL five funnel stages are complete:

| # | Stage | Verification |
|---|-------|-------------|
| 1 | Invited | `notification_logs` has a delivered owner invite |
| 2 | Logged In | `ecd_admins` row exists with a `last_sign_in_at` timestamp |
| 3 | First Child Added | `children` table has ≥1 row for this `ecd_id` |
| 4 | Attendance Marked | `attendance` table has ≥1 row for this `ecd_id` |
| 5 | Parent Linked | At least 1 parent notification sent for a child in this centre |

### Combined Activation Query
```sql
SELECT
  ec.id,
  ec.name,
  ec.onboarding_complete,
  (SELECT COUNT(*) FROM children c WHERE c.ecd_id = ec.id) AS child_count,
  (SELECT COUNT(*) FROM attendance a WHERE a.ecd_id = ec.id) AS attendance_count,
  (SELECT COUNT(*) FROM parent_notifications pn
   JOIN children c2 ON c2.id = pn.child_id
   WHERE c2.ecd_id = ec.id) AS parent_notif_count,
  CASE
    WHEN ec.onboarding_complete = true
      AND (SELECT COUNT(*) FROM children c WHERE c.ecd_id = ec.id) > 0
      AND (SELECT COUNT(*) FROM attendance a WHERE a.ecd_id = ec.id) > 0
      AND (SELECT COUNT(*) FROM parent_notifications pn
           JOIN children c2 ON c2.id = pn.child_id
           WHERE c2.ecd_id = ec.id) > 0
    THEN 'FULLY ACTIVATED'
    ELSE 'INCOMPLETE'
  END AS activation_status
FROM ecd_centres ec
WHERE ec.is_active = true;
```

### Target
- **March 2026**: 2/2 founding centres fully activated
- **April 2026**: 2/2 fully activated + daily usage confirmed
- **May 2026**: Both converted to paying (R199/month each = R398 MRR)
- **H2 2026**: Scale to 20 centres (R3,980 MRR target)
