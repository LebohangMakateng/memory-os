# Finance Program Overview

## Mission

Build a Finance feature area inside Memory OS that becomes a personal financial operating system centered on an AI financial assistant.

The assistant should understand stored financial data, answer natural-language questions, explain current position, help plan spending, forecast outcomes, and challenge poor financial decisions using evidence from the user's records.

## Product Principle

AI first, UI second, but not AI instead of infrastructure.

The system of record must be structured financial data. The assistant may explain, classify, summarize, and orchestrate approved actions, but deterministic application code and database queries must perform money calculations, date filtering, duplicate checks, budget math, and forecasting inputs.

## Non-Negotiables

- Do not give the LLM direct uncontrolled database access.
- Do not use floating-point arithmetic for money.
- Do not silently modify financial records from ambiguous AI requests.
- Do not immediately commit imported statement transactions.
- Do not send unnecessary bank statement contents or full transaction history to external AI services.
- Do not invent projections, classifications, or claims without evidence.
- Authenticate every Finance operation.
- Enforce per-user authorization even if the current app is effectively single-user.
- Keep sensitive bank data out of logs and error messages.

## Target Navigation

Add Finance to the main Memory dashboard navigation.

Finance should open a dedicated workspace with these concerns represented somewhere:

- Assistant
- Overview
- Monthly Plan
- Transactions
- Statements
- Analytics
- Goals
- Forecast

The first implementation does not need all sections, but it should leave room for this structure.

## Sequential Plan Files

Implement in this order:

1. [01-foundation.md](./01-foundation.md)
2. [02-ai-assistant.md](./02-ai-assistant.md)
3. [03-statement-import.md](./03-statement-import.md)
4. [04-analytics.md](./04-analytics.md)
5. [05-planning-goals-forecasting.md](./05-planning-goals-forecasting.md)
6. [06-intelligence-layer.md](./06-intelligence-layer.md)
7. [07-security-testing-operations.md](./07-security-testing-operations.md)

## Definition Of Done

The Finance product is complete when these flows work reliably:

- Plan: enter income and expected spending, then see a calculated monthly plan.
- Record: add a transaction manually and see totals update.
- Import: upload a bank statement, review extracted transactions, and import without duplicates.
- Understand: ask where money went and receive evidence-backed answers.
- Challenge: receive direct but data-grounded warnings about poor spending behavior.
- Plan Forward: set savings goals and commitments, then see realistic tradeoffs.
- Forecast: model scenarios without modifying real plans unless confirmed.