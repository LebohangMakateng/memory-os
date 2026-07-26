# Finance Phase 2 - AI Financial Assistant

## Goal

Add a conversational assistant that can answer finance questions and propose structured changes using controlled application tools.

The assistant must sit on top of the Finance data model from Phase 1. Do not implement this phase before foundation calculations are reliable.

## Scope

- Finance chat interface.
- Read-only finance tools.
- Write tools behind confirmation.
- Conversation context handling.
- Assistant system prompt.
- Evidence-backed response format.
- AI action validation and audit trail.

## Tool Layer

Create application-level functions for the assistant. The LLM should request these tools; the app should execute them with validation and authorization.

Read tools:

- getFinanceSummary
- getMonthlyPlan
- getTransactions
- getTransactionsByDateRange
- getTransactionsByCategory
- getCategorySpending
- getMonthlyComparison
- getGoals
- getForecast
- analyseSpending
- getUpcomingCommitments

Write tools:

- createTransaction
- updateTransaction
- deleteTransaction
- createBudget
- updateBudget
- createGoal
- updateGoal

Do not expose raw SQL or direct database clients to the LLM.

## Confirmation Rules

The assistant may answer read-only questions immediately.

The assistant must ask for confirmation before:

- creating transactions
- editing transactions
- deleting transactions
- changing budgets
- creating or updating goals
- changing recurring commitments
- importing statement transactions

Low-risk actions can be auto-confirmed later through preferences, but initial behavior should require explicit confirmation for material changes.

## Evidence-Based Responses

Every financial conclusion should be grounded in stored financial data whenever possible.

Good response pattern:

- direct answer
- supporting numbers
- relevant timeframe
- caveat if data is incomplete
- proposed next action where useful

The assistant may be direct and challenging, but it must not insult the user or make unsupported claims.

Example:

> You're 63% through the month but have used 91% of your restaurant budget. At this pace, you are likely to overspend this category by about R1,100.

## Context Handling

Do not send all transactions to the LLM for every message.

Instead:

- retrieve only relevant summaries or filtered transaction sets
- prefer deterministic aggregates
- cap transaction payloads
- include recent conversation turns only when needed
- summarize older chat context

## AI Memory

Store durable user preferences and financial goals separately from chat history.

Examples:

- preferred currency
- payday pattern
- savings priorities
- risk tolerance
- categories the user wants strict feedback on

Do not treat every chat message as durable memory.

## Acceptance Criteria

- User can ask for current financial position.
- User can ask why spending changed between months.
- User can ask where money was wasted and receive quantified reasoning.
- User can ask to create a transaction and receives a confirmation step.
- Confirmed AI writes update structured records.
- Rejected AI writes leave records unchanged.
- AI responses do not rely on invented arithmetic.

## Tests

Add tests for:

- tool authorization
- action confirmation
- rejected action no-op behavior
- write validation
- scoped data retrieval
- user isolation
- prompt/context payload limits where practical
