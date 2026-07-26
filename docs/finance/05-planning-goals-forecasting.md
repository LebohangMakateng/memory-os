# Finance Phase 5 - Planning, Goals, And Forecasting

## Goal

Extend Finance from tracking into planning: savings goals, commitments, recurring expenses, emergency fund planning, net worth, and scenario forecasting.

## Scope

- Savings goals.
- AI savings coaching.
- Recurring expenses.
- Subscription review.
- Financial commitments.
- Emergency fund tracking.
- Net worth tracking.
- Monthly forecast.
- Savings forecast.
- Scenario planning.

## Savings Goals

Allow goals such as:

- emergency fund
- travel
- investments
- debt payoff
- large purchase

Track:

- target amount
- current amount
- target date
- monthly contribution
- priority
- status

## AI Savings Coaching

The assistant should explain:

- whether the goal is realistic
- required monthly contribution
- categories that could be reduced
- expected impact of cuts
- tradeoffs between multiple goals

All recommendations must be grounded in real plans and transaction history.

## Forecasting

Do not ask the LLM to invent financial projections.

Use deterministic calculations:

- known income
- planned expenses
- recurring expenses
- commitments
- current actual spending
- historical category averages where enough data exists

The assistant can explain the forecast and suggest scenarios.

## Scenario Planning

Support questions like:

- What happens if I cut restaurants by R800?
- Can I afford this purchase?
- What if I save R2,000 more each month?
- What happens if income drops next month?

Calculate scenarios without modifying the real financial plan unless explicitly confirmed.

## Recurring Expenses

Detect and manage recurring monthly commitments:

- subscriptions
- rent
- insurance
- utilities
- debt repayments
- services

Estimate monthly and annual recurring cost.

## Subscription Review

Flag:

- duplicate services
- price increases
- unusually expensive recurring services
- services rarely seen in transaction history

Do not claim a service is unused without evidence. Phrase uncertainty honestly.

## Financial Commitments

Allow the user to record future obligations such as:

- rent
- annual fees
- school fees
- debt repayments
- insurance renewals
- known travel costs

Commitments should affect forecasts and remaining-money calculations.

## Emergency Fund

Track:

- monthly essential expenses
- current emergency fund amount
- target months covered
- shortfall
- estimated completion date

## Net Worth

Track:

- cash accounts
- investments
- assets
- debts
- net worth history

This can remain lightweight initially and should not require full investment tracking.

## Acceptance Criteria

- User can create and update savings goals.
- User can record commitments.
- User can see recurring monthly cost.
- User can run scenarios without modifying real records.
- User can view a deterministic monthly forecast.
- User can see emergency fund progress.

## Tests

Add tests for:

- savings contribution calculations
- forecast calculations
- scenario no-op behavior
- recurring expense detection
- commitment impact on remaining money
- emergency fund target calculation
