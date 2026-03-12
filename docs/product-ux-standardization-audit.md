# CentreConnect Product UX Standardization Audit

Date: 2026-03-11

Scope:
- Parent surface
- ECD operator surface
- CentreConnect/platform admin surface

Method:
- Codebase audit of live routes, layouts, shells, navigation, representative pages, shared UI primitives, and existing UI guidance.
- Benchmark used: current CentreConnect patterns where they are working, plus standard shadcn-style product conventions for hierarchy, clarity, and interaction discipline.

## A. Executive Summary

CentreConnect does not currently feel like one product. It feels like one database wrapped in three different design directions:

- Parent is warm, hopeful, and closest to the right emotional lane.
- ECD is useful and grounded in real work, but it is too large, too route-heavy, and too inconsistent from page to page.
- Admin is the biggest break in coherence. It currently looks and sounds like a separate cyber-noir software product.

The core problem is not missing features. The core problem is design discipline:

- too many visual languages
- too many component systems
- too many routes for the same job
- too much copy inflation (`premium`, `command`, `intelligence`, `next generation`)
- too many screens trying to do everything at once

Blunt verdict by surface:

- Parent: strongest direction, but still fragmented and emotionally inconsistent at auth, dashboard, and profile.
- ECD: useful but overloaded; navigation and settings complexity are hurting simplicity.
- Admin: reject the current long-term design direction. Keep the data and workflows, not the cyber theatre.

The most important product truth from this audit:

CentreConnect should feel like one calm, trustworthy system that helps three different people do three different jobs. Right now it too often feels like three unrelated products sharing the same backend.

## B. By-Surface Findings

### 1. Parent

What is working:

- The public landing and directory are the closest thing in the app to a coherent emotional product direction.
- The parent-facing card language in discovery is warmer, more local, and more action-oriented than the ops surfaces.
- Trust and next-step patterns are starting to exist in the right places.

Key issues:

1. Parent auth feels like the wrong product.
   - Evidence:
     - Route: `/login`
     - Route: `/register`
     - Files:
       - `app/(auth)/login/page.tsx`
       - `app/(auth)/register/page.tsx`
   - Problem:
     - Parent login and sign-up use a dark split-screen layout, `components/cc-admin/BrandMark`, and phrases like `next generation`, `powerful`, and `low-latency platform`.
     - This is founder/admin language, not parent reassurance language.
   - Why it matters:
     - Parents arrive anxious and practical. They need safety, clarity, and a simple promise. They do not need to feel like they are entering enterprise software.
   - Standardization direction:
     - Rewrite auth around trust-first parent language and reuse the public/parent visual system instead of the admin-adjacent look.

2. Parent discovery is split across too many entry points.
   - Evidence:
     - Routes:
       - `/directory`
       - `/parent/discover`
       - `/c/[slug]`
       - `/centre/[slug]`
       - `/apply/[identifier]`
       - `/parent/shortlist`
       - `/parent/compare`
     - Files:
       - `app/(journey)/directory/page.tsx`
       - `components/directory/DirectoryExplorer.tsx`
       - `app/(journey)/parent/discover/discover-client.tsx`
       - `components/parent/CentreCard.tsx`
   - Problem:
     - The same parent job is represented as public directory, parent discovery, public centre detail, centre detail, shortlist, compare, and application entry.
     - The product logic is valid, but the route model is too fragmented.
   - Why it matters:
     - Parents should feel like they are moving through one journey, not hopping between multiple nearly-similar surfaces.
   - Standardization direction:
     - Treat public discovery and signed-in discovery as one continuous flow with one card language, one detail language, and one application entry pattern.

3. The parent shell is polished, but it is still slightly over-designed and task order is fuzzy.
   - Evidence:
     - Files:
       - `components/layout/parent-app-shell.tsx`
       - `components/layout/bottom-nav.tsx`
       - `lib/navigation/parent-bottom-nav.ts`
   - Problem:
     - The shell uses premium/glass language and decorative flourishes that are fine in isolation, but the nav priorities are not fully clean.
     - Desktop tabs treat `Notifications` and `Profile` like primary jobs.
     - Bottom nav disappears on some routes, which changes the navigation model mid-flow.
   - Why it matters:
     - Parents need a stable mental model: where am I, what can I do, what comes next.
   - Standardization direction:
     - Reduce the parent primary nav to the true jobs and keep the shell calmer.

4. The dashboard is too long and too branch-heavy.
   - Evidence:
     - Route: `/parent/dashboard`
     - Files:
       - `app/(journey)/parent/dashboard/page.tsx`
       - `app/(journey)/parent/dashboard/_sections/profile-readiness-card.tsx`
       - `components/parent/next-best-action-strip.tsx`
   - Problem:
     - The dashboard tries to be a home, status center, checklist, discovery prompt, application feed, report hub, event board, and notification preview at the same time.
     - It has real product state, but it does not feel tight.
   - Why it matters:
     - A parent dashboard should reduce anxiety and highlight one or two next actions, not force a long vertical scan.
   - Standardization direction:
     - Compress the dashboard into one state-driven hero, one next-best-action strip, and a small number of secondary modules.

5. Profile is emotionally off: too much "account app", not enough calm utility.
   - Evidence:
     - Route: `/parent/profile`
     - Files:
       - `components/parent/ParentProfileEditor.tsx`
       - `app/(journey)/parent/profile/page.tsx`
       - `app/(journey)/parent/children/page.tsx`
   - Problem:
     - The profile hub uses a social/profile style, a dark `Readiness Score` card, a bottom sheet editing pattern, and several visual treatments that feel disconnected from the calmer discovery flow.
     - `Child Profiles` is also more dramatic than it needs to be.
   - Why it matters:
     - Parent profile should feel safe, boring in the good way, and easy to complete.
   - Standardization direction:
     - Turn profile into a checklist-driven utility area, not a stylized mini-app of its own.

6. Parent trust labels still lean too hard on brand adjectives.
   - Evidence:
     - Files:
       - `app/(journey)/page.client.tsx`
       - `components/parent/CentreCard.tsx`
       - `app/(journey)/parent/discover/discover-client.tsx`
   - Problem:
     - `PremiumVerifiedBadge` is visually attractive, but the product meaning is not always immediately obvious to a parent.
     - Parents care about "Can I trust this? Can I apply? Is it registered? What happens next?"
   - Why it matters:
     - Trust should come from simple proof, not abstract prestige language.
   - Standardization direction:
     - Rename and simplify trust signals into clearer parent language.

### 2. ECD Operator

What is working:

- The ECD dashboard is closer to real product logic than most surfaces in the app.
- Attendance, admissions, children, and compliance map to real centre workflows.
- The general visual tone is calmer than admin and more grounded than the parent shell.

Key issues:

1. The ECD navigation is too large for daily use.
   - Evidence:
     - File: `components/layout/ecd-navigation.ts`
     - File: `components/layout/ecd-portal-sidebar.tsx`
   - Problem:
     - The live ECD nav has 16 top-level destinations.
     - This breaks the founder's own rule that the sidebar should stay at 8 items or fewer.
   - Why it matters:
     - A crèche operator should not have to think about 16 places to click before 9am.
   - Standardization direction:
     - Collapse the ECD surface around the operator's actual jobs: Dashboard, Admissions, Children, Attendance, Calendar, Parent Comms, Billing/Compliance, Settings.

2. A live nav item still lands on a `Coming Soon` page.
   - Evidence:
     - File: `components/layout/ecd-navigation.ts`
     - Route: `/ecd/whatsapp-alerts`
     - File: `app/ecd/(portal)/whatsapp-alerts/page.tsx`
   - Problem:
     - The nav implies a usable capability, but the page is a placeholder.
   - Why it matters:
     - This weakens trust immediately for operators. In ops software, dead ends feel like broken promises.
   - Standardization direction:
     - Remove placeholders from live operator navigation. If a capability is not usable, it should not consume a primary nav slot.

3. ECD consistency depends too much on each page because `EcdOsShell` is effectively empty.
   - Evidence:
     - File: `components/layout/ecd-os-shell.tsx`
   - Problem:
     - The shell does almost nothing beyond wrapping children.
     - Real consistency is being hand-authored page by page.
   - Why it matters:
     - That is why some ECD pages feel calm and others drift into other design languages.
   - Standardization direction:
     - Give ECD one real page template with shared header, page actions, content width, and section rules.

4. ECD settings is a kitchen sink, not a low-training settings experience.
   - Evidence:
     - Route: `/ecd/profile`
     - File: `app/ecd/(portal)/profile/page.tsx`
   - Problem:
     - This one page tries to do centre basics, location, classrooms, aftercare, public visibility, account details, notification preferences, staff management, cancellation, and danger zone.
   - Why it matters:
     - Operators do not think in giant settings pages. They think in small, specific admin jobs.
   - Standardization direction:
     - Split settings into focused sections or subroutes: Centre Profile, Team, Notifications, Billing, and Safety.

5. Some ECD pages leak admin/cyber language and styling.
   - Evidence:
     - Route: `/ecd/financials`
     - Files:
       - `app/ecd/(portal)/financials/page.tsx`
       - `app/ecd/(portal)/financials/pl-chart.tsx`
       - `app/globals.css`
   - Problem:
     - ECD financials uses `font-orbitron`, `text-cyber-cyan`, dark cyber chart styling, and labels like `Financial Intelligence`.
   - Why it matters:
     - The ECD portal should feel operational and familiar, not like founder analytics software.
   - Standardization direction:
     - Keep ECD in one calm operator theme. No cyber typography, no neon semantics, no admin mood bleed.

6. The applications area is useful, but still too broad and cognitively heavy.
   - Evidence:
     - Routes:
       - `/ecd/applications`
       - `/ecd/applications/[id]`
     - Files:
       - `app/ecd/(portal)/applications/page.tsx`
       - `app/ecd/(portal)/applications/[id]/page.tsx`
   - Problem:
     - The inbox includes many tabs, policy settings, blocked state handling, search, mobile cards, tables, and multiple action concepts.
     - The detail page is richer and clearer, but the overall admissions system still feels more complex than it should.
   - Why it matters:
     - Admissions should feel like "review, request, decide", not a mini back-office system.
   - Standardization direction:
     - Make the default admissions view a simple triage inbox first. Move secondary policy controls out of the main list page.

7. Child onboarding tries to serve two different mental models in one place.
   - Evidence:
     - Route: `/ecd/children/new`
     - File: `app/ecd/(portal)/children/new/page.tsx`
   - Problem:
     - `Quick Add` and full profile are both valid, but the page still asks the operator to choose between two workflows on the same screen.
   - Why it matters:
     - This is close to being good, but it needs firmer hierarchy so the default path is obvious.
   - Standardization direction:
     - Make `Quick Add` the default first-run route and keep the full form as an advanced path.

8. ECD onboarding/signup is high-friction before the user sees value.
   - Evidence:
     - Route: `/ecd/register`
     - File: `app/ecd/register/page.tsx`
   - Problem:
     - The 4-step register flow asks for operational and pricing details before the product has earned that effort.
   - Why it matters:
     - This is a centre acquisition problem, not just a form design problem.
   - Standardization direction:
     - Reduce the initial setup to the minimum needed to start. Ask for deeper setup after first value.

### 3. CentreConnect / Platform Admin

What is working:

- The admin surface contains real operational truth.
- The founder can already see meaningful signals around centres, invites, payments, support, and reliability.
- Some page copy is already moving toward plain language on the dashboard and tenants list.

Key issues:

1. Admin looks like a different company.
   - Evidence:
     - File: `app/admin/admin-theme.css`
     - Files under `components/cc-admin/*`
     - Routes:
       - `/admin/dashboard`
       - `/admin/support`
       - `/admin/revenue`
       - `/admin/analytics`
       - `/admin/users`
       - `/admin/invites`
   - Problem:
     - The surface is cyber-noir, neon, all-caps, `Orbitron`, `CommandPalette`, `CyberCard`, `NeuralMap`, `HexHeatmap`, and operations jargon.
   - Why it matters:
     - The founder needs speed, trust, and clarity. He does not need a sci-fi control room.
   - Standardization direction:
     - Keep the information density and business signal. Remove the theatrics.

2. Admin is running at least two design systems at once.
   - Evidence:
     - Files:
       - `components/admin/admin-page-layout.tsx`
       - `components/ui/admin-stat-card.tsx`
       - `components/admin/admin-kpi-card.tsx`
       - `components/cc-admin/Button.tsx`
       - `components/cc-admin/Card.tsx`
       - `components/cc-admin/CyberCard.tsx`
       - `app/admin/tenants/[id]/page.tsx`
   - Problem:
     - Some admin pages use `cc-admin` primitives, some use `components/ui`, some mix both.
     - The tenant detail page proves the split clearly.
   - Why it matters:
     - A product cannot become coherent while its internal tools keep forking their own primitives.
   - Standardization direction:
     - Freeze `components/cc-admin/*` and move admin toward shared `components/ui/*` with a restrained admin theme variant.

3. Admin information architecture overlaps and duplicates itself.
   - Evidence:
     - Routes:
       - `/admin/dashboard`
       - `/admin/command`
       - `/admin/analytics`
       - `/admin/revenue`
       - `/admin/parent-reliability`
     - Files:
       - `app/admin/dashboard/page.tsx`
       - `app/admin/command/page.tsx`
       - `components/admin/platform-control-tower.tsx`
   - Problem:
     - There are multiple concepts for the same founder job: dashboard, operations, command, control tower, reliability, revenue ops.
     - `PlatformControlTower` exists as a separate conceptual system but is not the actual shell of the admin product.
   - Why it matters:
     - Founder admin should answer one question first: what needs action now?
   - Standardization direction:
     - Make one admin home. Treat the rest as supporting views, not parallel command surfaces.

4. The copy is still too theatrical and system-centric.
   - Evidence:
     - Files:
       - `app/admin/dashboard/page.tsx`
       - `app/admin/support/page.tsx`
       - `app/admin/revenue/page.tsx`
       - `app/admin/analytics/page.tsx`
       - `app/admin/users/page.tsx`
   - Problem:
     - Labels like `Founder command centre`, `Protocol`, `Node_Origin`, `AWAITING_ACTION`, `Event-Driven Billing Guidance`, `Incident Quick Access`, and `Financial Intelligence` create cognitive noise.
   - Why it matters:
     - Admin is for decision quality, not atmosphere.
   - Standardization direction:
     - Rewrite the admin tone to plain founder English: what happened, what matters, what to do next.

5. Table actions are often hidden behind hover, tiny labels, or dark chrome.
   - Evidence:
     - Files:
       - `app/admin/users/page.tsx`
       - `components/admin/SupportPageClientLayout.tsx`
       - `app/admin/invites/page.tsx`
   - Problem:
     - Important actions are visually secondary or rely on hover behavior that is weak on touch and slow for rapid scanning.
   - Why it matters:
     - Founder tooling should trade style for immediate actionability.
   - Standardization direction:
     - Keep actions visible, predictable, and close to the row state.

6. The command palette and cyber widgets are not the right complexity right now.
   - Evidence:
     - File: `app/admin/layout.tsx`
     - File: `components/cc-admin/CommandPalette.tsx`
   - Problem:
     - This is sophistication layered on top of a surface that still needs basic simplification.
   - Why it matters:
     - Advanced shortcuts only help after the underlying IA is clear.
   - Standardization direction:
     - Simplify first. Add power-user features only after the admin model is stable.

7. Even within admin, there are signs of the right direction being blocked by the old visual system.
   - Evidence:
     - Files:
       - `app/admin/tenants/page.tsx`
       - `app/admin/tenants/[id]/page.tsx`
   - Problem:
     - The tenants flows are conceptually strong and operationally useful, but the dark/cyber shell keeps making practical flows feel heavier than they need to.
   - Why it matters:
     - The admin foundation is not broken. The presentation layer is getting in the way.
   - Standardization direction:
     - Use tenants as the starting point for a calmer admin redesign.

## C. Systemic Issues Across All Surfaces

1. Three separate visual languages are active in production.
   - Parent: warm glass/premium
   - ECD: light operational with occasional admin bleed
   - Admin: cyber-noir

2. The repo contains multiple primitive layers for the same jobs.
   - `components/ui/*`
   - `components/admin/*`
   - `components/cc-admin/*`

3. There is too much page-local styling and too little shared interaction structure.
   - Evidence:
     - `app/globals.css`
     - `app/ecd/admin-theme.css`
     - `app/ecd/ecd-theme.css`
   - Result:
     - Consistency depends on individual page authors instead of system rules.

4. Marketing adjectives keep leaking into product surfaces.
   - `premium`
   - `command`
   - `intelligence`
   - `next generation`
   - `low-latency`
   - These words usually add mood, not clarity.

5. Navigation and route structure are broader than the mental model of the user.
   - Parent has too many parallel journey routes.
   - ECD has too many top-level destinations.
   - Admin has too many overlapping "overview" surfaces.

6. The product does not yet have one consistent "next action" pattern.
   - Some pages do this well.
   - Some pages have many equal-weight buttons.
   - Some pages rely on long scanning and nested choices.

7. Status language is not standardized enough.
   - There are multiple badge systems and multiple ways to explain state.
   - Some surfaces use friendly language, others use system language, others use theatrical language.

8. Some live routes still behave like roadmap placeholders instead of product.
   - Example: `/ecd/whatsapp-alerts`

9. Emotional clarity changes too sharply between entry points.
   - Parent landing says "trust".
   - Parent auth says "platform".
   - Admin says "command center".
   - The emotional through-line is weak.

10. The app is stronger in data and workflow truth than it is in design consistency.
   - This is good news.
   - The product does not need reinvention. It needs standardization and editing discipline.

## D. Proposed Design System / Interaction Standard

### 1. Product-Level Design Rule

CentreConnect should feel like one product family with three tone variants, not three independent themes.

Shared across all surfaces:

- Same base spacing rhythm
- Same core primitives
- Same form behavior
- Same status language
- Same header/action structure
- Same empty/loading/error patterns

Recommended default primitive layer:

- `components/ui/*` becomes the default base
- shadcn-style `Button`, `Card`, `Input`, `Badge`, `Table`, `Sheet`, `Dialog`, `Tabs`, `Select`
- Lucide only
- one shared `StatusBadge`
- one shared `PageHeader`
- one shared KPI/stat tile pattern

Hard rule:

- No new `components/cc-admin/*`
- No new one-off visual language per surface

### 2. Surface Tone Standard

Parent:

- Warm, light, breathable
- Cream and warm white backgrounds
- Teal as action color
- Amber only for trust/supporting proof
- Fewer hard shadows, fewer decorative hero treatments inside product screens

ECD:

- Neutral operational light theme
- White/slate surfaces with teal accent
- Medium density
- Strong row/card grouping
- No cyber fonts, no neon semantics

Admin:

- Calm operational theme, not cyber-noir
- Dark is acceptable only if restrained
- Prefer charcoal/slate with one accent color and very limited glow
- Most cards and tables should look like sober internal tooling, not a concept demo

### 3. Navigation Standard

Parent primary nav:

- Dashboard
- Discover
- Applications
- Children or Inbox
- Profile

ECD primary nav:

- Dashboard
- Admissions
- Children
- Attendance
- Calendar
- Parent Comms
- Billing/Compliance
- Settings

Admin primary nav:

- Home
- Centres
- Support
- Revenue
- Reliability
- Activity

Everything else should be secondary navigation inside those areas, not new top-level identity.

### 4. Page Structure Standard

Every important page should follow this order:

1. Eyebrow or context label
2. Clear page title
3. One-sentence explanation of why this page matters
4. One primary action
5. Optional one or two secondary actions
6. State summary or KPI strip
7. Main work area

Ban:

- giant decorative headers with weak action hierarchy
- more than one "main" card competing for attention at the top
- hidden critical actions on hover only

### 5. Copy Standard

Use verbs people understand:

- Find a creche
- Review applications
- Mark attendance
- Message parent
- Open billing
- Fix failed payment

Avoid inflated nouns:

- command center
- intelligence
- premium
- next generation
- low-latency
- neural
- protocol

### 6. Status Standard

Use plain-language states everywhere:

- Draft
- Action needed
- Waiting
- Active
- Complete
- Issue

Then add small helper text when the user needs more context.

### 7. Form Standard

- One primary submit path per form
- Inline field help only where needed
- Large multi-step forms only when the user truly cannot complete the job in one screen
- Support text must explain consequence, not marketing value

### 8. Table and Dense Ops Standard

- Search and filters always visible above the table
- Row actions always visible or in a clear menu button, not hover-only
- Strong mobile fallback cards
- One status badge style
- One density rhythm

### 9. Empty State Standard

Every empty state should answer:

- What is missing
- Why it matters
- What the user should do next

No vague placeholders. No roadmap language in live product surfaces.

## E. Emotional Design Guidance For CentreConnect

CentreConnect is not supposed to feel flashy. It is supposed to feel relieving.

Parent emotional target:

- before: anxious, uncertain, overloaded
- after: reassured, informed, moving forward

ECD emotional target:

- before: busy, paper-heavy, skeptical
- after: in control, clear on next steps, less burdened

Founder/admin emotional target:

- before: scattered, reacting, unsure where to start
- after: sees the signal, trusts the data, acts quickly

Emotional rules:

1. Warmth should come from clarity, local language, and proof. Not from decoration.
2. Trust should come from real signals:
   - verified listing
   - registered status
   - application status
   - document completeness
   - direct next step
3. Celebration should be rare and earned.
   - Confetti on a meaningful success is fine.
   - Constant "premium" treatment is not.
4. Parents should see "creche" consistently on parent-facing surfaces.
   - Internal/admin language can use `centre`.
   - Do not bounce between both without intent.
5. Checklists beat scores when the user needs to finish work.
   - `Ready to apply` is better than `Readiness Score`.
   - `Set up these 3 things` is better than a stylized progress card with vague meaning.
6. Serious tasks should feel calm.
   - Attendance, applications, payments, compliance, and support should never feel playful or sci-fi.

## F. Prioritized Fixes By Impact / Effort

1. Freeze the cyber-noir admin design system and stop adding to `components/cc-admin/*`.
   - Impact: Very high
   - Effort: Low
   - Why first: This stops the coherence problem from getting worse while other fixes land.

2. Rewrite parent login and sign-up into the parent/public visual and copy system.
   - Impact: Very high
   - Effort: Low to medium
   - Files:
     - `app/(auth)/login/page.tsx`
     - `app/(auth)/register/page.tsx`
   - Why first: The emotional opening for parents is currently wrong.

3. Reduce ECD top-level nav to 8 items or fewer and remove live `Coming Soon` destinations.
   - Impact: Very high
   - Effort: Medium
   - Files:
     - `components/layout/ecd-navigation.ts`
     - `components/layout/ecd-portal-sidebar.tsx`
     - `app/ecd/(portal)/whatsapp-alerts/page.tsx`

4. Standardize shared page headers, KPI cards, action strips, and status badges across all surfaces.
   - Impact: High
   - Effort: Medium
   - Files:
     - `components/ui/surface-card.tsx`
     - `components/ui/status-badge.tsx`
     - `components/admin/admin-page-layout.tsx`
     - related page headers in parent/ECD/admin

5. Simplify the parent dashboard into one state-driven top section and fewer modules.
   - Impact: High
   - Effort: Medium
   - Files:
     - `app/(journey)/parent/dashboard/page.tsx`
     - `app/(journey)/parent/dashboard/_sections/*`

6. Rework parent profile from stylized account hub to calm checklist utility.
   - Impact: High
   - Effort: Medium
   - Files:
     - `components/parent/ParentProfileEditor.tsx`
     - `app/(journey)/parent/profile/page.tsx`

7. Split ECD settings into focused areas instead of one giant page.
   - Impact: High
   - Effort: Medium to high
   - File:
     - `app/ecd/(portal)/profile/page.tsx`

8. Remove admin jargon and convert admin copy to plain founder English.
   - Impact: High
   - Effort: Low to medium
   - Files:
     - `app/admin/dashboard/page.tsx`
     - `app/admin/support/page.tsx`
     - `app/admin/revenue/page.tsx`
     - `app/admin/analytics/page.tsx`
     - `app/admin/users/page.tsx`
     - `app/admin/invites/page.tsx`

9. Standardize admin on one calmer operational theme using shared primitives.
   - Impact: Very high
   - Effort: High
   - Files:
     - `app/admin/admin-theme.css`
     - `app/admin/layout.tsx`
     - `components/admin/*`
     - `components/cc-admin/*`

10. Consolidate parent discovery and detail route behavior.
    - Impact: Medium to high
    - Effort: High
    - Files/routes:
      - `/directory`
      - `/parent/discover`
      - `/c/[slug]`
      - `/centre/[slug]`
      - `/apply/[identifier]`

11. Strip cyber/admin bleed out of ECD financials and other outlier pages.
    - Impact: Medium
    - Effort: Low to medium
    - Files:
      - `app/ecd/(portal)/financials/page.tsx`
      - `app/ecd/(portal)/financials/pl-chart.tsx`

12. Audit and remove abandoned parallel admin concepts after the redesign direction is chosen.
    - Impact: Medium
    - Effort: Medium
    - Files:
      - `components/admin/platform-control-tower.tsx`
      - overlapping admin dashboard pages

## G. Recommended Next Implementation Sequence

### Phase 1: Stop the drift

- Freeze new `cc-admin` component work.
- Remove live placeholder routes from ECD nav.
- Write a short implementation brief from this audit before UI changes begin.

### Phase 2: Fix the emotional entry points

- Redesign parent login/register first.
- Align auth copy with the landing and directory promise.
- Make parent trust the first impression again.

### Phase 3: Simplify the operator surface

- Cut ECD nav down hard.
- Turn ECD shell into a real system-level layout pattern.
- Split ECD settings into smaller sections.

### Phase 4: Replace the admin visual language

- Keep the data model and workflows.
- Remove cyber-noir styling, all-caps micro labels, hover-hidden actions, and sci-fi widgets from the main operating flow.
- Standardize admin around one sober ops theme.

### Phase 5: Compress the parent product flow

- Simplify dashboard
- Simplify profile
- Normalize discovery, shortlist, compare, and apply around one consistent card and page system

### Phase 6: Final pass for coherence

- Standardize status language
- Standardize empty/loading/error states
- Standardize page headers and action bars
- Run cross-surface persona review before calling the system coherent

Recommended verification lane after each phase:

- `centreconnect-ui-guardian`
- `persona-review-panel`
- `centreconnect-verification`

## Plain-English Design Truths

- Parents do not want a platform. They want confidence.
- Crèche operators do not want more places to click. They want a short, reliable daily workspace.
- The founder does not want a sci-fi dashboard. He wants signal, priority, and fast action.
- One product should not feel like three startups sharing a database.
- Warmth should come from clarity and proof, not visual decoration.
- Every important screen should answer two questions fast: what matters now, and what do I do next?

## Key Files And Routes Inspected

Parent / public:

- `/`
- `/directory`
- `/login`
- `/register`
- `/parent/dashboard`
- `/parent/discover`
- `/parent/applications`
- `/parent/profile`
- `/parent/shortlist`
- `/parent/support`
- `app/(journey)/page.client.tsx`
- `app/(journey)/directory/page.tsx`
- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`
- `components/layout/public-shell.tsx`
- `components/layout/parent-app-shell.tsx`
- `components/layout/bottom-nav.tsx`
- `components/directory/DirectoryExplorer.tsx`
- `components/parent/CentreCard.tsx`
- `components/parent/ParentProfileEditor.tsx`

ECD:

- `/ecd/dashboard`
- `/ecd/applications`
- `/ecd/applications/[id]`
- `/ecd/children`
- `/ecd/children/new`
- `/ecd/attendance`
- `/ecd/communications`
- `/ecd/compliance`
- `/ecd/profile`
- `/ecd/financials`
- `/ecd/whatsapp-alerts`
- `/ecd/register`
- `/ecd/login`
- `app/ecd/(portal)/layout.tsx`
- `components/layout/ecd-navigation.ts`
- `components/layout/ecd-portal-sidebar.tsx`
- `components/layout/ecd-os-shell.tsx`
- `components/ecd/trial-status-banner.tsx`
- `components/ecd/TodayWidgets.tsx`

Admin:

- `/admin/dashboard`
- `/admin/tenants`
- `/admin/tenants/[id]`
- `/admin/support`
- `/admin/revenue`
- `/admin/analytics`
- `/admin/users`
- `/admin/invites`
- `/admin/command`
- `app/admin/layout.tsx`
- `app/admin/admin-theme.css`
- `components/admin/admin-shell.tsx`
- `components/admin/admin-sidebar.tsx`
- `components/admin/admin-page-layout.tsx`
- `components/admin/admin-tenants-table.tsx`
- `components/admin/SupportPageClientLayout.tsx`
- `components/admin/revenue-operations.tsx`
- `components/admin/platform-control-tower.tsx`
- `components/cc-admin/CyberCard.tsx`
- `components/cc-admin/Button.tsx`
- `components/cc-admin/Card.tsx`
