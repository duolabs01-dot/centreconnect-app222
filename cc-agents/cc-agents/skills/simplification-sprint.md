---
name: simplification-sprint
description: >
  Rules and techniques for reducing UI complexity without removing features.
  Covers the 3-question test, nav item budgets, the fold rule, feature
  collapsing patterns, and page complexity limits. Use before adding any
  new UI element or during a simplification pass.
---

# Simplification Sprint — CentreConnect

## 1. The 3-Question Test

Before adding ANY UI element (button, card, nav item, section, modal), ask:

### Question 1: Does a real pilot crèche owner need this to do their job today?
- "Real" means Bajabulile or Sakhisizwe — not a hypothetical future customer
- "Today" means right now, not next month
- If NO → do not add it to the primary surface

### Question 2: Can it live one level deeper?
- Detail page instead of dashboard
- Settings section instead of top nav
- Expandable section instead of always-visible
- If YES → move it deeper

### Question 3: Will removing it cause a real user to be stuck?
- Can they still complete their daily workflow?
- Is there another path to the same information?
- If NO (they won't be stuck) → remove it from the primary surface

### Decision Matrix
| Q1: Needed today? | Q2: Can live deeper? | Q3: Stuck without it? | Action |
|-------------------|---------------------|----------------------|--------|
| Yes | No | Yes | Keep on primary surface |
| Yes | Yes | Yes | Keep but consider moving deeper |
| Yes | Yes | No | Move deeper |
| No | — | — | Remove from primary surface entirely |

## 2. Nav Item Budgets

### Hard Limits
| Portal | Max Nav Items | Rationale |
|--------|--------------|-----------|
| ECD Portal | ≤ 8 | Township crèche owners on mobile — cognitive load matters |
| Parent Portal | ≤ 4 | Parents check status, that's it — minimal is respectful |
| Admin Portal | ≤ 6 | Solo founder — 6 items covers 90% of daily work |

### Enforcement
- Check nav counts in every PR:
  ```bash
  # ECD nav count
  grep -c "href:" components/layout/ecd-navigation.ts
  
  # Admin nav count (primary items only)
  grep -c "href:" components/admin/admin-nav.ts | head -1
  ```
- If a new nav item is added, one must be removed or folded

### Current Admin Nav (6 Items)
1. **Overview** — Single source of truth dashboard
2. **Centres** — Centre management
3. **Users** — User management
4. **Revenue** — Billing and payments
5. **Support** — Tickets and help
6. **Command** — Operations queue

Advanced pages live on the Overview dashboard as "Advanced tools →" drill-down.

## 3. The Fold Rule

> Anything below the fold on first visit needs to prove its value.

### What This Means
- The first screenful (approximately 600-800px on desktop, 500-600px on mobile) should contain the most critical information
- Information below the fold should earn its place — ask "will the user scroll for this?"
- If nobody scrolls to it in testing, it should be moved deeper or removed

### Applying the Fold Rule
1. **Dashboard pages**: KPIs and action items above the fold; detail tables below
2. **Settings pages**: Most-changed settings at the top; rarely-changed at the bottom
3. **Form pages**: Critical fields first; optional fields in expandable sections
4. **List pages**: Filters and search above the fold; long lists naturally below

## 4. Collapsing Features Without Removing Pages

### Pattern 1: Sub-Navigation via Dashboard Links
Instead of sidebar items, provide links from the main dashboard:
```tsx
// In the Overview dashboard
<SectionCard title="Advanced tools" ...>
  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
    {ADMIN_ADVANCED_ITEMS.map((item) => (
      <Link key={item.href} href={item.href} className="...">
        <p className="text-sm font-black text-white">{item.label}</p>
        <p className="mt-2 text-xs text-slate-400">Open {item.label.toLowerCase()} →</p>
      </Link>
    ))}
  </div>
</SectionCard>
```

### Pattern 2: Quick-Access Links in Context
Instead of a separate nav item, add a contextual link where it's relevant:
```tsx
// In the support section, link to parent reliability
<p className="text-xs text-slate-400">
  Having form issues? <Link href="/admin/parent-reliability">Check parent reliability →</Link>
</p>
```

### Pattern 3: Settings Sections
Group rarely-used configuration under expandable sections:
```tsx
<details className="rounded-2xl border border-white/10 bg-black/20">
  <summary className="cursor-pointer p-4 text-sm font-bold text-white">
    Advanced settings
  </summary>
  <div className="p-4 pt-0 space-y-3">
    {/* Rarely-used settings here */}
  </div>
</details>
```

### Pattern 4: Tabbed Interfaces
Use tabs to surface multiple views without cluttering navigation:
```tsx
// Single page with tabs instead of separate nav items
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="analytics">Analytics</TabsTrigger>
    <TabsTrigger value="audit">Audit Trail</TabsTrigger>
  </TabsList>
  {/* Tab content */}
</Tabs>
```

## 5. Page Complexity Limit

### Rule: 500 Lines Max Per Page Component
If a page component file exceeds 500 lines:
1. Extract reusable components to `components/` directory
2. Extract data fetching to `lib/` directory
3. Extract types to `types/` directory

### Splitting Strategy
```
page.tsx (< 500 lines)
├── imports + types (< 50 lines)
├── data fetching function (< 100 lines)
├── page component rendering (< 350 lines)
└── exports

If over 500 lines, split to:
├── page.tsx — server component, data fetching, composition
├── components/feature/feature-section.tsx — UI sections
├── components/feature/feature-card.tsx — individual cards
├── lib/feature/queries.ts — data fetching logic
└── types/feature.ts — shared types
```

### Current Exceptions
- `app/admin/dashboard/page.tsx` — allowed to exceed 500 lines because it consolidates HQ + dashboard into a single source of truth. Review quarterly.

## 6. Simplification Checklist

Before marking any simplification sprint complete:

- [ ] ECD nav ≤ 8 items
- [ ] Parent nav ≤ 4 items
- [ ] Admin nav ≤ 6 items
- [ ] No page exceeds 500 lines (or has an explicit exception documented)
- [ ] Every nav item passes the 3-question test
- [ ] Critical info is above the fold on mobile (375px)
- [ ] All "removed" features are still accessible via drill-down or secondary path
- [ ] No 404s — deprioritised pages still work, they're just not in primary nav
