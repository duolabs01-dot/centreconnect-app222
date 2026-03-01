---
name: design-audit
description: >
  Deep visual and UX audit of a specific page, component, or user flow.
  Run with /design-audit [page or feature name].
  Produces before/after analysis with specific code changes to make.
---

# Design Audit Workflow

You are doing a forensic design audit. Be ruthless. Be specific. Show exact code changes.

## Step 1: Load the Target
Read the component/page files. Note every visual and UX decision made (or not made).

## Step 2: Run the Three-User Test
Simulate each user opening this page cold:

**Nomvula (parent, Samsung Galaxy A15, anxious)**
- First impression in 3 seconds?
- What confuses her?
- What makes her trust or distrust this?
- Would she complete the core action?

**Themba (ECD teacher, Huawei, time-pressed)**
- Can he find what he needs in <5 seconds?
- What would frustrate him?
- What would make him come back tomorrow?

**Admin (you, looking at dashboards)**
- Is the data clear and actionable?
- Are there ambiguous numbers?

## Step 3: Design System Compliance Check

Go through every element:

```
Typography:
□ Page title: text-2xl font-black? ___
□ Section labels: text-xs uppercase tracking? ___
□ Body: text-sm text-slate-600 leading-relaxed? ___

Spacing:
□ Content padding consistent? ___
□ Card gaps using space-y-6? ___
□ Internal card padding consistent? ___

Colors:
□ Primary actions use brand cyan? ___
□ Warnings use amber? ___
□ Success uses emerald? ___
□ No random hex values? ___

Borders & Shadows:
□ Cards: rounded-2xl + correct shadow? ___
□ Inputs: rounded-xl + cyan focus ring? ___
□ Overlays: rounded-2xl + correct backdrop? ___

Motion:
□ Hover states: 150ms transition? ___
□ Springs used for user-triggered changes? ___
□ No animation >500ms? ___
□ Reduced motion respected? ___
```

## Step 4: Issue Log
Format each issue as:
```
[SEVERITY] Element: [what it is]
Current: [describe or paste current code]
Problem: [why it's wrong]
Fix: [exact code change]
Impact: [who it affects and how]
```

Severity levels:
- 🔴 CRITICAL — breaks the flow or confuses the user so much they can't complete an action
- 🟡 MAJOR — makes the product feel unpolished or untrustworthy
- 🟢 MINOR — small inconsistency that only a designer would notice
- 💡 IDEA — not a problem but an enhancement worth considering

## Step 5: Implement Fixes
Work through CRITICAL and MAJOR fixes immediately. Show the exact code changes.

## Step 6: Verify
Open the browser agent. Navigate to the page at 375px and 1440px. Take screenshots. Confirm all critical issues are resolved.

## Delivery
Summary of:
- Score before: [X/10]
- Score after: [X/10]  
- Changes made: [list]
- Deferred: [list with reasons]
