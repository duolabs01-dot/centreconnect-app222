# CentreConnect: ChatGPT Planning Brief

Use this document as a ready-to-paste context pack for ChatGPT to plan the rest of your app and business.

## 1) Copy/Paste Master Prompt

```text
You are my product + engineering + GTM strategist for CentreConnect. I want a practical execution plan, not generic advice.

Business and product context:
- Product: CentreConnect
- What it does: ECD centre discovery, parent onboarding, and role-based operations dashboards.
- Users/roles:
  - Parent users
  - ECD admins/staff
  - Platform admin
- Current stack:
  - Next.js 14
  - Supabase (Auth, DB, Storage)
  - Paystack integration for billing collection/webhooks
- Current state:
  - Core auth and role-based routing exist.
  - Parent, ECD, and admin areas exist.
  - Billing scaffold exists but production-hardening is incomplete.
  - Admin production checklist highlights pending items in billing automation, reliability, security, testing, and observability.
- Known constraints:
  - Small team/founder-led execution
  - Need to prioritize highest ROI features
  - Need to ship reliably while reducing risk

What I need from you:
1) Build a 90-day plan split into 3 phases:
   - Phase 1 (stabilize)
   - Phase 2 (monetize)
   - Phase 3 (scale)
2) For each phase, provide:
   - Objectives
   - Deliverables (product + business)
   - Detailed task list (engineering, product, ops, sales/marketing)
   - Dependencies
   - Success metrics/KPIs
   - Risks + mitigations
3) Produce a prioritized backlog table with:
   - Item
   - Why it matters
   - Impact score (1-10)
   - Effort score (1-10)
   - Owner role
   - Target week
4) Define the business model clearly:
   - Ideal customer profile (ICP)
   - Pricing strategy (starter/standard/pro tiers)
   - Revenue assumptions for 6 and 12 months
   - Key unit economics to track weekly
5) Create a go-to-market plan:
   - Positioning statement
   - Acquisition channels
   - Sales pipeline stages
   - Weekly operating cadence (what I should do each week)
6) Create an execution operating system:
   - Weekly dashboard (5-10 metrics max)
   - Meeting rhythm
   - Decision framework for what to build next
7) Call out what NOT to do in the next 90 days.

Important:
- Be specific and tactical.
- Use assumptions where needed, but label them clearly.
- Prefer simple, high-leverage moves over complexity.
- Return output in clean markdown with sections and tables.
- End with: "Top 5 actions for this week".
```

## 2) Fill These Inputs First (Optional but Recommended)

Paste this below the master prompt and fill it out:

```text
My current numbers:
- Active centres:
- Active parents:
- Monthly recurring revenue (MRR):
- Churn rate:
- Avg time to onboard a centre:
- Monthly budget runway:

My market focus:
- Geography:
- Language priorities:
- Centre type focus (independent, franchise, NGO, etc.):

My constraints:
- Team size:
- Hours/week I can commit:
- Budget for tools/ads:

My near-term goals:
- 30-day target:
- 90-day target:
```

## 3) Follow-Up Prompt Sequence (Use After Master Output)

### Prompt A: Product roadmap detail

```text
Turn the 90-day plan into a week-by-week roadmap with explicit deliverables per week.
Include acceptance criteria for each deliverable.
```

### Prompt B: Technical execution detail

```text
Translate the roadmap into an engineering plan for a Next.js + Supabase app.
For each engineering item, include:
- DB/migration changes
- API changes
- UI pages/components affected
- test strategy
- rollout strategy
```

### Prompt C: Sales + growth playbook

```text
Create a founder-led sales playbook for signing ECD centres.
Include outreach scripts, qualification criteria, objections handling, pilot offer, and closing workflow.
```

### Prompt D: Financial model

```text
Build a simple monthly model (next 12 months) with scenarios: conservative, base, aggressive.
Show drivers, assumptions, and break-even point.
```

## 4) Context You Can Add (From Repo)

If useful, also mention:
- `docs/ADMIN_V1_PRODUCTION_CHECKLIST.md` for pending admin/billing hardening work.
- `docs/QA.md` for quality gates and release checks.
- `SETUP.md` and `DEPLOYMENT.md` for environment/deploy constraints.

## 5) What Good Output Looks Like

You should expect:
- A prioritized plan that balances product, revenue, and risk.
- Clear weekly execution, not just strategy slides.
- Explicit tradeoffs and what to defer.
- A short list of immediate actions you can execute this week.
