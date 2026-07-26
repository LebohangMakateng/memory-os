# Finance Phase 1 - Foundation

## Goal

Create the core Finance workspace, data model, manual entry flows, and deterministic calculations. This phase should be useful without AI.

## Scope

- Finance navigation entry.
- Finance workspace shell at `/dashboard/finance`.
- Core database schema.
- Transaction categories.
- Financial accounts.
- Monthly financial plans.
- Manual income and expense entry.
- Planned-vs-actual calculations.
- Current-month overview.
- Focused tests for money and date logic.

## Repository Integration

Follow the existing app conventions:

- Use Next.js App Router routes under `src/app`.
- Use Supabase migrations under `supabase/migrations`.
- Keep server-side Supabase access behind authenticated routes.
- Match the dashboard shell and route patterns already used by execution features.

Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` as required by `AGENTS.md`.

## Data Model

Design final names to match the app, but cover these concepts:

- Financial account
- Transaction
- Transaction category
- Monthly financial plan
- Budget category
- Financial month

Required transaction fields:

- id
- user id or owner id
- account id
- transaction date
- posted date where available
- description
- normalized merchant
- amount
- transaction type: income, expense, transfer, adjustment
- category id
- source: manual, import, ai
- source reference
- duplicate fingerprint
- notes
- created at
- updated at

Use database `numeric` or integer minor units for money. Do not use floating-point values for calculations.

## Date Rules

Define explicit date semantics:

- Transaction date is the date the user cares about for spending.
- Posted date is optional and may differ from transaction date.
- Financial month is derived consistently from transaction date unless explicitly overridden.
- Store and compare dates in a way that does not drift across timezones.

## Categories

Seed a practical initial category set.

Essential:

- Rent or housing
- Groceries
- Utilities
- Transport
- Medical
- Insurance

Lifestyle / discretionary:

- Restaurants
- Takeout
- Entertainment
- Shopping
- Travel
- Fitness

Financial:

- Salary
- Savings
- Investments
- Debt repayment
- Fees
- Transfers

## Monthly Plan

Allow the user to create or edit the current month's plan:

- expected income
- budgeted category amounts
- savings target
- fixed commitments
- notes

Calculate:

- planned income
- actual income
- planned expenses
- actual expenses
- planned savings
- actual savings
- remaining spendable money
- category variance
- month progress

## UI Requirements

Initial Finance screens:

- Overview: current month summary, remaining money, major category status.
- Transactions: list, create, edit, delete manual records.
- Monthly Plan: set income and category budgets.
- Categories: lightweight management or seeded read-only categories.

Keep the UI utilitarian and dense enough for repeated use. Avoid a marketing-style Finance landing page.

## Acceptance Criteria

- User can open Finance from the dashboard nav.
- User can create an account.
- User can create income and expense transactions.
- User can assign categories to transactions.
- User can create a monthly plan.
- Overview totals update from stored data.
- Planned-vs-actual calculations are deterministic and tested.
- All Finance API routes require authentication.

## Tests

Add focused tests for:

- income totals
- expense totals
- balance
- category aggregation
- planned vs actual
- remaining budget
- financial month filtering
- decimal or minor-unit money arithmetic
