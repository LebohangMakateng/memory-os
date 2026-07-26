# Memory OS — AI Financial Assistant Implementation Plan

## 1. Mission

Build a new **Finance** feature area inside the existing Memory Next.js application.

This is not intended to be a basic expense tracker.

The goal is to build a **personal financial operating system centred around an AI financial assistant** that understands the user's historical and current financial position, helps plan spending, analyses actual behaviour, forecasts future outcomes, and aggressively identifies poor financial decisions.

The primary interaction model should eventually be:

> I talk to the financial assistant naturally, and it understands my financial data well enough to answer questions and make changes.

Examples:

> "I spent R380 on Uber today."

The system should:

1. Understand that this is an expense.
2. Categorise it appropriately.
3. Add it to the current month's transactions.
4. Reduce the user's remaining available money.
5. Update relevant category totals.
6. Update forecasts.
7. Tell the user what changed.

Another example:

> "Where did I blow money in June?"

The assistant should analyse June's imported transactions and give a direct answer backed by the actual financial data.

Another:

> "Can I afford to spend R2,000 this weekend?"

The assistant should consider:

* Current available money
* Remaining planned expenses
* Historical spending behaviour
* Savings targets
* Number of days until next expected income
* Existing commitments

and answer accordingly.

The system should be opinionated.

It should **not sugar-coat bad financial behaviour**.

However, criticism should remain evidence-based. The AI should never insult the user or make claims unsupported by the financial data.

---

# 2. Non-Negotiable Development Process

Do not immediately start coding.

The implementation must follow:

**Requirements → User Stories → Tasks → Acceptance Criteria → Implementation → Verification**

All planning documents must be stored as Markdown inside the repository.

Create:

```text
/docs/finance/
```

At minimum create:

```text
/docs/finance/
  00-overview.md
  01-requirements.md
  02-architecture.md
  03-data-model.md
  04-user-stories.md
  05-acceptance-criteria.md
  06-implementation-plan.md
  07-testing-plan.md
  08-security-and-privacy.md
  09-ai-behaviour.md
  10-known-limitations.md
  progress.md
```

If useful, individual stories may also live under:

```text
/docs/finance/stories/
```

Example:

```text
FIN-001-finance-workspace.md
FIN-002-statement-upload.md
FIN-003-transaction-parsing.md
FIN-004-ai-chat.md
```

---

# 3. Acceptance Criteria Traceability

Every feature must have:

* Requirement ID
* User Story ID
* Task IDs
* Acceptance Criteria IDs
* Implementation status
* Test status

Use identifiers such as:

```text
REQ-FIN-001
US-FIN-001
TASK-FIN-001
AC-FIN-001
```

`progress.md` should contain a traceability table similar to:

| Requirement | Story      | Acceptance Criteria | Implementation | Tests   | Status |
| ----------- | ---------- | ------------------- | -------------- | ------- | ------ |
| REQ-FIN-001 | US-FIN-001 | AC-FIN-001-004      | Done           | Passed  | ✅      |
| REQ-FIN-002 | US-FIN-002 | AC-FIN-005-011      | In Progress    | Pending | 🟡     |

Do not mark a story complete merely because code exists.

A story is complete only when:

* its acceptance criteria are satisfied,
* relevant tests pass,
* error states have been considered,
* the UI is usable on mobile and desktop,
* database persistence works,
* and the implementation has been manually or programmatically verified.

---

# 4. First Step: Understand the Existing Application

Before designing the Finance implementation:

1. Inspect the existing Next.js architecture.
2. Identify the routing model being used.
3. Identify the database and ORM/data access system.
4. Identify authentication/user identity patterns.
5. Identify existing AI infrastructure.
6. Identify existing API/server action patterns.
7. Identify design system/components.
8. Identify how Memory currently handles navigation.
9. Identify existing responsive/mobile patterns.
10. Reuse existing architecture where sensible.

Do not introduce an entirely different architecture merely for Finance unless technically justified.

Document architectural decisions in:

```text
/docs/finance/02-architecture.md
```

---

# 5. Main Navigation

Add:

**Finance**

to the main Memory navigation.

Finance should open a dedicated financial workspace.

Suggested sections:

```text
Finance
├── Assistant
├── Overview
├── Monthly Plan
├── Transactions
├── Statements
├── Analytics
├── Goals
└── Forecast
```

The exact UX can evolve, but these concerns should exist somewhere.

---

# 6. Primary Principle: AI First, UI Second

Traditional controls are still required.

The user should be able to manually:

* Add expenses
* Edit expenses
* Delete expenses
* Add income
* Upload statements
* Change categories
* Set budgets
* Set savings targets
* View analytics

But the **AI Financial Assistant should be capable of performing most normal financial operations conversationally.**

The UI exists partly to give visibility and control over the structured data underneath the assistant.

---

# 7. Feature Area A — Financial Assistant

This is the central feature.

Create a persistent AI chat experience inside Finance.

The assistant needs access to appropriate financial tools/functions rather than relying solely on arbitrary generated text.

The AI should retrieve or operate against structured financial data.

## Required capabilities

### Read operations

The assistant should eventually answer questions such as:

> How much money do I have left this month?

> What did I spend on food?

> Where did most of my money go in June?

> How much did I spend on Uber during the last three months?

> Compare June and July.

> What are my five biggest unnecessary expenses?

> What expenses increased this month?

> What subscriptions am I paying?

> What's my average monthly spending?

> What's my average savings rate?

> Am I on track this month?

> What bills do I still need to account for?

> How much disposable money do I realistically have?

---

## Write operations

The assistant should support commands such as:

> I spent R250 on electricity today.

> Add R1,000 for groceries.

> I got paid R42,000 today.

> Change that Uber transaction to transport.

> Delete the expense I just added.

> Set my grocery budget to R3,000.

> I'm trying to save R8,000 this month.

These actions must manipulate structured financial records.

---

# 8. AI Action Confirmation

Not every AI request should immediately modify financial data.

Implement an action system.

Example:

```text
User:
I spent R420 at Checkers.

AI interprets:

Action: CREATE_EXPENSE
Amount: 420
Merchant: Checkers
Category: Groceries
Date: Today

Assistant:
Add R420 Checkers expense under Groceries?

[Confirm]
[Edit]
[Cancel]
```

Consider allowing low-risk actions to be auto-confirmed later through preferences, but initially prefer explicit confirmation for ambiguous modifications.

The assistant should never silently make uncertain assumptions that materially affect financial records.

---

# 9. AI Tool / Function Layer

Do not give the LLM direct uncontrolled database access.

Create application-level tools/functions such as:

```text
getFinanceSummary()
getMonthlyPlan()
getTransactions()
getTransactionsByDateRange()
getTransactionsByCategory()
getCategorySpending()
getMonthlyComparison()
createTransaction()
updateTransaction()
deleteTransaction()
createBudget()
updateBudget()
getGoals()
createGoal()
updateGoal()
getForecast()
analyseSpending()
getUpcomingCommitments()
```

The AI should decide when to call these tools.

The server remains responsible for:

* validation,
* authorization,
* calculations,
* database access,
* and enforcing business rules.

---

# 10. Feature Area B — Bank Statement Upload

Create a statement ingestion workflow.

The user should be able to upload historical bank statements, including at minimum PDF statements.

The initial objective is to support approximately the previous 3–4 months of statements and future monthly uploads.

---

# 11. Statement Processing Pipeline

Design statement processing as a pipeline rather than one giant AI prompt.

Suggested flow:

```text
PDF Upload
    ↓
Secure File Handling
    ↓
Text / Table Extraction
    ↓
Transaction Detection
    ↓
Structured Normalisation
    ↓
Duplicate Detection
    ↓
Merchant Normalisation
    ↓
Category Classification
    ↓
Validation
    ↓
User Review
    ↓
Database Import
    ↓
Analytics Update
```

---

# 12. PDF Extraction

Do not assume every PDF will behave identically.

Support:

### Type 1

Digitally generated PDF containing extractable text.

### Type 2

Complex PDF where transactions appear in tables.

### Type 3

Scanned statement requiring OCR.

Prefer deterministic extraction before sending content to an LLM.

The LLM should primarily assist with:

* interpreting ambiguous transaction descriptions,
* classification,
* merchant recognition,
* anomaly explanation,
* and analysis.

Do not make the LLM the sole PDF parser unless unavoidable.

---

# 13. Statement Import Preview

Never immediately commit imported transactions.

Show an import review screen.

Example columns:

| Date   | Description | Merchant |  Amount | Type    | Category  |
| ------ | ----------- | -------- | ------: | ------- | --------- |
| 03 Jun | UBER *TRIP  | Uber     |    R187 | Expense | Transport |
| 04 Jun | CHECKERS    | Checkers |    R643 | Expense | Groceries |
| 05 Jun | SALARY      | Employer | R40,000 | Income  | Salary    |

Allow:

* Editing
* Removing rows
* Changing categories
* Correcting merchant names
* Correcting income/expense classification

Then:

**Confirm Import**

---

# 14. Duplicate Detection

This is critical.

Uploading the same bank statement twice must not duplicate all transactions.

Develop duplicate detection using combinations of:

* account,
* transaction date,
* amount,
* reference/description,
* statement identifier,
* imported source,
* deterministic transaction fingerprint.

Flag possible duplicates before importing.

---

# 15. Transaction Model

Design a robust transaction entity.

Possible fields:

```text
id
userId
accountId
date
postedDate
description
normalizedMerchant
amount
transactionType
categoryId
subcategoryId
source
statementId
notes
isRecurring
isEssential
isDiscretionary
aiConfidence
createdAt
updatedAt
```

`source` might include:

```text
MANUAL
AI_CHAT
BANK_STATEMENT
IMPORT
```

Do not blindly implement this exact schema if the existing data model suggests a better structure.

Document the final schema.

---

# 16. Categories

Create sensible default categories.

Examples:

### Essential

* Rent
* Electricity
* Water
* Groceries
* Transport
* Insurance
* Medical
* Debt repayments
* Education
* Phone/Data

### Lifestyle / Discretionary

* Restaurants
* Uber Eats / Food Delivery
* Entertainment
* Shopping
* Alcohol
* Travel
* Subscriptions
* Personal Care

### Financial

* Savings
* Investments
* Transfers
* Fees
* Interest
* Debt payments

Allow custom categories later.

---

# 17. Merchant Normalisation

Raw statements often contain ugly merchant descriptions.

For example:

```text
UBER *TRIP HELP.UBER.COM
```

should become:

```text
Uber
```

Similarly:

```text
UBER EATS
```

should become something distinguishable from ordinary Uber transport.

Keep:

* original bank description,
* normalized merchant.

Do not destroy raw information.

---

# 18. AI Classification

Use AI where deterministic matching isn't sufficient.

For example:

```text
"MR D FOOD"
```

could become:

```text
Merchant: Mr D
Category: Food Delivery
Essential: false
```

Store classification confidence.

Low-confidence classifications should be reviewable.

---

# 19. Feature Area C — Monthly Financial Plan

Create a monthly planning interface.

The user begins a financial month by entering income.

Example:

```text
July 2026

Income
Salary                       R40,000
Other Income                  R3,000
-----------------------------------
Total Income                 R43,000
```

Then planned allocation.

Example:

```text
Rent                          R12,000
Groceries                      R3,500
Electricity                    R1,000
Transport                      R2,000
Savings                        R7,000
Entertainment                  R1,500
...
```

Calculate automatically:

```text
Total Income
- Planned Expenses
- Savings
= Unallocated Money
```

---

# 20. Planned vs Actual

This is important.

Do not only track expenses.

Track:

```text
Planned
Actual
Variance
Remaining
```

Example:

| Category   | Planned | Actual | Remaining |
| ---------- | ------: | -----: | --------: |
| Groceries  |  R3,000 | R1,820 |    R1,180 |
| Uber       |  R1,500 | R1,340 |      R160 |
| Eating Out |  R1,000 | R1,870 |     -R870 |

Make overspending immediately visible.

---

# 21. Real-Time Remaining Money

Maintain meaningful financial calculations.

At minimum calculate:

```text
Income
Actual Spending
Committed / Planned Spending
Savings Target
Available Cash
Safe-to-Spend Amount
```

Be careful with the distinction between:

**Bank balance**

and

**money actually available to spend**.

For example:

The user might technically have R10,000 remaining but still owe R8,000 in commitments.

The assistant should not say:

> You have R10,000 to spend.

It should instead reason closer to:

> You have R10,000 cash remaining, but R8,000 is already allocated, leaving approximately R2,000 genuinely available.

---

# 22. Feature Area D — Financial Analytics

Create useful financial analytics rather than decorative charts.

Required metrics should include:

### Monthly

* Total income
* Total expenses
* Money saved
* Savings rate
* Essential spending
* Discretionary spending
* Remaining money

### Categories

* Spending by category
* Percentage of total spend
* Category trends
* Largest increases/decreases

### Merchants

* Highest spend merchants
* Most frequent merchants
* Average transaction size

### Behaviour

* Number of transactions
* Average daily spend
* Average weekly spend
* Weekend spending vs weekday spending
* Large purchases
* Repeated small purchases

---

# 23. Historical Comparison

Once multiple statements exist, compare months.

Example:

```text
May
Expenses: R28,400

June
Expenses: R31,200

July
Expenses: R26,100
```

The assistant should be able to identify why.

Example response:

> Your spending dropped R5,100 between June and July. Roughly R2,100 came from lower restaurant spending, R1,400 from fewer Uber trips, and R900 from reduced shopping.

The AI should explain movements using actual transaction data.

---

# 24. "Where Did I Blow Money?" Analysis

Create an explicit analysis mode for wasteful/discretionary spending.

The assistant should look for things such as:

* Food delivery frequency
* Repeated Uber trips
* Excessive restaurant spending
* Impulse shopping
* Unused subscriptions
* Bank fees
* Recurring convenience spending
* Spending spikes
* Categories far above historical averages
* Large discretionary purchases

The tone may be direct.

Example:

> You spent R3,840 on Uber Eats in June across 19 orders. That's roughly R202 per order and almost R1,000 per week. This is one of the clearest places you're leaking money.

Then provide an actionable alternative:

> Cutting delivery spending by half would free roughly R1,920 per month or R23,040 per year.

The assistant must quantify criticism wherever possible.

---

# 25. Financial Health Score

Consider implementing an internal financial health score.

Do not pretend that this is an industry-standard credit or financial score.

It is a Memory-specific indicator.

Possible factors:

* Savings rate
* Spending vs income
* Emergency fund progress
* Budget adherence
* Discretionary spending
* Debt burden, if entered
* Income stability
* Cash buffer

Show the factors affecting the score.

Avoid opaque scoring.

---

# 26. Feature Area E — Savings Goals

Allow goals such as:

```text
Emergency Fund
Target: R100,000
Current: R25,000
Monthly contribution: R6,000
```

or:

```text
Car
Target: R250,000
Target Date: December 2028
```

Calculate:

* Progress
* Remaining amount
* Required monthly contribution
* Projected completion date

---

# 27. AI Savings Coaching

The assistant should be able to answer:

> How can I save R10,000 a month?

It should analyse actual spending and produce realistic cuts.

Example:

```text
Current estimated savings capacity: R5,800

Possible changes:

Uber Eats              +R1,600
Entertainment          +R900
Uber rides             +R700
Subscriptions          +R450
Shopping               +R600

Potential savings      +R4,250

New estimated capacity: R10,050
```

It should show exactly where its recommendation comes from.

---

# 28. Feature Area F — Forecasting

Build deterministic forecasting first.

Do not ask the LLM to invent financial projections.

Use application calculations and allow AI to explain them.

---

# 29. Monthly Forecast

At any point during the month estimate:

```text
Projected Month-End Spending
Projected Savings
Projected Remaining Cash
Projected Category Overspend
```

Possible simple initial methodology:

```text
Daily Spending Rate =
Current discretionary spending / elapsed days

Projected Variable Spend =
Daily Spending Rate × days in month
```

Improve this using category-specific historical averages when enough history exists.

---

# 30. Savings Forecast

For a constant monthly contribution:

```text
Current savings: R20,000
Monthly contribution: R7,000
```

The system can forecast:

```text
3 months
6 months
12 months
24 months
```

Do not automatically assume investment returns unless explicitly configured.

---

# 31. Scenario Planning

This would be extremely valuable.

Allow conversations like:

> What happens if I cut Uber Eats by R1,500 a month?

> What if my rent increases by R2,000?

> What if I earn R10,000 more per month?

> What if I save R8,000 monthly until December?

Calculate scenarios without modifying the real financial plan unless confirmed.

---

# 32. Feature Area G — Recurring Expenses

Detect possible recurring payments.

Examples:

* Netflix
* Spotify
* iCloud
* Gym
* Insurance
* Internet
* Mobile contracts
* SaaS products

Show:

```text
Recurring Monthly Commitments
```

Estimate:

```text
monthly recurring cost
annual recurring cost
```

The assistant should be able to say:

> You're paying approximately R2,430 per month in recurring subscriptions and services, which is around R29,160 per year.

---

# 33. Subscription Review

Create a lightweight subscription audit.

Flag:

* Duplicate services
* Price increases
* Services rarely seen/used where usage data can reasonably be inferred only from transaction history
* Unusually expensive recurring services

Do not claim something is unused when the system does not have evidence.

Phrase uncertainty honestly.

---

# 34. Feature Area H — Financial Commitments

Allow the user to record future obligations such as:

* Rent
* Insurance
* Debt repayments
* School fees
* Family commitments
* Subscriptions
* Planned purchases

This improves the assistant's understanding of actual disposable money.

---

# 35. Feature Area I — Emergency Fund

Support an emergency fund target.

Allow the user to specify target months of expenses.

Example:

```text
Average Essential Monthly Expenses: R18,000
Target Buffer: 6 months
Emergency Fund Target: R108,000
```

Track progress.

---

# 36. Feature Area J — Net Worth

Design for eventual net worth tracking.

This does not have to be part of the first implementation milestone, but architecture should not prevent it.

Potential assets:

* Cash
* Savings
* Investments
* Property
* Vehicles
* Business interests

Potential liabilities:

* Credit cards
* Loans
* Vehicle finance
* Mortgages
* Other debt

Then:

```text
Net Worth = Assets - Liabilities
```

---

# 37. Financial Assistant Personality

Create explicit system instructions for the Finance AI.

Document them in:

```text
/docs/finance/09-ai-behaviour.md
```

The assistant should be:

* Direct
* Analytical
* Skeptical
* Numbers-driven
* Honest
* Proactive
* Willing to challenge poor financial decisions

It should NOT constantly praise the user.

Avoid:

> Great job!

when the data clearly shows poor behaviour.

Prefer:

> You're 63% through the month but you've already used 91% of your restaurant budget. At your current pace you'll overspend this category by approximately R1,100.

---

# 38. Evidence-Based Responses

Important AI rule:

**Every financial conclusion must be grounded in stored financial data whenever possible.**

The assistant should distinguish:

```text
FACT
CALCULATION
ESTIMATE
RECOMMENDATION
```

For example:

> You spent R4,240 on restaurants in June. **[Fact]**

> That's approximately 11% of your income. **[Calculation]**

> At your current July pace, you're likely to spend around R4,600 this month. **[Estimate]**

> I'd cap restaurant spending at R2,500. **[Recommendation]**

This distinction does not necessarily need those literal UI labels everywhere, but the underlying behaviour should follow that philosophy.

---

# 39. AI Memory

The financial assistant should remember relevant financial preferences and goals.

Examples:

> I'm trying to save aggressively for the next six months.

> I want at least R8,000 untouched every month.

> I'm willing to cut delivery food before cutting gym.

> My salary normally arrives around the 25th.

Store durable preferences structurally where appropriate rather than depending entirely on chat history.

---

# 40. Conversational Context

The assistant should understand follow-ups.

Example:

```text
User:
How much did I spend on Uber in June?

AI:
R2,840.

User:
What about July?

AI:
R1,920 so far.

User:
Why did it drop?

AI:
...
```

Do not force the user to repeat context every message.

---

# 41. Financial Dashboard

The dashboard should give a quick answer to:

> Where do I stand financially right now?

Suggested cards:

```text
Current Month Income
Spent
Remaining Cash
Safe to Spend
Saved
Savings Rate
Upcoming Commitments
Projected Month-End Balance
```

Charts should only exist when they provide useful information.

---

# 42. AI Insights Feed

Consider generating structured insights.

Examples:

```text
⚠ Uber spending is 37% higher than your 3-month average.

⚠ You've spent 82% of your restaurant budget with 12 days remaining.

↑ You're on track to save R1,700 more than last month.

⚠ Three recurring subscriptions total R890/month.

✓ Grocery spending is tracking below plan.
```

These should be generated using deterministic calculations first and AI explanation second.

---

# 43. Database Design

Design appropriate entities for concepts including:

```text
FinancialAccount
FinancialMonth
Transaction
TransactionCategory
BankStatement
MonthlyBudget
BudgetCategory
FinancialGoal
RecurringExpense
FinancialCommitment
FinanceChatConversation
FinanceChatMessage
FinanceInsight
```

Do not blindly use these names if the application's conventions differ.

Relations and constraints must be documented.

---

# 44. Data Integrity

Money calculations must use appropriate decimal/numeric handling.

Never use floating-point arithmetic where it can introduce monetary rounding errors.

Store currency explicitly where appropriate.

The current primary expected currency is ZAR.

Do not hardcode assumptions that make future multi-currency support impossible.

---

# 45. Dates

Transactions and monthly plans must have clear date semantics.

Be careful about:

* transaction date,
* posted date,
* statement period,
* timezone,
* financial month.

---

# 46. Security

Bank statements contain highly sensitive financial data.

Treat this area as security-sensitive.

At minimum:

* Authenticate all Finance operations.
* Enforce per-user authorization.
* Prevent users from accessing another user's statements or transactions.
* Validate uploaded file type and size.
* Do not expose raw server file paths.
* Avoid logging bank statement contents.
* Avoid logging account numbers.
* Avoid sending unnecessary statement data to external services.
* Remove sensitive data from error reporting where possible.

Document decisions in:

```text
08-security-and-privacy.md
```

---

# 47. Bank Account Data

Where statements include account numbers:

Prefer storing:

```text
masked account identifier
```

rather than unnecessarily exposing complete bank details throughout the application.

Example:

```text
****4831
```

Retain full data only when genuinely required.

---

# 48. Audit Trail

Financial modifications should ideally be auditable.

For important changes record:

```text
createdBy
source
createdAt
updatedAt
```

AI-originated records should be distinguishable from:

* manually created records,
* statement imports.

---

# 49. Error Handling

Design explicit error states for:

* Unsupported PDF
* Empty PDF
* Password-protected statement
* Extraction failure
* No transactions detected
* Duplicate statement
* Duplicate transactions
* Ambiguous transaction
* AI unavailable
* Database failure
* Partial import failure
* Invalid monetary input

Do not silently swallow errors.

---

# 50. Mobile First

Finance will often be used from a phone.

Every major flow must work on small screens:

* Chat
* Add expense
* View remaining balance
* Upload statement
* Review transactions
* Monthly planning
* Analytics

Tables should gracefully convert into mobile-friendly layouts where appropriate.

Do not create desktop-only tables requiring horizontal scrolling for basic operations.

---

# 51. Performance

Do not send thousands of raw transactions to the LLM for every chat message.

Create aggregation and retrieval mechanisms.

For example, the question:

> How much did I spend on Uber in June?

should trigger a structured database query.

Not:

> Send every transaction ever recorded to the LLM.

Use AI for reasoning and explanation.

Use the database for arithmetic and retrieval.

---

# 52. Testing Requirements

Create tests for financial calculations.

This is particularly important.

At minimum test:

### Transaction arithmetic

* income
* expenses
* balance

### Budget calculations

* planned
* actual
* variance
* remaining

### Forecast calculations

### Savings calculations

### Duplicate detection

### Date filtering

### Category aggregation

### Statement parsing where feasible

### AI tool authorization

### User isolation

### AI action validation

---

# 53. Acceptance Test Examples

Acceptance criteria should include scenarios such as:

### Scenario 1

Given income:

```text
R40,000
```

and expenses:

```text
Rent        R12,000
Food         R3,000
Transport    R2,000
```

the application must calculate:

```text
Remaining = R23,000
```

---

### Scenario 2

When the user tells the assistant:

> I spent R300 on Uber.

and confirms the proposed action:

A R300 expense must be created and current financial totals updated.

---

### Scenario 3

If the same statement is uploaded twice:

The user must be warned about duplicate transactions and duplicates must not silently be created.

---

### Scenario 4

When asked:

> Where did I spend most of my money in June?

The assistant must query actual June transactions and rank categories by total spending.

---

### Scenario 5

When asked:

> Where did I waste money?

The assistant must identify discretionary spending based on actual transactions and quantify its reasoning.

---

# 54. Implementation Phases

Do not attempt everything simultaneously.

## Phase 1 — Foundation

Build:

* Finance navigation
* Data model
* Transactions
* Categories
* Monthly financial plan
* Manual income/expense entry
* Core calculations

Complete acceptance criteria.

---

# 55. Phase 2 — AI Financial Assistant

Build:

* Finance chat interface
* Read tools
* Write tools
* Confirmation system
* Context handling
* Financial assistant system prompt

Test questions and actions.

---

# 56. Phase 3 — Bank Statement Import

Build:

* PDF upload
* Extraction
* Transaction parsing
* Normalisation
* Categorisation
* Review
* Duplicate detection
* Import

Test using representative statements.

---

# 57. Phase 4 — Analytics

Build:

* Monthly analytics
* Categories
* Merchant analytics
* Historical comparison
* Spending behaviour
* Waste analysis

Expose analytics to the AI.

---

# 58. Phase 5 — Financial Planning

Build:

* Savings goals
* Emergency fund
* Commitments
* Recurring expenses
* Safe-to-spend calculations

---

# 59. Phase 6 — Forecasting

Build:

* Month-end forecast
* Savings forecast
* Goal projections
* Scenario analysis

Expose all calculations to the assistant.

---

# 60. Phase 7 — Intelligence Layer

Build increasingly proactive behaviour:

* Overspending alerts
* Spending anomalies
* Subscription detection
* Budget risk
* Monthly financial review
* Proactive savings opportunities
* AI insight feed

---

# 61. Monthly Financial Review

One important feature not originally specified:

Generate an AI **Monthly Financial Review** after a statement is imported.

It should contain:

## Financial Scorecard

```text
Income
Total Spending
Savings
Savings Rate
Essential Spending
Discretionary Spending
```

## What improved

## What deteriorated

## Biggest money leaks

## Unusual transactions

## Budget misses

## Category changes

## Recommended cuts

## Expected impact of those cuts

## Forecast

## Three priorities for next month

The assistant should behave almost like a financial performance review.

---

# 62. Weekly Financial Check-In

Because Memory already has weekly planning, eventually connect Finance to it.

Example Friday insight:

> Financial check-in: You've spent R2,240 this week. Uber and restaurants represented 46% of discretionary spending. You're still approximately R780 within your weekly spending pace.

Potential future integration:

Memory could automatically add:

```text
Review finances
```

to weekly planning.

Do not implement this until the core Finance feature is stable unless trivial.

---

# 63. Future Capability — Financial Events

Eventually support questions like:

> I want to buy a car in 18 months. What would need to change?

> Can I afford moving to an apartment that costs R3,000 more?

> What income would I need to comfortably support my current lifestyle?

> What happens if I lose my salary for three months?

These should eventually use the same financial model and scenario engine.

Architect accordingly.

---

# 64. Explicit Non-Goals for Initial Release

Do NOT let scope explode into:

* Stock picking
* Crypto trading recommendations
* Tax filing
* Automated banking transactions
* Direct bank transfers
* Credit applications
* Portfolio management
* Automatic investment execution

The initial objective is:

> **Understand my money, control my spending, improve my financial behaviour, and help me make better financial decisions.**

---

# 65. Definition of Done

The Finance feature should not be considered complete merely because pages exist.

The initial meaningful version is done when the following flow works end-to-end:

### Flow A — Plan

I enter my monthly income and expected expenses.

Memory calculates my financial plan.

### Flow B — Record

I tell the assistant:

> "I spent R430 on groceries."

Memory records it and recalculates my available money.

### Flow C — Import

I upload a bank statement.

Memory extracts transactions, lets me review them, and imports them without duplicates.

### Flow D — Understand

I ask:

> "Where did my money go this month?"

Memory accurately explains my spending using the stored data.

### Flow E — Challenge

I ask:

> "Where am I wasting money?"

Memory identifies specific wasteful patterns and quantifies their cost.

### Flow F — Plan Forward

I ask:

> "How can I save R8,000 next month?"

Memory uses my actual behaviour to propose a realistic plan.

### Flow G — Forecast

I ask:

> "If I follow that plan for six months, where will I be?"

Memory calculates and explains the projected outcome.

When all seven flows work reliably, the product has become more than an expense tracker.

It has become a genuine **AI financial assistant inside Memory OS**.

---

# 66. Agent Execution Instructions

Before implementation:

1. Read this entire requirements document.
2. Inspect the existing Memory repository.
3. Create `/docs/finance/`.
4. Convert these requirements into formal requirements.
5. Create architecture documentation.
6. Create user stories.
7. Break stories into implementation tasks.
8. Create measurable acceptance criteria.
9. Create the acceptance criteria traceability matrix.
10. Identify dependencies between stories.
11. Order implementation logically.
12. Begin implementation only after documentation exists.

While implementing:

* Update `progress.md`.
* Check off acceptance criteria individually.
* Do not mark unfinished requirements complete.
* Run relevant tests regularly.
* Fix regressions before moving forward.
* Prefer small vertical slices that work end-to-end.
* Preserve existing Memory functionality.
* Follow established repository conventions.
* Keep mobile usability in scope throughout.
* Do not replace deterministic financial calculations with LLM guesses.

After each story:

1. Review its acceptance criteria.
2. Run the relevant tests.
3. Verify persistence.
4. Verify mobile and desktop behaviour where applicable.
5. Update documentation.
6. Record unresolved issues.
7. Only then mark the story complete.

Most importantly:

**Do not skim this specification and produce a superficial dashboard.**

The heart of this feature is the relationship between:

```text
STRUCTURED FINANCIAL DATA
        +
DETERMINISTIC CALCULATIONS
        +
FINANCIAL HISTORY
        +
AI REASONING
        +
CONVERSATIONAL ACTIONS
```

The AI assistant must sit on top of real financial infrastructure.

The chatbot is the interface.

The financial model underneath it is the source of truth.
