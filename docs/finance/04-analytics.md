# Finance Phase 4 - Analytics

## Goal

Create useful financial analytics from stored transactions and plans. Analytics should explain real behavior rather than display decorative charts.

## Scope

- Monthly summaries.
- Category analytics.
- Merchant analytics.
- Behavior analytics.
- Historical comparison.
- Money leak analysis.
- Financial health score.
- Insight feed.

## Monthly Analytics

Show:

- income
- expenses
- savings
- savings rate
- budget variance
- remaining spendable money
- month progress
- projected end-of-month position

## Category Analytics

Show:

- spending by category
- planned vs actual by category
- category trend vs prior month
- discretionary vs essential split
- categories at risk of overspending

## Merchant Analytics

Show:

- top merchants
- repeat merchants
- unusually expensive merchants
- merchant trend changes
- possible subscription-like merchants

## Behavior Analytics

Show:

- number of transactions
- average transaction size
- largest transactions
- spending spikes
- unusual transactions
- weekend or payday spending patterns where enough data exists

## Historical Comparison

Compare current month against previous months using actual records.

The assistant and UI should explain movements using real transaction data, not vague summaries.

## Money Leak Analysis

Implement a "Where did I blow money?" analysis based on:

- discretionary categories
- budget overruns
- unusually high merchant totals
- repeated low-value transactions
- avoidable fees
- subscriptions or recurring expenses

Quantify every claim.

## Financial Health Score

Consider an internal score based on:

- savings rate
- budget adherence
- emergency fund progress
- recurring expense burden
- debt or commitment pressure where recorded
- discretionary overspending

Do not present this as a credit score or industry-standard financial score.

## Insights Feed

Generate concise insights from deterministic calculations first and AI explanation second.

Examples:

- Restaurant spending is 82% used with 12 days remaining.
- Grocery spending is tracking below plan.
- Two merchants explain most discretionary overspend this month.

## Acceptance Criteria

- User can see monthly analytics.
- User can rank categories by total spending.
- User can identify biggest merchants.
- User can compare current month with previous month.
- User can ask where money was wasted and receive evidence-backed rankings.
- Insights are based on stored data and deterministic calculations.

## Tests

Add tests for:

- category aggregation
- merchant aggregation
- month-over-month comparison
- discretionary classification
- health score inputs
- unusual transaction detection
- insight generation rules
