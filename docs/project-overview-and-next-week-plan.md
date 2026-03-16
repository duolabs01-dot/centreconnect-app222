# CentreConnect Project Overview + Next Week Plan

_Last updated: 2026-03-12_

## 1) Product Summary

CentreConnect is a multi-sided platform focused on Early Childhood Development (ECD) operations and parent engagement.

### Core sides
- **Parent side**
  - Discover and compare centres
  - Save/shortlist centres
  - Submit and track applications
  - Manage child profiles + documents
  - Receive updates/notifications and daily reports
- **ECD side (owner/admin/staff/supervisor)**
  - Child roster + onboarding
  - Attendance and register import flows
  - Parent communications
  - Calendar and daily reports
  - Billing/compliance/website/report-cards (tier-gated)
- **Platform admin side**
  - Tenants, revenue, support, parent reliability, webhook failures
  - AI Company OS + OpenClaw ops visibility
  - Company HQ planning and accountability surfaces

## 2) Current Architecture (high level)

### App stack
- Next.js App Router
- TypeScript
- Supabase (auth, data, storage)
- Tailwind + shadcn/ui component primitives
- Framer Motion for app-like interactions
- OCR pipeline using Tesseract (with preprocessing variant)

### Major route families
- `/parent/*`
- `/ecd/*`
- `/admin/*`
- Public journey routes (`/`, `/directory`, `/for-centres`, etc.)

### Operational surfaces
- `/admin/hq` → strategic planning + hierarchy + role accountability
- `/admin/command` → operations command center + SLA/agent lanes
- `/admin/openclaw` → automation runtime / delegated lane telemetry

---

## 3) Feature Inventory (What exists now)

## Parent
- Directory/discover surface with distance-aware cards
- Saved centres / shortlist
- Compare centres
- Application tracking and timeline
- Profile management (guardians, emergency, docs)
- Notifications (shared inbox concept currently evolving)
- Parent dashboard with enrolled-state experience and “continue where you left off” card

## ECD
- Dashboard and role-based side navigation
- Child roster management
- Child enrollment wizard
- Bulk add existing children from register photo
- Attendance register import tools
- Calendar and daily reporting
- Communications surface
- Tier-gated modules: financials, compliance, report cards, website

## Platform Admin
- Tenant/centre management and activation lifecycle
- Revenue and support operations
- Parent reliability and webhook triage
- Company HQ strategic board
- Agent performance board (HQ + command) with stale-lane signal

## AI / Automation Layer
- AI Company OS snapshots and planning lanes
- OpenClaw runtime integration showing active/queued/completed lane status
- Delegated work visibility on dashboard/HQ/command

---

## 4) Key Improvements Completed Recently

## Reliability + build stability
- Fixed multiple Vercel build blockers caused by untracked modules and prop mismatches.
- Added missing tracked modules and resolved type/API mismatch points.
- Repeated lint/build/test passes to keep deployment green.

## Admin information architecture
- Regrouped admin nav into clearer sections.
- Added “Where do I do this?” task-router pattern.
- Added role accountability and agent performance boards.
- Redirected `/admin` to `/admin/hq` for canonical entry.

## ECD nav/tier behavior
- Simplified ECD nav groups and reduced overlap.
- Enforced server-side tier gating for gated modules.
- Added locked/upgrade affordances in nav.

## Parent simplification
- Bottom nav simplified (removed confusing search/discover for enrolled logic path).
- Added more practical continuation cues in dashboard.
- Apply surface now bridges to Saved/Compare logic better.

## Motion/app feel
- Bottom nav now has spring-based interactions.
- Buttons have tactile micro-interactions.
- Parent shell transitions implemented for route changes.

## OCR extraction hardening
- Added numbered-list parsing for handwritten list style.
- Added preprocessing-enhanced OCR variant using sharp before Tesseract.
- Added larger server action body limit for image uploads.
- Improved error messaging and crash-safe handling.

---

## 5) Known Issues / Risk Areas

## A) Handwritten OCR (critical)
Even with preprocessing + numbered parsing, certain images (especially **photos of screens with moiré/noise**) remain low-quality for accurate extraction.

### Observed behavior
- Flow no longer hard-crashes.
- OCR can still produce gibberish names on poor-quality handwritten captures.

### Why this matters
This feature is a flagship onboarding value driver for ECD centres moving paper-to-digital.

## B) Design-system consistency debt
A project-wide design audit script exists and catches drift (raw hex colors, hierarchy issues), but migration to fully semantic token naming is still incomplete.

## C) Parent notifications model
Current notifications/inbox concept may still feel half-formed; needs clearer mental model and action semantics.

## D) Automation/AI lane execution maturity
Visibility is improved, but lane control actions still need persistence and stronger enforcement to feel like true autonomous execution.

---

## 6) Commercial/Conversion Positioning (ECD)

Current direction (implemented in key surfaces):
- Explain value before price
- Pilot offer messaging highlighted:
  - **Onboarding fee waived until end of next month**
- Founder note restored in conversion journey

Still needed:
- Stronger emotional storyline around owner pain resolution
- Cleaner “why now” messaging and risk reduction narrative

---

## 7) Recommended Next Week Plan (Detailed)

## MONDAY — OCR Reliability Sprint (P0)
### Goal
Make extraction flow “never dead-end” and useful even on weak images.

### Tasks
1. **Best-effort mode** for bulk extraction
   - If OCR quality is poor, still return editable candidate rows (not hard fail).
2. **Confidence tiering**
   - Tag each candidate as high/medium/low confidence.
3. **Manual recovery UX**
   - Table view for 20–30 names with keyboard-friendly editing.
4. **Quality detector**
   - Detect low OCR quality and display capture guidance early.
5. **Telemetry**
   - Log extraction quality metrics for tuning.

### Acceptance criteria
- User never sees generic dead-end for readable-but-poor images.
- At least one path always exists to complete child import.

---

## TUESDAY — Parent Saved/Apply/Compare Unification
### Goal
One clear parent funnel from interest to application.

### Tasks
1. Make Saved state persistent and visible in all relevant cards.
2. Surface saved centres inline in Apply context.
3. Add “apply later from saved” and “compare from saved” quick actions.
4. Improve enrolled-parent nav logic (context-aware tabs and labels).

### Acceptance criteria
- Parent immediately understands where saved items live and how they map to applying.

---

## WEDNESDAY — Notifications & Communication Model Redesign
### Goal
Replace “half-shared inbox” feeling with a clear communication system.

### Tasks
1. Split notification types:
   - Action required
   - Informational
   - System
2. Group by child/centre context.
3. Add clear next action CTA per thread.
4. Rename confusing labels (e.g., avoid “Parent comms” ambiguity for ECD staff).

### Acceptance criteria
- User can answer: what is this, who sent it, what should I do next?

---

## THURSDAY — ECD Conversion/Welcome Deep Upgrade
### Goal
If ECD owners land in public conversion routes, they should feel immediate fit and clarity.

### Tasks
1. Audit and refine `/for-centres`, `/for-centres/intro`, `/ecd/welcome`.
2. Lead with pains and outcomes before pricing.
3. Keep pilot offer and founder trust note visible at the right stage.
4. Add stronger social proof + implementation confidence cues.

### Acceptance criteria
- Conversion pages answer: “is this exactly what I need?” in first scroll.

---

## FRIDAY — Design System Migration Wave 3 + Email Branding
### Goal
Standardize UI quality and outbound trust touchpoints.

### Tasks
1. Token migration on another top-traffic wave.
2. Enforce semantic classes and remove literal color drift.
3. Run `npm run audit:design` and fix blockers.
4. Audit all outbound email templates:
   - branded header/footer
   - consistent CTA style
   - tone and compliance consistency

### Acceptance criteria
- Design audit violations reduced significantly on core user-facing paths.
- Email outputs are brand-consistent and conversion-ready.

---

## 8) Suggested Weekly Deliverables (for Claude refinement)

1. `docs/ocr-reliability-playbook.md`
2. `docs/parent-funnel-unification-spec.md`
3. `docs/notifications-model-v2.md`
4. `docs/ecd-conversion-copy-deck.md`
5. `docs/design-system-migration-wave3.md`
6. `docs/email-brand-standards.md`

---

## 9) Current Strategic Position

### What is already strong
- Platform breadth is real and meaningful.
- Operational control surfaces are maturing.
- Parent side is approaching pilot-ready quality.
- Tier gating and routing logic are much cleaner than before.

### What will determine success next
- OCR reliability for real-world handwritten imports
- Parent application funnel coherence
- ECD conversion clarity and emotional confidence
- Consistent UX system quality at scale

---

## 10) Open Questions for Next Refinement (Claude handoff)

1. Should low-confidence OCR entries auto-create draft placeholders for fast manual correction?
2. What is the canonical parent bottom-nav model for enrolled vs not-yet-enrolled users?
3. How should ECD communication be framed to avoid “just use WhatsApp” reversion?
4. What is the final tone balance between founder-led warmth and operational clarity in conversion pages?
5. Should agent-lane controls (reassign/disable/escalate) be fully persisted to DB next week?

---

## 11) Suggested Prompt to Continue with Claude

```text
Use docs/project-overview-and-next-week-plan.md as the source of truth.
Refine this into a concrete implementation plan with:
- PR-by-PR tasks
- exact file targets
- risk/rollback plan per PR
- UX copy drafts for parent + ECD conversion
- OCR fallback logic pseudocode and UI states
- acceptance tests for each day’s deliverable

Constraints:
- semantic token naming only
- no raw hex classes in touched files
- shadcn/ui for interactive components
- accessibility and contrast checks included
```

