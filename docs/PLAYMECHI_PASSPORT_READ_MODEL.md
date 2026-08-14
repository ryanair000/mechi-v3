# PlayMechi Public Passport Read Model

## Purpose

The public Gamer Passport is a high-traffic identity surface. Anonymous page, API, metadata, card, comparison, and unfurl requests must not rebuild slowly changing totals or mutate authoritative data.

This policy defines the bounded public read path introduced for review findings P1-8 and P1-9. Cross-request response caching and privacy-version invalidation are handled separately by P1-10.

## Authoritative sources and projections

Authoritative tables remain the source of truth. `passport_profile_summaries` is the maintained aggregate read model for counts that are expensive to recalculate per request:

- tournament registrations;
- verified event attendance;
- completed events;
- achievements;
- badges;
- public active teams;
- library totals;
- friend, follower, and following totals.

Migration `20260814114118_maintain_passport_public_summary.sql` refreshes the history, achievement, badge, and team portions after source changes. Existing game-library and social mutation paths maintain their portions of the same row. The migration also rebuilds these counts for existing profiles.

The public TypeScript projection consumes the summary row once. It does not issue count queries or write a summary during anonymous reads.

## Public request stages

The uncached public DTO path has three stages:

1. Resolve a published public handle and check minor-account containment.
2. Load the base profile.
3. Load the identity row, two bounded event-preview lists, one summary row, public teams, verification previews, and the visible game library in parallel.

The main public page request-memoizes the DTO with React `cache`, so `generateMetadata` and page rendering share the same result during a render. Highlights, stored progression, and shelves are loaded together rather than in a waterfall.

## Query budgets

Budgets are measured as application-to-database requests, not internal PostgreSQL plan nodes.

| Path | Budget | Enforcement |
|---|---:|---|
| Public Passport core DTO, cold | At most 10 database requests | Source contract plus runtime query telemetry planned in P1-11 |
| Aggregate count reads within the core DTO | Exactly 1 maintained-summary request | Source contract |
| Metadata plus page core DTO in one render | One memoized DTO invocation | React request cache contract |
| Public feature stage | One parallel application stage | Source contract |
| Anonymous public GET writes | 0 | Stored-progression contract and runtime test planned in P1-11 |

The migration-order compatibility fallbacks for missing legacy columns are excluded from the normal budget and must disappear after the required migrations are verified in production.

## Freshness rules

- Privacy, publication, minor-account, block, and friendship checks are live authorization gates and must never be replaced by a stale aggregate.
- Source triggers update aggregate counts in the same database transaction as the authoritative change.
- Game-library and social mutations update their summary fields before returning success.
- Public progression reads use `passport_dimension_snapshots`; only authenticated owner refreshes, mutation paths, or scheduled projection jobs may rebuild them.
- A missing progression snapshot omits progression from the public page. It never causes an anonymous request to calculate or write one.

## Performance targets

The production release gate is:

- public Passport p50 TTFB at or below 400 ms;
- p95 TTFB at or below 900 ms;
- p99 TTFB at or below 1.5 seconds;
- public Passport API p95 at or below 600 ms;
- zero database writes attributable to anonymous Passport GET requests.

These targets require production telemetry and are not considered proven by source tests or a local build.

## Rollout

1. Apply migrations in timestamp order through `20260814114118_maintain_passport_public_summary.sql`.
2. Compare maintained counts with authoritative queries for representative players.
3. Deploy the application change.
4. Verify metadata and page rendering reuse one request result.
5. Monitor query counts, TTFB percentiles, summary-trigger duration, and anonymous write telemetry.
6. Continue with P1-10 before general availability so warm anonymous reads use privacy-versioned caching.
