# CentreConnect Persona Audit (Thorough)

**Date:** 2026-03-12  
**Scope:** UI/UX, workflow logic, user-friendliness, offer/plan clarity, copy quality, and role/tier coherence  
**Method:** Codebase walkthrough + route architecture review + recent simplification changes + conversion-risk lens for real ECD onboarding

---

## Executive Verdict

CentreConnect has a **strong product core** with meaningful operational value (attendance, child records, admissions, parent comms, billing), but the experience still suffers from **choice overload, duplicated pathways, and inconsistent plan gating in the user’s mental model**.

### Overall Product Grade: **7.4 / 10**

- **Strength:** Real utility exists today (especially fast child digitization + attendance + parent linking).
- **Primary Risk:** Friction in navigation and workflow branching creates cognitive tax; users ask “where do I do this?” too often.
- **Conversion Impact:** Medium-high risk on first-week retention for non-technical ECD operators.

### Ship/No-Ship Verdict

- **Shipable for controlled pilots:** **Yes**
- **Ready for broad self-serve scale without human hand-holding:** **Not yet**

---

## Persona-by-Persona Audit

## 1) ECD Owner/Admin Persona

### What this persona needs
- Fast setup, low ambiguity, confidence in "what to do now"
- Clear ROI in first session
- Plan boundaries that feel fair and predictable

### Rating
- **UI/UX:** 7.1/10
- **Workflow logic:** 6.8/10
- **User-friendliness:** 7.0/10
- **Offer/tier clarity:** 6.7/10
- **Copy quality:** 7.8/10

### Verdict
Powerful but still mentally heavy. The recent nav regrouping helps, but there are still overlapping surfaces and too many “alternate ways” for similar jobs.

### High-friction examples
- Parallel import paths (attendance import vs children bulk add) can still feel like separate tools for one intent.
- Some advanced tabs appear too early in the journey for Starter-tier operators.
- Settings/profile area carries operational toggles that could be better progressive-disclosed.

---

## 2) ECD Staff/Supervisor Persona

### What this persona needs
- Narrow role-specific scope
- Fast daily loop (attendance, reports, comms)
- Minimal exposure to admin-only complexity

### Rating
- **UI/UX:** 7.4/10
- **Workflow logic:** 7.0/10
- **User-friendliness:** 7.5/10
- **Role clarity:** 7.2/10
- **Copy quality:** 7.6/10

### Verdict
Good direction, but role boundary cues should be even stronger. Staff should almost never wonder about billing/plan/provisioning concepts.

---

## 3) Parent Persona

### What this persona needs
- Trust + clarity + low form anxiety
- Obvious progress and recoverability
- Strong mobile-first reliability

### Rating
- **UI/UX:** 7.9/10
- **Workflow logic:** 7.6/10
- **User-friendliness:** 8.0/10
- **Offer clarity:** 7.3/10
- **Copy quality:** 8.2/10

### Verdict
Parent surfaces are generally clearer than ECD admin surfaces. Biggest remaining opportunity is reducing repeated/overlapping language in onboarding and profile completion prompts.

---

## 4) Platform Admin Persona (Founder/Operator)

### What this persona needs
- One control plane
- Strong accountability visibility
- Minimal hunting for controls

### Rating
- **UI/UX:** 7.3/10
- **Workflow logic:** 7.1/10
- **Decision support quality:** 7.4/10
- **Actionability:** 7.0/10
- **Copy quality:** 7.7/10

### Verdict
Recent additions (HQ, task router, accountability board) are exactly right. Remaining issue: still too many routes and labels that require internal context to interpret quickly.

---

## Cross-Cutting Audit Dimensions

## A) UI/UX Consistency — **7.2/10**
**What works**
- Strong visual identity and consistent modern component language.
- Good use of cards, badges, and status affordances.

**What hurts**
- Navigation breadth remains high in ECD surfaces.
- Some screens combine execution + education + diagnostics in one dense panel.

## B) Workflow Logic Simplicity — **6.9/10**
**What works**
- Core data model supports real operational workflows.
- Fallback pathways exist (important for reliability).

**What hurts**
- Multiple routes can satisfy one user intent, causing uncertainty.
- Some flows still branch too early instead of guiding a primary happy path first.

## C) User-Friendliness — **7.4/10**
**What works**
- Practical copy tone, mostly plain language.
- Strong action labels in many areas.

**What hurts**
- New users still need a “what next” simplification mode in more sections.

## D) Offers / Pricing / Tier Model — **6.8/10**
**What works**
- Tier definitions exist and are meaningful.
- Entitlement primitives are present and reusable.

**What hurts**
- Tier distinctions were not always reflected in menu visibility (being addressed now).
- Value messaging should tie each tier to concrete operational outcomes more aggressively.

## E) Copy & Messaging Quality — **7.9/10**
**What works**
- Human tone and clarity are above average.
- Parent-facing language is mostly trust-building.

**What hurts**
- Some admin copy still sounds implementation-centric vs outcome-centric.

---

## Strategic Risk Register (Top 8)

1. **Navigation sprawl** can suppress first-week ECD retention.
2. **Parallel workflow surfaces** increase training burden.
3. **Tier perception mismatch** reduces trust in packaging fairness.
4. **Advanced options too visible too early** increases overwhelm.
5. **Inconsistent route naming semantics** harms scanability.
6. **Founder/operator route breadth** can slow high-priority response.
7. **Feature discoverability depends on memory** instead of guided intent routing.
8. **Copy occasionally explains mechanics, not outcomes**.

---

## Concrete Merge/Delete Recommendations

## Immediate (low risk, high impact)
1. Keep **one canonical bulk child import entry** (`/ecd/children/new#bulk-existing-children`).
2. Keep attendance page as manual reliability center; avoid parallel “smart import hubs” for the same intent.
3. Continue sidebar minimization: hide advanced items unless role+tier eligible.
4. Show locked features as upsell cards only where contextually relevant, not as core task noise.

## Next (medium scope)
1. Merge/retire overlapping “applications vs pipeline” framing into one primary admissions workspace with mode toggles.
2. Move rarely used admin maintenance functions behind a secondary settings layer.
3. Introduce a persona-first “Today mode” dashboard for staff/supervisors with only 4–6 actions.

## Later (higher scope)
1. Global “Task Router” pattern for ECD side (not only platform admin).
2. Unified workflow map: Onboard child -> Attendance -> Parent engagement -> Billing follow-up.
3. Tier-aware product tours: show only what current plan can act on.

---

## Copy/Offer Improvements (High-leverage)

1. Replace feature labels with outcome labels where possible:
   - "DSD Export" -> "DSD Monthly Export"
   - "Communications" -> "Parent Messages"
2. For each tier-locked item, show one-line value proposition:
   - "Unlock Growth to automate parent updates and reduce manual follow-ups."
3. In registration and billing surfaces, consistently map Starter/Growth/Pro to expected operator outcomes in 30 days.

---

## Final Verdict by Category

- **UI/UX:** Good foundation, still too broad in operational surfaces.  
- **Logic:** Strong domain logic, needs stricter single-path UX for common jobs.  
- **User-friendliness:** Improving, but simplification must remain relentless.  
- **Offers/Tiers:** Solid model, enforcement + communication still catching up.  
- **Copy:** Generally strong and human; should become even more outcome-first.

## Final Product Verdict

CentreConnect is **close to excellent** for ECD operations, but still in a **transition state** between “powerful” and “effortless.”

To win adoption at scale, the north star should be:

> **One obvious place per job, one primary path per intent, and plan boundaries that are visible and trusted.**

