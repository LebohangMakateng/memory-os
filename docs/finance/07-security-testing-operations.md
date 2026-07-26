# Finance Security, Testing, And Operations

## Purpose

This document applies across all Finance phases. Financial data is more sensitive than the existing execution data, so security, auditability, and test discipline must be treated as part of implementation rather than cleanup.

## Security Requirements

- Authenticate every Finance page and API route.
- Enforce per-user authorization in every query.
- Avoid exposing raw server file paths.
- Avoid logging statement contents.
- Avoid logging account numbers.
- Avoid sending unnecessary statement data to external services.
- Redact sensitive details from errors where possible.
- Mask account identifiers by default.
- Store only the bank account data genuinely needed by the product.

## Bank Account Data

Prefer masked identifiers such as:

```text
****4831
```

Retain full account details only if a specific feature requires them. Keep full details out of general UI, logs, AI context, and analytics payloads.

## Audit Trail

Important financial modifications should record:

- created by
- source: manual, import, ai
- created at
- updated at
- previous values for sensitive edits where practical
- confirmation id for AI-initiated writes

At minimum, all AI write actions should be traceable.

## Error Handling

Handle these cases explicitly:

- missing account
- invalid amount
- invalid date
- category not found
- no transactions detected
- duplicate transactions
- ambiguous transaction
- unsupported statement format
- AI provider unavailable
- unauthorized access

Errors should be actionable without exposing sensitive internals.

## Performance

Do not send thousands of raw transactions to the LLM for routine chat messages.

Use:

- summary tables
- filtered queries
- deterministic aggregates
- capped transaction samples
- persisted insights where useful

## Testing Requirements

Create tests for financial calculations. This is mandatory.

Required test areas:

- transaction arithmetic
- budget calculations
- forecast calculations
- savings calculations
- duplicate detection
- date filtering
- category aggregation
- statement parsing where feasible
- AI tool authorization
- user isolation
- AI action validation

## Acceptance Test Examples

Scenario 1:

- User creates a monthly plan.
- Memory calculates planned income, planned expenses, planned savings, and remaining money.

Scenario 2:

- User tells the assistant: "I spent R300 on Uber today."
- Assistant proposes a R300 transport expense.
- User confirms.
- Transaction is created and current totals update.

Scenario 3:

- User uploads the same statement twice.
- Duplicate transactions are warned or blocked.
- Duplicates are not silently created.

Scenario 4:

- User asks: "What did I spend most on in June?"
- Assistant queries actual June transactions and ranks categories by total spending.

Scenario 5:

- User asks: "Where did I waste money?"
- Assistant identifies discretionary spending using actual transactions and quantifies its reasoning.

## Operational Checklist

Before each phase is considered done:

- migrations are added and documented
- route authorization is checked
- money calculations have tests
- sensitive logs are avoided
- AI payloads are scoped
- manual QA covers mobile and desktop
- failure states are visible in the UI
