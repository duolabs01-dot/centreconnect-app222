---
name: workflow-persona-review
description: Run the CentreConnect persona review workflow after every UI change so Codex routes the right persona automatically.
---

# Workflow: CentreConnect Persona Review

Use this after every UI change.

Routing:
- Changes to `app/(journey)` -> Thandi only
- Changes to `app/ecd` -> Nomvula only
- Changes to `app/admin` -> Sipho only
- Shared components -> all three

That means Codex should automatically know which persona to invoke based on what it just changed.

## Mode 1: Automatic

After a UI change, run the right persona review based on the file path:

- `app/(journey)` -> `@.agents/skills/persona-parent.md`
- `app/ecd` -> `@.agents/skills/persona-ecd-admin.md`
- `app/admin` -> `@.agents/skills/persona-cc-admin.md`
- shared components -> run all three

Use this structure:

```md
Run the CentreConnect persona review on the following change:

[describe the change or paste the diff here]

Route it using the workflow rules in @.agents/skills/workflow-persona-review.md

Answer all 6 questions for the required persona(s).
End with: PASS / PASS WITH NOTES / FAIL
Then give a final verdict: SHIP IT / SHIP WITH FIXES / DO NOT SHIP
```

## Mode 2: Manual

Use this when you want to review a completed session:

```md
Run the CentreConnect persona review panel on the landing page rewrite.

Step 1: Review as Thandi (@.agents/skills/persona-parent.md)
Step 2: Review as Sipho (@.agents/skills/persona-cc-admin.md)

Answer all 6 questions per persona.
End with: SHIP IT / SHIP WITH FIXES / DO NOT SHIP
```

## Mode 3: Targeted

Use this when you want one persona to answer one specific question:

```md
You are Thandi from @.agents/skills/persona-parent.md

Look at the hero section of app/(journey)/page.client.tsx.
Answer only question 1 (first impression) and question 6 (what you'd tell your friend in the WhatsApp group).
```

## Output Rules

- Keep the review in the persona's voice
- Answer the questions from that persona file, not generic UX questions
- If any persona returns `FAIL`, the verdict is `DO NOT SHIP`
- If any persona returns `PASS WITH NOTES`, the verdict is `SHIP WITH FIXES`
- Only return `SHIP IT` when all required personas pass cleanly

## Persona Files

- Parent: `@.agents/skills/persona-parent.md`
- ECD Admin: `@.agents/skills/persona-ecd-admin.md`
- CC Admin: `@.agents/skills/persona-cc-admin.md`
