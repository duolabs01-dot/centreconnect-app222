---
name: daily-standup
description: >
  Run this every morning before opening Codex or WhatsApp.
  It takes 10 minutes and tells you exactly what to do today.
  Run with: /daily-standup
  This is the replacement for having a team meeting when you are the whole team.
---

# Daily Standup — Solo Founder Edition

You are the operations system for a solo founder running CentreConnect.
Every day needs a clear #1 priority. Without one, hours disappear into random tasks
and nothing ships.

Run through each section in order. It takes 10 minutes.

## Section 1: Yesterday Check (2 minutes)

Answer these three questions honestly:

```
1. What did I actually ship yesterday?
   (Be specific: "Fixed the sign-in button and committed" counts. 
   "Worked on the app" does not count.)

2. Did I commit it to git?
   (If not, do it now before anything else: git add -A && git commit -m "...")

3. Did any pilot centre message me?
   (Check WhatsApp first. A message from Bajabulile or Sakhisizwe is always priority #1.)
```

## Section 2: Current Blockers (2 minutes)

Scan for any of these:

```
[ ] Is the app accessible right now? (open it on your phone and check)
[ ] Can a new user register? (test the register flow if you changed anything recently)
[ ] Can a registered ECD owner log in? (test with a test account)
[ ] Is there a broken page that a pilot centre might hit today?
[ ] Are there any failed builds or deployment errors? (check Vercel dashboard)
```

If any box is checked: **this is today's #1 priority.** Fix it before anything else.
A broken production app beats all other tasks.

## Section 3: The One Thing (3 minutes)

Based on where the business is right now, pick exactly ONE of these:

```
PILOT ACTIVE (Bajabulile or Sakhisizwe are onboarding this week):
→ Today's priority: Make sure they have everything they need to log in and complete setup.
  Don't build new features today. Be available on WhatsApp.

PRE-REVENUE (No paying centres yet):
→ Today's priority: The single biggest friction point stopping a centre from paying.
  Not UI polish. Not new features. The thing that makes them go "I'll pay when X is fixed."

POST-FIRST-PAYMENT (At least 1 paying centre):
→ Today's priority: What would make the second centre want to pay?
  Talk to your first paying centre. Ask them what's still frustrating.

FEATURE BUILDING (No immediate fires):
→ Today's priority: The next item on the sprint list. One item. Not two. One.
```

## Section 4: Today's Three Tasks (2 minutes)

Write these down on paper (not on a screen):

```
Task 1: [The #1 priority from Section 3]
         Estimated time: ___
         Definition of done: ___

Task 2: [The most important WhatsApp/communication task]
         Estimated time: ___

Task 3: [One small thing that's been nagging you]
         Estimated time: ___
```

**Rule: If Task 1 is not complete by 3pm, cancel Tasks 2 and 3. Focus on Task 1.**

## Section 5: What NOT to Do Today (1 minute)

Name one thing you're tempted to do but shouldn't today:

```
"I will NOT [tempting distraction] today because [reason it can wait]."

Examples:
- "I will NOT redesign the dashboard today because it works and nobody has complained about it."
- "I will NOT add a new feature today because two existing features are broken."
- "I will NOT start a new Codex session without a clear task because that's how things disappear."
```

## End of Day (5 minutes, evening)

```
[ ] Commit all changes: git add -A && git commit -m "..." && git push
[ ] Check Vercel: did the deployment succeed?
[ ] Check pilot centres: did they message anything?
[ ] Write 3 sentences about what happened today (use this for weekly review)
[ ] Set tomorrow's Task 1 NOW before you close the laptop
```

## The Output Format

When you run /daily-standup, respond with:

```
## Today: [Day, Date]

## Yesterday's Win
[One sentence: what was actually completed]

## Active Blockers
[Any broken production issues — if none, say "None"]

## Today's Priority
[One sentence: the single most important thing]

## Today's Tasks
1. [Task] — Done when: [specific definition]
2. [Task]
3. [Task]

## Not Doing Today
[One thing and why]

## Note for Tomorrow
[One thing to remember for tomorrow's standup]
```
