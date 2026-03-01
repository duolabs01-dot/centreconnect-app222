---
name: weekly-review
description: >
  Weekly business and product health review. Run every Monday morning.
  Run with /weekly-review.
  Covers: platform health, user growth, revenue, support tickets, what to focus on this week.
---

# Weekly Business Review

Run this every Monday. It takes 10-15 minutes but keeps you focused on what actually matters.

## 1. Platform Health (business-operations-agent)

Check these in the admin dashboard or via DB query:

**Centres:**
- Total registered centres
- New centres this week
- Onboarding complete rate
- Centres that logged attendance in last 7 days (engagement)
- Centres that published daily reports in last 7 days (engagement)

**Parents:**
- Total parent accounts
- New parents this week
- Applications submitted this week
- Applications moving to 'enrolled' status (conversion)

**Revenue:**
- MRR
- New subscriptions this week
- Cancelled subscriptions this week
- Outstanding invoices

**Support:**
- Open support tickets (count and themes)
- New tickets this week vs last week
- Average resolution time

## 2. Product Health (qa-agent + architect-agent)

Quick technical pulse:
- Any new console errors appearing?
- Any Supabase query performance warnings?
- Middleware timeout issues?
- Any browser compatibility complaints in support tickets?

## 3. This Week's Focus (product-strategist)

Based on the data, recommend:
- **#1 Priority**: The single most impactful thing to build/fix this week
- **Quick Win**: Something that can ship in <1 day that improves the product
- **Defer**: What not to work on this week (important for focus)

## 4. Decisions to Make

List any decisions that have been pending and need resolution:
- Features waiting for a call
- Support escalations waiting for a response
- Infrastructure decisions deferred

## Weekly Review Output Format

```
# Week of [Date] — CentreConnect Weekly Review

## Platform Numbers
Centres: [total] (+[new this week])
Parents: [total] (+[new this week])
Applications this week: [count]
Enrolments this week: [count]
MRR: R[amount] ([+/-] from last week)
Open support tickets: [count]

## Health: [🟢 Healthy / 🟡 Watch / 🔴 Alert]

## Top Issue This Week
[One paragraph: what's the biggest problem or opportunity right now]

## Focus This Week
1. [Priority #1 — who owns it, what done looks like]
2. [Priority #2]
3. [Quick win to ship Monday/Tuesday]

## Decisions Needed
- [Decision 1]
- [Decision 2]

## What We're Not Doing This Week (and why)
- [Deferred item] — [reason]
```
