# Mechi V5 Production Completion Contract

Status: active implementation and release contract

Owner: Mechi

Operator: the Boss

Engineering baseline: `5462297` (`codex/mechi-v5-1v1-challenges`)

Created: 21 July 2026

Production target: `mechi.club` and the protected Mechi operations host

## 1. Decision

Mechi V5 must not be promoted as the complete product until every P0 gate and every
in-scope product gate in this document has objective evidence. A page rendering, a
locally passing component, or an applied schema alone is not completion.

The release has two permitted scopes:

1. **Player competition release**: public discovery, identity, player dashboard,
   1v1 challenges, solo tournament entry, Paystack recovery, match operations,
   support, and the minimum protected operations queues required to run them.
2. **Complete V5 release**: the player release plus durable team, organizer,
   creator, coach, sponsor, gaming-shop, and Mechi administration journeys.

The complete V5 release is the default target. A player-only release requires an
explicit scope decision from the Boss and must hide unfinished workspaces rather
than present non-persistent workflow simulations as working products.

## 2. State vocabulary

Every tracked item uses exactly one implementation state and one release state.

Implementation states:

- `not_started`: no production implementation exists;
- `in_progress`: code or migration work exists but the contract is incomplete;
- `implemented`: code, migration, UI, and automated tests are present;
- `verified`: the complete local or preview flow passed with recorded evidence.

Release states:

- `not_applied`: not present in production;
- `applied_unverified`: deployed or migrated but not smoke-tested;
- `production_verified`: verified on the production artifact and production data
  boundary;
- `rolled_back`: removed from the active production path using the documented
  rollback procedure.

No item may be called complete unless it is both `verified` and
`production_verified`.

## 3. Non-negotiable invariants

### 3.1 Identity and authorization

- Every mutation independently validates the Mechi session.
- Every workspace mutation validates active membership, workspace state, and a
  named permission; route visibility is not authorization.
- Admin mutations validate the current live role and resource scope inside the
  route handler or server-only data layer.
- Suspended, removed, or banned identities cannot mutate protected resources.
- User-controlled metadata, request parameters, headers, or client state never
  decide authorization.
- Protected responses return minimal safe DTOs and never return service-role data
  records wholesale.

### 3.2 Database security

- All V5 tables in exposed schemas have RLS enabled even when application access
  is service-role-only.
- `anon` and `authenticated` have no direct table grants for server-only domains.
- Privileged functions are placed in a non-exposed schema when practical.
- Every `SECURITY DEFINER` function has an explicit safe `search_path`, revokes
  execution from `PUBLIC`, `anon`, and `authenticated`, and grants only the exact
  server role that needs it.
- Default privileges revoke function execution from `PUBLIC`, `anon`, and
  `authenticated`; new exposure is opt-in.
- Every foreign-key access path used for joins or cascades has an appropriate
  index.
- High-risk writes are atomic, idempotent, auditable, and safe under retries.

### 3.3 Payments and value

- A callback URL visit never proves payment.
- Every successful Paystack mutation verifies origin and the provider transaction
  or consumes an event whose authentic Paystack signature was verified at the
  active trust boundary.
- Reference, status, amount in subunits, currency, customer or stored intent, and
  relevant metadata must match before value is delivered.
- Payment success is idempotent under callback/webhook concurrency and repeated
  Paystack delivery.
- A mismatched or unverifiable event records a safe diagnostic and changes no
  subscription, entry, reward, or payout state.
- Refunds, reversals, payout release, and reward conversion require separate
  authorized contracts and immutable audit references.

### 3.4 Tournament integrity

- Free, zero-cash, no-valuable-reward tournaments may open immediately after
  readiness validation.
- Paid, cash-prize, sponsored, voucher, merchandise, or otherwise rewarded
  tournaments remain closed until Mechi approval.
- Material changes to an approved tournament re-run classification and return it
  to review when risk-bearing fields change.
- Entry, payment, eligibility, roster snapshot, check-in, bracket position,
  evidence, dispute, result, rank, reward, and payout states remain reconcilable.
- An open dispute pauses bracket progression, rank/reputation mutation, payout
  eligibility, and finalization until an authorized decision is recorded.

### 3.5 Release integrity

- The release is built from a clean committed SHA using `npm ci`.
- The exact tested preview artifact is promoted; production is not rebuilt from a
  different tree.
- Required checks cannot be bypassed by a merge with missing or unstarted jobs.
- Database migrations are additive until reconciliation and rollback windows end.
- Telemetry, alert ownership, smoke tests, and a known-good rollback artifact are
  active before traffic promotion.

## 4. Current baseline

Baseline facts to re-verify continuously during implementation:

| Area | Current state | Required production state |
| --- | --- | --- |
| V5 canonical UI | Public, identity, player, role, tournament, match, and admin shells exist | No canonical V4 presentation or unsafe fallback |
| 1v1 challenges | Committed in `5462297` | Full clean build and authenticated desktop/mobile verification |
| V5 storage | Workspace/team/entry foundation migration exists and is recorded as applied | Live privilege, constraint, index, and data reconciliation evidence |
| Privileged RPCs | Least-privilege migration and verification SQL are implemented locally; target application is pending | Explicit least-privilege migration and live role tests |
| Payments | Provider re-verification, exact intent matching, durable evidence, and atomic subscription activation are implemented locally | Green mismatch, retry, duplicate, callback, and webhook tests against the migrated E2E database |
| Dependencies | The 21 July audit was clean; on 22 July a new high-severity `sharp`/libvips advisory entered the Next 16.2.11 optional dependency chain | Upgrade to a supported patched Next/sharp resolution that passes audit and production build |
| Release verification | Operator-run quality, database, workspace, provider, admin, and browser gates are defined locally | Secret-free evidence records show every required gate passed on the exact release SHA |
| Release tree | Implementation worktree contains the reviewed release changes and is intentionally uncommitted | Clean signed-off release SHA and immutable artifact |
| Full role domains | Workspace membership, invitations, profiles/settings, and core team access are persistent; several specialist product lanes remain static or partial | Persistent, authorized, audited end-to-end journeys or an explicit hidden/excluded scope |

## 5. Workstream A — security and data integrity

### A1. Privileged function lockdown — P0

Deliverables:

- migration generated with the Supabase CLI naming workflow;
- revoke execution from `PUBLIC`, `anon`, and `authenticated` for all privileged
  reward, match, rate-limit, and future V5 functions;
- grant only `service_role` where server access is required;
- set safe function `search_path` values;
- establish safe default privileges for new functions;
- add verification SQL that checks `has_function_privilege` for every Data API
  role and fails when an unexpected grant exists;
- run Supabase security and performance advisors after application.

Exit evidence:

- migration transaction succeeds against the target schema;
- `anon` and `authenticated` receive `permission denied` when invoking protected
  functions;
- `service_role` retains required execution;
- no new advisor warning is introduced;
- reward and match server flows still pass.

Rollback:

- re-grant only the previous required server role privileges; never restore
  `PUBLIC` execution.

### A2. V5 authorization data layer — P0/P1

Deliverables:

- server-only helpers for workspace lookup, active membership, permission checks,
  suspension checks, ownership checks, and safe DTO projection;
- route handlers use those helpers rather than duplicating service-role queries;
- a named permission matrix for each workspace type;
- tests for owner, permitted member, insufficient member, removed member, banned
  user, wrong workspace, and missing resource.

Exit evidence:

- every V5 mutation has direct authorization tests;
- IDOR attempts return `403` or `404` without leaking resource details;
- proxy bypass does not bypass handler authorization.

### A3. Transaction and audit guarantees — P1

Deliverables:

- atomic database functions or short transactions for multi-table workspace,
  team, entry, decision, and payment mutations;
- stable idempotency keys and unique constraints;
- append-only audit events containing actor, workspace, action, subject,
  before/after summary, reason, correlation ID, and timestamp;
- failed audit writes on high-risk operations fail the operation rather than being
  silently ignored.

## 6. Workstream B — Paystack and value integrity

### B1. Payment verification service — P0

Deliverables:

- one server-only verifier for subscription, tournament, Weekend Cup, and
  Weka Mawe references;
- validate Paystack `status=success`, exact reference, expected amount in KES
  subunits, currency `KES`, and stored payment intent;
- validate expected metadata where the provider returns it;
- return safe reason codes without returning provider secrets or raw internal
  records;
- record provider transaction ID and verification timestamp when schema allows.

### B2. Webhook trust model — P0

Deliverables:

- direct Paystack requests require valid `x-paystack-signature` over the raw body;
- a forwarded event is accepted only under a documented trust contract and still
  verifies the transaction before delivering value;
- malformed JSON, unknown event types, unknown references, incorrect amounts,
  incorrect currency, and failed transactions change no value state;
- handler acknowledges safe duplicates idempotently;
- slow notifications are detached from the critical state mutation path.

### B3. Payment verification test matrix — P0

Required tests:

- valid signed success;
- invalid signature;
- valid forwarding secret with verified provider transaction;
- forwarding secret with provider verification failure;
- amount mismatch;
- currency mismatch;
- reference mismatch;
- metadata mismatch;
- duplicated webhook;
- webhook and callback race;
- previously active subscription;
- cancelled or failed intent receiving late success;
- provider timeout and retry;
- free tournament path performs no Paystack call.

## 7. Workstream C — V5 competition domains

### C1. Workspaces and invitations — P1

Persistent requirements:

- list and create permitted workspace types;
- invite, accept, decline, revoke, and expire membership invitations;
- update member roles and scoped permissions;
- suspend, remove, leave, archive, and restore under explicit policy;
- remember last safe route, theme, density, and notification preferences;
- company/shop verification gates public or money-bearing actions.

### C2. Teams — P1

Persistent requirements:

- create and edit team identity;
- invitations and join requests;
- captain, manager, starter, substitute, analyst, and member roles;
- game-account readiness;
- tournament-specific roster snapshots and locks;
- controlled unlock with actor and reason;
- team entry, payment, eligibility, check-in, bracket, match, evidence, dispute,
  result, and public record;
- concurrency tests preventing duplicate team entries and conflicting roster
  changes.

### C3. Organizer operations — P1

Persistent requirements:

- organizer workspace activation and staff roles;
- tournament portfolio with blockers and next actions;
- creation, draft recovery, classification, publish/review, requested changes,
  approval, and material-change re-review;
- participant, check-in, bracket, match, dispute, communications, finance,
  analytics, and audit operations;
- finance-read roles cannot mutate funds or decisions;
- communications have preview, recipient count, idempotency, and delivery audit.

### C4. Tournament lifecycle — P0/P1

Persistent requirements:

- solo and team entries use the generic entry contract;
- legacy player rows remain compatible during backfill;
- deterministic approval classification shared by UI, API, database safeguards,
  and admin review;
- evidence objects have source, submitter, timestamp, checksum, media access
  policy, and subject association;
- disputes create holds before any downstream finalization;
- bracket progression is idempotent and safe under concurrent reports;
- finalization creates an immutable result and reconciles rank, rewards, and
  payout eligibility.

## 8. Workstream D — authority and commercial domains

### D1. Creator Studio — P1

- creator profile and channel ownership verification;
- content records linked to tournaments, matches, and teams;
- coverage opportunity, invitation, proposal, acceptance, readiness, delivery,
  evidence, revision, and completion states;
- audience metrics labeled by source and freshness;
- public authority only reflects verified delivery.

### D2. Coach authority — P1

- expertise, credentials, guides, analyses, preparation artifacts, and result
  references;
- evidence and verification for authority claims;
- no booking, calendar, hourly-rate, or checkout surface;
- published work clearly separates analysis from official results.

### D3. Sponsor workspace — P1

- verified company profile and least-privilege staff;
- brief, suitability, proposal, requested changes, approval, campaign,
  deliverable, evidence, revision, completion, and report contracts;
- budget is represented as a controlled band or verified integer minor unit;
- no payout or protected-fund release without a separate approved contract.

### D4. Gaming shop workspace — P1

- shop identity, venue facts, equipment, capacity, accessibility, ownership
  verification, staff, local tournaments, community metrics, and public record;
- no hourly station booking or gambling/betting surface;
- venue capacity and tournament capacity remain distinct validated fields.

## 9. Workstream E — Mechi administration

Required queues and detail contracts:

- tournament approval and requested changes;
- organization, company, channel, venue, credential, and identity verification;
- sponsorship review;
- moderation, conflicts, disputes, appeals, and downstream holds;
- rewards review;
- payout eligibility and release;
- risk flags;
- immutable audit search;
- platform configuration with change history and step-up authorization.

Every decision must show subject, policy, evidence, history, conflicts, downstream
effects, permitted actions, required reason, correlation reference, and the
user-visible outcome before confirmation.

Payout release remains disabled until recipient identity, eligibility, final
result, dispute status, amount, funding source, duplicate protection, approval
authority, and reversal policy are implemented and tested.

## 10. Workstream F — account, support, and recovery

- login, registration, password reset, magic link, safe return URL, and banned
  account flows;
- MFA enrollment, challenge, recovery codes, disable flow, and step-up policy for
  high-risk admin actions;
- session inventory and revocation;
- workspace-aware inbox and notifications;
- support case creation, messaging, assignment, resolution, reopen, escalation,
  account linking, and audit;
- payment interruption recovery without duplicate value delivery;
- offline, timeout, retry, partial-success, and forbidden states for critical
  journeys.

## 11. Workstream G — dependency, verification, and release engineering

### G1. Dependency policy — P0

- production audit has zero critical/high advisories;
- direct runtime dependencies are used and justified;
- unused direct dependencies are removed;
- overrides are temporary, documented, and verified by the lockfile;
- Next.js and React remain on patched stable versions supported by the repository;
- lockfile changes pass clean install, type, lint, tests, and production build.

### G2. Required operator-run verification — P0

Required checks on the release SHA, executed from a trusted operator machine:

1. clean `npm ci`;
2. dependency audit policy;
3. V5 cutover guard;
4. TypeScript build configuration;
5. lint with zero warnings on release-owned code;
6. migration static checks and database privilege verification;
7. public authentication browser suite;
8. player desktop suite;
9. player mobile suite;
10. admin suite;
11. provider mock suite;
12. cross-browser smoke;
13. production build;
14. preview smoke against the produced artifact.

`npm run release:verify` runs the quality, isolated-database, and browser gates in
fail-fast order and records a secret-free JSON evidence file under `output/`.
GitHub Actions is not part of the Mechi release process. Provider sandbox tests
remain manually supervised and must run before production when money or messaging
code changes.

### G3. Artifact promotion — P0

- build one preview artifact with production-equivalent configuration;
- run browser and API tests against that preview;
- record URL, deployment ID, Git SHA, migration set, and test run;
- promote the same artifact to production;
- do not rebuild between verification and promotion.

## 12. Workstream H — observability and operations

- structured safe error codes and correlation IDs for critical routes;
- Sentry release association and source maps;
- PostHog events for discovery, registration, payment handoff, payment recovery,
  match actions, dispute creation, and workspace activation without sensitive
  payloads;
- alerts for authentication spikes, webhook verification failure, payment
  mismatch, duplicate mutation, database errors, provider latency, and admin
  decision failure;
- dashboards for registration conversion, payment completion, match completion,
  dispute rate, queue age, and error rate;
- named alert owner and escalation route;
- documented data retention and privacy posture.

## 13. Automated fixture contract

Preview fixtures must be deterministic, isolated from production, and removable.

Required identities:

- player with supported game IDs;
- second player for 1v1 challenges;
- banned player;
- captain and team members;
- organizer owner, operations member, communications member, finance-read member;
- creator;
- coach;
- sponsor owner and reviewer;
- shop owner and venue staff;
- moderator;
- Mechi administrator.

Required competition fixtures:

- free solo tournament;
- paid solo tournament pending approval;
- approved paid tournament;
- free team tournament;
- rewarded tournament pending approval;
- tournament with requested changes;
- active match;
- disputed match with progression hold;
- completed match eligible for finalization;
- failed, pending, paid, duplicated, and mismatched payment intents.

Fixture scripts must refuse to run against production unless a separate explicit
and approved production-smoke mode uses non-mutating checks or dedicated records.

## 14. Verification matrix

For every critical story, capture all five boundaries:

| Boundary | Evidence |
| --- | --- |
| UI trigger | Route, viewport, visible state, accessibility and console result |
| Client to API | Method, safe payload shape, response code and correlation ID |
| API authorization | Session, workspace/resource permission and state decision |
| API to data/provider | Query or provider result, transaction/idempotency evidence |
| Response to UI | Success, recoverable error, retry behavior and persisted result |

Minimum viewports:

- 390px mobile;
- 768px tablet;
- 1024px compact desktop;
- 1440px desktop;
- 200% text zoom;
- light, dark, reduced-motion, keyboard-only, and screen-reader spot checks.

## 15. Migration procedure

1. Generate new migrations with `supabase migration new <descriptive_name>`.
2. Review SQL for idempotency, locks, RLS, grants, function search paths,
   constraints, foreign-key indexes, and rollback behavior.
3. Test in a transaction or local/preview database.
4. Run migration list and schema-diff checks.
5. Apply to preview and run privilege, constraint, index, reconciliation, and
   advisor checks.
6. Back up or record affected production rows before high-risk migration.
7. Apply additive production migration before application promotion.
8. Run the same verification SQL in production.
9. Promote only after the schema is healthy.
10. Retain compatibility columns/tables until the observation and rollback window
    closes.

## 16. Production promotion procedure

1. Confirm clean release branch and approved SHA.
2. Confirm all migrations are committed and preview-applied.
3. Confirm required secrets exist without printing their values.
4. Produce preview artifact.
5. Run `npm run release:verify` and the required fixture suites from the trusted
   operator machine.
6. Obtain product and operations sign-off on the preview.
7. Apply production-safe migrations and run verification SQL.
8. Promote the already-tested artifact.
9. Run production smoke tests for public, identity, player, payment recovery,
   admin access denial/allowance, and critical read paths.
10. Watch errors, payments, registrations, database health, and queue age through
    the defined observation window.

## 17. Rollback triggers

Immediate rollback or feature disablement is required for:

- unauthorized data or admin access;
- payment value delivered without successful provider verification;
- incorrect amount, duplicate charge/value, or reconciliation drift;
- registration or match corruption;
- privilege regression exposing protected functions or tables;
- sustained authentication failure;
- elevated server error rate on critical journeys;
- inability to observe or correlate money-critical failures.

Rollback order:

1. disable the affected feature or payment entry point;
2. stop traffic promotion;
3. preserve logs, correlation IDs, provider references, and affected row IDs;
4. promote the known-good artifact;
5. do not destructively reverse additive schema unless it blocks the known-good
   artifact;
6. reconcile all value-bearing records before reopening.

## 18. Definition of done

Mechi V5 is production complete only when:

- every P0 item is `verified` and `production_verified`;
- every role exposed in navigation has persistent authorized journeys or is
  explicitly excluded from the release;
- all critical money, tournament, evidence, dispute, rank, reward, and payout
  invariants pass concurrency and recovery tests;
- zero canonical route renders a V4 presentation fallback;
- zero critical/high production dependency advisory remains without an approved,
  proven non-reachable exception;
- required operator-run verification passed on the exact release SHA and its
  evidence record is retained;
- preview, migration, production smoke, telemetry, and rollback evidence are
  linked from the release record;
- support and operations have queue ownership and recovery instructions;
- the Boss approves the verified release scope.

## 19. Execution log

Use this section for concise evidence, not narrative status claims.

| Date | Revision | Workstream | Implementation state | Release state | Evidence |
| --- | --- | --- | --- | --- | --- |
| 2026-07-21 | `5462297` | Baseline and completion contract | implemented | not_applied | Contract created from the V5 production-readiness audit |
| 2026-07-21 | working tree | A1 database privilege boundary | implemented | not_applied | Global public-schema function/table/sequence revocation, service-only RPC grants, and `v5_production_security.sql` |
| 2026-07-21 | working tree | A2/A3 workspace authorization and atomic writes | implemented | not_applied | Central workspace permission layer, atomic workspace/invitation/member/approval RPCs, append-only workspace audit boundary, and IDOR E2E cases |
| 2026-07-21 | working tree | B payments and value safety | implemented | not_applied | Exact Paystack verification, durable provider evidence, mismatch/retry fixtures, atomic subscription activation, and automatic payout release disabled |
| 2026-07-21 | working tree | C/D workspace and team foundation | implemented | not_applied | Functional workspace profile, settings, members, invitations, player inbox, organizer ownership, and deterministic E2E fixtures |
| 2026-07-21 | working tree | D1 free team tournament entry | implemented | not_applied | Server-authorized roster locking, immutable game-ID snapshot, active-player conflict constraint, idempotent capacity-safe entry, audited withdrawal, functional team UI, and Playwright contract |
| 2026-07-21 | working tree | G1 dependencies | verified | not_applied | `npm audit --omit=dev --audit-level=moderate`: zero vulnerabilities; V5 cutover guard passed |
| 2026-07-22 | working tree | G2 local code and artifact gates | verified | not_applied | Source lint and full typecheck exited 0; Next 16.2.11 production build compiled 281/281 static routes as artifact `SJT0MfVLZkmn4M5JrTNvm`; localhost redirect chain ended at sign-in with HTTP 200 |
| 2026-07-22 | `4de17de` | G2 operator-run release verification | implemented | not_applied | GitHub Actions removed by operator decision; `release:quality`, `release:database`, `release:e2e`, `release:preview`, and fail-fast `release:verify` commands produce local evidence without exposing secrets |
| 2026-07-22 | `4de17de` + working tree | G1 dependency recheck | blocked | not_applied | Operator gate detected two new high-severity `sharp`/libvips advisories inherited through stable Next 16.2.11. A forced `sharp@0.35.3` experiment cleared audit but failed to produce a production artifact within the 15-minute diagnostic ceiling and was rejected. |

## 20. Current release assessment and exact work left

Decision as of 21 July 2026: **Mechi V5 is materially hardened but is not yet
production complete and must not be deployed as the complete V5 product.** The
local artifact gate is healthy. Production promotion is blocked by unapplied
migrations, unexecuted isolated-database/browser gates, and incomplete persistent
journeys in several advertised role domains.

### 20.1 Implemented in this revision

- privileged function, table, and sequence access is fail-closed for browser Data
  API roles, with explicit service-role execution and a read-only verification
  script;
- high-risk V5 workspace creation, update, archive, invitation, membership, and
  tournament approval operations have atomic database contracts and audit writes;
- V5 workspace authorization is centralized, permission-based, state-aware, and
  uses non-leaking not-found behavior for cross-workspace access;
- workspace people, invitation inbox, profile/settings, and organizer ownership
  are persisted rather than simulated in UI state;
- Paystack success now requires provider re-verification of exact reference,
  amount, currency, status, and expected metadata before fulfillment;
- paid products persist provider transaction ID, currency, and verification time;
- subscription activation, entitlement update, and prior-plan retirement are one
  atomic database operation;
- automatic prize transfer has been removed; payout remains pending until a
  reviewed release workflow exists;
- dependency audit is a blocking operator gate; its latest run correctly stopped
  promotion on the newly published Next/sharp advisory;
- the operator release runner has blocking quality, isolated database, provider,
  workspace, admin, player, mobile, and cross-browser gates;
- deterministic workspace and payment mismatch fixtures are included;
- free team tournaments have durable idempotent entry, immutable roster snapshot,
  cross-team player conflict, capacity, roster-lock, and audited withdrawal paths;
- the current production artifact builds and boots locally.

### 20.2 P0 gates still required before any production promotion

1. Configure the trusted operator environment, especially
   `E2E_SUPABASE_DB_URL`, against a dedicated non-production database that is safe
   to reset. Do not store these release credentials in GitHub Actions.
2. Apply the full migration chain to that isolated database, run Supabase lint,
   run `supabase/verification/v5_production_security.sql`, and resolve any SQL,
   privilege, advisor, or reconciliation finding. These migrations have not been
   applied to a live database from this worktree.
3. Run `npm run release:verify` on the committed release SHA and retain the JSON
   evidence record. The provider, workspace, player, admin, mobile, and
   cross-browser suites deliberately reset the configured E2E database and must
   never target production.
4. Produce a production-equivalent preview deployment, run the same suites and
   manual money/auth/accessibility smoke checks against it, and record the
   deployment ID and Git SHA.
5. Verify production environment variables, Paystack webhook configuration,
   Sentry release/source maps, PostHog events, alerts, owners, and rollback
   artifact without printing secrets.
6. Apply the additive migrations to production, execute the read-only production
   verification and reconciliation checks, promote the already-tested artifact,
   and complete the observation-window smoke run.

Steps 4–6 are externally visible or change live state and require explicit
approval from the Boss immediately before execution.

### 20.3 Product work still required for the complete V5 scope

- Team: the free-entry roster snapshot/lock and withdrawal lifecycle is now
  implemented. Paid team payment intents/reconciliation, check-in, controlled
  substitutions after lock, match-room operation, and disqualification/refund
  recovery remain.
- Organizer: complete participant operations, bracket configuration/progression,
  evidence/dispute holds, finance/reconciliation, announcements, and material
  change re-approval.
- Creator: persistent content, analytics, collaboration, campaign, rights, and
  monetization records with authorization and audit coverage.
- Coach: persistent programs, athlete assignments, sessions, availability,
  notes/privacy, reporting, and billing boundaries.
- Sponsor: persistent campaigns, deliverables, approvals, asset rights, reporting,
  and spend controls.
- Gaming shop: persistent venue/station inventory, booking conflicts, check-in,
  event operations, settlements, and maintenance workflows.
- Mechi admin: verification and sponsorship queues, risk review, immutable audit
  search, platform configuration history, and step-up authorization remain
  incomplete or partially static.
- Account/support: MFA recovery, session inventory/revocation, step-up policy, and
  all workspace-aware support recovery states still need full E2E closure.
- Audit consistency: legacy admin mutation paths that call `writeAuditLog` after a
  separate update must be converted to atomic decision functions; the new V5
  approval and workspace paths are atomic, but the legacy surface is not yet
  uniformly fail-closed.
- Payouts: recipient identity, eligibility review, duplicate protection, approval,
  release, reconciliation, and reversal workflows do not yet exist. Payout
  release must remain disabled.

If the immediate release is deliberately reduced to the player competition
scope, unfinished role routes must be hidden behind a server-controlled release
flag and removed from public claims. That narrower scope still requires every P0
gate in section 20.2.
