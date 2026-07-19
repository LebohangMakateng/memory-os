# Requirements — Execution OS

**A personal system for turning long-term direction into the next meaningful action.**

## Purpose

The Execution OS exists to remove the daily cost of deciding what to work on. It connects every meaningful task to the reason it matters:

```
Life Vision → Long-Term Goal → Strategic Initiative → Project → Milestone → Weekly Priority → Task
```

The system must answer, immediately:

1. Why am I doing this?
2. What should I work on next?
3. What is the smallest useful thing I can finish today?

## Permanent Operating Principle

> **Share everything I build.**

The dashboard keeps this principle visible. Claude receives it as a permanent instruction for planning suggestions, while respecting confidential, private, and client-owned work.

## Cycle 1 Scope

- Private, single-user Next.js application deployed on Vercel with Neon Postgres.
- Dashboard, Vision & Goals, Initiatives, Projects, Weekly Planning, and Opportunity Inbox.
- A hard maximum of five ordered weekly priorities.
- Tasks carry effort, energy, focus type, impact dimensions, an explicit reason, expected outcome, and a full link to the hierarchy above.
- A rules-based Execution Engine recommends one eligible next task using weekly rank, impact, urgency, effort fit, energy, and readiness.
- Claude can propose milestones and tasks as an editable structured draft. It never writes items until they are explicitly approved.
- Work can be marked `planned`, `drafting`, `ready_to_share`, or `shared`, including its sharing channel and public link.

## Out of Scope for Cycle 1

- Calendar sync and time blocking.
- Automatic publishing or outreach.
- Memory/guidance retrieval, Notion sync, browser injection, and decision guardrails. These remain Cycle 2.
- Autonomous AI changes, multi-user accounts, and analytics.

## Data Model

| Entity | Purpose |
| --- | --- |
| Vision | The enduring life direction and operating principle. |
| Goal | A measurable 1–5 year outcome belonging to the vision. |
| Initiative | A strategic route toward a goal, with success metrics. |
| Project | A concrete body of work belonging to an initiative. |
| Milestone | A verifiable project outcome containing tasks. |
| Week / Weekly Priority | A dated execution commitment with 1–5 ranked priorities. |
| Task | The executable unit, with rationale, impact, estimate, energy, and sharing state. |
| Opportunity | A captured idea that is intentionally not active work yet. |
| AI Planning Draft | A reviewable Claude proposal with no effect until approval. |

## Claude Planning Contract

`POST /api/ai/plans` accepts a target initiative or project and optional instructions. It returns validated JSON containing proposed milestones and tasks. Each task must include its reason, expected outcome, effort, energy, impact dimensions, and a recommended sharing action when appropriate. The response flags confidentiality concerns and assumptions.

The server supplies the permanent principle and the hierarchy context. The browser never receives the Anthropic key. The planning model is configured with `ANTHROPIC_PLANNING_MODEL`.

## Success Criteria

1. A task on the dashboard always shows its full "why" chain to the life vision.
2. The user can commit no more than five priorities for a week.
3. The execution engine gives one explainable next-task recommendation.
4. The initial "increase surface area for opportunity" initiative can be decomposed into reviewable work, committed to a week, and completed.
5. Claude drafts never create active records before approval.
