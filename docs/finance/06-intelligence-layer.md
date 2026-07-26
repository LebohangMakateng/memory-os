# Finance Phase 6 - Intelligence Layer

## Goal

Make Finance proactive and review-oriented after the data model, assistant, import, analytics, and planning features are reliable.

## Scope

- Monthly financial review.
- Weekly financial check-in.
- AI insights feed improvements.
- Behavioral coaching.
- Future financial events.
- Stronger assistant memory.

## Monthly Financial Review

Generate a structured review at month end:

- financial scorecard
- what improved
- what deteriorated
- biggest money leaks
- unusual transactions
- budget misses
- category changes
- recommended cuts
- expected impact of those cuts
- forecast
- three priorities for next month

The review should behave like a financial performance review: direct, specific, and evidence-backed.

## Weekly Financial Check-In

Generate a shorter weekly check-in:

- current month progress
- remaining money
- categories at risk
- unusual spending
- upcoming commitments
- recommended restraint for the next week
- savings goal status

## Assistant Personality

The assistant should be:

- direct
- practical
- numerate
- evidence-based
- willing to challenge poor financial decisions
- clear about uncertainty

The assistant should not:

- insult the user
- moralize without data
- invent missing records
- pretend uncertain classifications are facts
- use generic budgeting advice when specific data is available

## AI Memory

Improve durable memory for:

- financial preferences
- goals
- recurring constraints
- user-defined category strictness
- known merchant mappings
- planning assumptions

Keep chat transcript context separate from durable financial memory.

## Future Financial Events

Eventually support financial event planning:

- job change
- move
- large purchase
- travel
- new debt
- income interruption

These should use the same financial model and scenario engine.

## Acceptance Criteria

- User can generate a monthly review from actual records.
- User can generate a weekly check-in.
- Review recommendations quantify expected impact.
- Assistant uses durable preferences where relevant.
- Assistant clearly flags incomplete data.

## Tests

Add tests for:

- review data assembly
- missing data caveats
- insight ranking
- weekly check-in calculations
- durable memory retrieval
- recommendation impact calculations
