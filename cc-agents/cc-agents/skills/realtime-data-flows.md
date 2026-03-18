---
name: realtime-data-flows
description: >
  Canonical patterns for real-time data in CentreConnect. Covers when to use
  Supabase Realtime vs revalidatePath vs router.refresh(), how to scope channels
  to tenants, prevent memory leaks, and enforce privacy rules. Reference this
  skill before adding any realtime subscription.
---

# Realtime Data Flows — CentreConnect

## 1. When to Use What

| Scenario | Pattern | Why |
|----------|---------|-----|
| Data changed by the current user's own server action | `revalidatePath()` or `router.refresh()` | No need for realtime — the user triggered the change |
| Data changed by another user in the same centre | Supabase Realtime subscription | The current user needs to see the change without refreshing |
| Admin dashboard viewing live counts | `revalidatePath()` on interval or manual refresh | Admin dashboards use `force-dynamic` already |
| Pipeline board (ECD applications) | Supabase Realtime + optimistic UI | Parents move through stages — ECD owners need to see updates live |
| Parent notifications | Supabase Realtime | Notifications should appear without page refresh |
| Attendance marking | `revalidatePath()` after server action | Single-user action — no need for cross-user realtime |

### Decision Tree
```
Is the data change triggered by the current user?
  → YES: Use revalidatePath() or router.refresh()
  → NO: Could another user be changing it right now?
    → YES: Use Supabase Realtime
    → NO: Use revalidatePath() on next navigation
```

## 2. Canonical CentreConnect Realtime Pattern

Reference implementation: `app/ecd/(portal)/pipeline/pipeline-board.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  ecdId: string
  initialData: SomeType[]
}

export function RealtimeComponent({ ecdId, initialData }: Props) {
  const [data, setData] = useState(initialData)
  const supabase = createClient()

  useEffect(() => {
    // Always scope the channel name to the tenant
    const channel = supabase
      .channel(`table_name:ecd_id=${ecdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'table_name',
          filter: `ecd_id=eq.${ecdId}`,  // ← ALWAYS filter by tenant
        },
        (payload) => {
          // Handle INSERT, UPDATE, DELETE
          if (payload.eventType === 'INSERT') {
            setData((prev) => [...prev, payload.new as SomeType])
          }
          if (payload.eventType === 'UPDATE') {
            setData((prev) =>
              prev.map((item) =>
                item.id === (payload.new as SomeType).id
                  ? (payload.new as SomeType)
                  : item
              )
            )
          }
          if (payload.eventType === 'DELETE') {
            setData((prev) =>
              prev.filter((item) => item.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    // ← ALWAYS return cleanup
    return () => {
      supabase.removeChannel(channel)
    }
  }, [ecdId, supabase])

  return <>{/* render data */}</>
}
```

### Key Rules in This Pattern
1. **Channel name includes tenant scope**: `table:ecd_id=${ecdId}`
2. **Filter always includes `ecd_id=eq.${ecdId}`**: Never subscribe to all rows
3. **Cleanup function returned in useEffect**: Prevents memory leaks
4. **Initial data passed as prop**: Server component fetches first render, client subscribes for updates

## 3. Tenant Scoping Rules

### Always Scope Channels
```typescript
// ✅ CORRECT — scoped to a single ECD centre
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'applications',
  filter: `ecd_id=eq.${ecdId}`,
})

// ❌ WRONG — subscribes to ALL applications across ALL centres
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'applications',
})
```

### Parent-Side Scoping
When subscribing from the parent portal, scope by `parent_id` or `user_id`:
```typescript
// ✅ CORRECT — parent sees only their own notifications
.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'parent_notifications',
  filter: `user_id=eq.${userId}`,
})
```

## 4. Memory Leak Prevention

### Common Leak Patterns
```typescript
// ❌ LEAK — no cleanup, channel stays open forever
useEffect(() => {
  const channel = supabase.channel('my-channel').on(...).subscribe()
}, [])

// ❌ LEAK — new channel created on every re-render without cleanup
useEffect(() => {
  const channel = supabase.channel('my-channel').on(...).subscribe()
  return () => { channel.unsubscribe() }  // Wrong API — use removeChannel
})

// ✅ CORRECT — proper cleanup
useEffect(() => {
  const channel = supabase.channel('my-channel').on(...).subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}, [supabase])
```

### Cleanup Checklist
- [ ] Every `useEffect` that creates a channel returns a cleanup function
- [ ] Cleanup uses `supabase.removeChannel(channel)` (not `channel.unsubscribe()`)
- [ ] Dependencies array is correct — avoids re-subscribing unnecessarily
- [ ] No channels are created outside of useEffect

## 5. Performance Rules

### Channel Budget
| Context | Max Channels | Reason |
|---------|-------------|--------|
| ECD Pipeline page | 1 | Applications for this centre |
| ECD Dashboard | 0-1 | Optional: new applications notification |
| Parent Dashboard | 1 | Notifications for this parent |
| Parent Application page | 1 | Status updates for this application |
| Admin Dashboard | 0 | Admin uses `force-dynamic` — no realtime needed |

### Performance Guidelines
- **Max 2 channels per page** — if you need more, reconsider the design
- **Unsubscribe on unmount** — always, no exceptions
- **Debounce UI updates** for high-frequency tables (e.g., analytics events)
- **Use `event: 'INSERT'` instead of `event: '*'`** when you only care about new rows
- **Avoid subscribing to large tables** without a filter

## 6. Privacy Rules

### Never-Do List
- ❌ Never subscribe to all rows without a tenant/user filter
- ❌ Never expose child data across centres via realtime
- ❌ Never subscribe to `user_profiles` without scoping to the current user
- ❌ Never subscribe to `invoices` or `payments` from the parent portal

### Always-Do List
- ✅ Always filter by `ecd_id` in ECD portal subscriptions
- ✅ Always filter by `user_id` or `parent_id` in parent portal subscriptions
- ✅ Verify RLS policies cover the subscribed table (Supabase Realtime respects RLS)
- ✅ Test: Log in as user A, verify user B's changes don't appear in A's subscription

### RLS + Realtime
Supabase Realtime respects RLS policies. However:
- The filter in `.on()` is a **performance optimization**, not a security measure
- RLS is the actual security layer — always ensure RLS is enabled on the table
- Test both: the RLS policy AND the client-side filter
