# Founder Skill Operating Model

This is the default execution model for CentreConnect sessions.

## Core rule

Always use:
- `centreconnect-always`
- `fullstack-dev`

Then add only the 1-2 skills relevant to the current task.
Do not load all skills for every task.

## Task -> Skill mapping

- Onboarding UX, welcome pack, first-value flow:
  - `ecd-onboarding-specialist`
  - optional `solo-founder` for tradeoff decisions

- Growth and conversion experiments:
  - `community-growth`
  - `parent-acquisition`
  - `revenue-engine`

- Legal and policy changes:
  - `compliance-legal`

- Debugging and stability:
  - `debug-detective`

- Weekly prioritization:
  - `daily-standup`
  - `sprint-plan`

## Weekly cadence

Monday:
- Run `daily-standup`
- Pick one weekly outcome

Midweek:
- Re-run `sprint-plan` only if blockers change priorities

Friday:
- Review shipped outcomes
- Carry over only blocker-critical items

## Non-negotiable quality gate before push

1. `npm run check:onboarding`
2. `npm run build`
3. `npm run smoke:parent` (with local app running, or set `SMOKE_BASE_URL`)
