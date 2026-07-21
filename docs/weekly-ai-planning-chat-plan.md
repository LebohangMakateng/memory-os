# Weekly AI Planning Chat Plan

## Summary
Add a small `AI` button beside `View history` on the Weekly planning page. It opens a chat modal where the user describes the week in natural language. The AI asks clarification questions until it has enough context, then produces an editable draft that fills blank weekly dashboard fields and proposes new weekly tasks. Nothing is saved or created until the user approves.

## Key Changes
- Add a client-side weekly AI chat modal launched from the Weekly planning header.
- The modal flow has three states: chat, draft review, approved/applied.
- Use Anthropic through an authenticated API route, reusing `ANTHROPIC_API_KEY` and `ANTHROPIC_PLANNING_MODEL`.
- API returns either `needs_clarification` with follow-up questions or `ready` with a validated weekly dashboard draft and proposed tasks.
- Keep AI drafts client-side only. No Supabase draft table or migration.
- Apply dashboard drafts with "merge blanks only": preserve existing non-empty fields, fill empty fields, preserve `weekStart` and `weekLabel`.
- For tasks, do not edit or delete existing tasks. On approval, create only proposed new tasks through the existing task API.
- Proposed tasks must use valid `milestoneId` and optional `weeklyPriorityId` values from the current page context.

## Interfaces
- Weekly AI request includes chat history, current weekly plan, current week date/label, milestones, priorities, and existing tasks.
- Weekly AI response is one of:
  - `{ status: "needs_clarification", message, questions }`
  - `{ status: "ready", message, draft }`
- The ready draft includes weekly dashboard fields plus `tasksToCreate` using the existing task creation shape.

## Test Plan
- Run `npm run lint` and `npm run build`.
- Check that the AI button opens the modal beside `View history`.
- Check that vague input produces clarification questions.
- Check that ready drafts can be edited before approval.
- Check that approval fills only blank dashboard fields.
- Check that approval creates proposed tasks only when valid milestones exist.
- Check that missing `ANTHROPIC_API_KEY` shows a clear error and does not alter the page.

## Assumptions
- The AI decides when enough clarification has been gathered.
- Drafts are not persisted before approval.
- "Merge blanks only" applies to dashboard fields; tasks are additive only.
- "All fields" includes the weekly dashboard and new weekly tasks, not editing/deleting existing tasks.