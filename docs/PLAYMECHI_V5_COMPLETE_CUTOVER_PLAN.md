# PlayMechi V5 Complete Cutover Plan

Status: active engineering execution contract  
Owner: Mechi  
Figma source: `PlayMechi — Homepage / Design System` (`pGJLHjMuAojRug16wBBR82`)  
Implementation branch: `codex/mechi-v5-complete-cutover`  
Last updated: 18 July 2026

## 1. Outcome

PlayMechi V5 is a complete replacement of the V4 presentation layer. It is a dashboard-first competition platform in which one account can work as a player, captain, organizer, creator, coach, sponsor, gaming shop, moderator, or Mechi administrator.

V5 is complete only when:

- no canonical journey renders a V4 component, shell, page composition, or fallback;
- signed-in actions happen inside the appropriate role workspace;
- public pages are reserved for discovery, trust, sharing, and authentication entry;
- the 82-page Figma file is represented by reusable production components and complete journeys rather than a gallery of static mock screens;
- existing safe backend behavior is preserved behind the V5 interface;
- missing workspace, team, permission, sponsorship, creator, coach, and shop contracts are added without destructive migration;
- critical journeys pass responsive, accessibility, authorization, data-integrity, and recovery verification;
- the production cutover is observable and reversible.

Mechi's main offering to gamers is a trusted competition identity and operating layer: discover suitable tournaments, enter solo or with a team, coordinate matches, submit verifiable results, resolve disputes fairly, and turn verified performance into rank and reputation.

## 2. Locked product rules

1. Any eligible account may activate an organizer workspace.
2. A tournament can publish without approval only if entry is free, cash prize is zero, and no material or valuable reward exists.
3. A paid-entry, cash-prize, sponsored-prize, voucher, merchandise, or otherwise rewarded tournament requires Mechi approval before registration can open.
4. Paystack is the payment rail for Mechi-controlled tournament payments.
5. Solo and team tournaments are first-class.
6. Authorized players, captains, organizers, and moderators may upload evidence.
7. A dispute pauses bracket progression, rank mutation, reputation mutation, payout eligibility, and finalization until an authorized decision is recorded.
8. Coach booking, calendars, paid coaching sessions, gaming-station booking, hourly gaming, betting, and user-to-user cash challenges are excluded.
9. High-risk actions require explicit confirmation, authorization, idempotency, and an audit trail.

The backend classifier is deterministic:

```text
requires_mechi_approval =
  entry_fee > 0
  OR cash_prize > 0
  OR valuable_reward_exists
  OR sponsor_funded_reward_exists
  OR manual_risk_flag_exists
```

The interface must show the classification before publication and explain which field triggered approval.

## 3. Current-state findings

The audited repository contains 158 route pages, but only 16 directly import V5 components. Fifty-three signed-in pages still use the old application shell, 20 admin pages retain the old admin interface, and 26 legacy campaign pages remain reachable. The current V5 catalog contains 22 slugs rendered by one generic sample template, so it is documentation rather than a wired product.

The current account role is limited to `user | moderator | admin`. It cannot model one identity with multiple workspaces. Tournament participation is player-only and the bracket data model is built around `player1_id` and `player2_id`; durable teams, organization membership, creator work, sponsor work, coaching authority, shop staff, and least-privilege workspace roles need additive contracts.

This cutover therefore cannot be a CSS reskin. It requires four coordinated changes:

1. a new semantic design system and responsive shell;
2. canonical public, identity, workspace, and admin routes;
3. additive workspace and competition-domain contracts;
4. legacy route isolation and redirect removal after verification.

## 4. Source-of-truth hierarchy

When sources differ, use this order:

1. locked product and money/safety rules in this document;
2. verified backend behavior and live data invariants;
3. canonical Figma pages 10 and 16–81;
4. `MECHI_V5_PRODUCT_UX_BLUEPRINT.md`;
5. legacy code only as a backend-behavior reference.

V4 styling, navigation, component composition, and copy are never a visual source of truth.

## 5. Experience architecture

### 5.1 Public surface

Public pages explain the product, enable discovery, and provide shareable proof:

```text
/
/tournaments
/tournaments/[slug]
/tournaments/[slug]/bracket
/tournaments/[slug]/participants
/games
/games/[slug]
/rankings
/players/[username]
/teams/[slug]
/organizations/[slug]
/watch
/watch/[streamId]
/regions/[country]
/support
/support/[articleSlug]
/legal/terms
/legal/privacy
/legal/community-rules
```

A public page may ask the user to sign in, but it must preserve the exact return URL.

### 5.2 Identity surface

```text
/login
/signup
/verify
/forgot-password
/reset-password
/mfa
/onboarding
```

Identity pages use a focused shell. After authentication, the server resolves the return target and active workspace.

### 5.3 Workspace surface

`/app` is the signed-in entry and workspace resolver. It sends the user to the last valid workspace or player workspace by default.

```text
/app/player
/app/player/tournaments
/app/player/matches
/app/player/teams
/app/player/rankings
/app/player/wallet
/app/player/inbox
/app/player/profile

/app/team/[workspaceId]
/app/team/[workspaceId]/roster
/app/team/[workspaceId]/tournaments
/app/team/[workspaceId]/matches
/app/team/[workspaceId]/invitations
/app/team/[workspaceId]/settings

/app/organizer/[workspaceId]
/app/organizer/[workspaceId]/tournaments
/app/organizer/[workspaceId]/tournaments/new
/app/organizer/[workspaceId]/tournaments/[tournamentId]
/app/organizer/[workspaceId]/participants
/app/organizer/[workspaceId]/matches
/app/organizer/[workspaceId]/communications
/app/organizer/[workspaceId]/finance
/app/organizer/[workspaceId]/analytics
/app/organizer/[workspaceId]/organization
/app/organizer/[workspaceId]/staff

/app/creator/[workspaceId]
/app/creator/[workspaceId]/content
/app/creator/[workspaceId]/live
/app/creator/[workspaceId]/coverage
/app/creator/[workspaceId]/opportunities
/app/creator/[workspaceId]/audience
/app/creator/[workspaceId]/reports
/app/creator/[workspaceId]/profile

/app/coach/[workspaceId]
/app/coach/[workspaceId]/expertise
/app/coach/[workspaceId]/guides
/app/coach/[workspaceId]/analysis
/app/coach/[workspaceId]/preparation
/app/coach/[workspaceId]/results
/app/coach/[workspaceId]/profile

/app/sponsor/[workspaceId]
/app/sponsor/[workspaceId]/marketplace
/app/sponsor/[workspaceId]/briefs
/app/sponsor/[workspaceId]/proposals
/app/sponsor/[workspaceId]/campaigns
/app/sponsor/[workspaceId]/evidence
/app/sponsor/[workspaceId]/reports
/app/sponsor/[workspaceId]/company

/app/shop/[workspaceId]
/app/shop/[workspaceId]/tournaments
/app/shop/[workspaceId]/venue
/app/shop/[workspaceId]/community
/app/shop/[workspaceId]/staff
/app/shop/[workspaceId]/analytics
/app/shop/[workspaceId]/profile
```

Shared `/app` utilities include workspace-aware notifications, messages, account security, preferences, help, and the workspace switcher.

### 5.4 Administration surface

```text
/app/admin
/app/admin/tournaments
/app/admin/tournaments/[id]
/app/admin/sponsorships
/app/admin/sponsorships/[id]
/app/admin/verification
/app/admin/verification/[id]
/app/admin/moderation
/app/admin/moderation/[id]
/app/admin/payouts
/app/admin/payouts/[id]
/app/admin/risk
/app/admin/audit
/app/admin/platform
```

Administration uses the V5 visual language but has a distinct high-risk shell, stronger permission boundaries, step-up authentication, and immutable decision references.

## 6. Workspace and permission model

An account is an identity. A workspace is a context in which that identity acts.

Workspace types:

| Type | Ownership | Core membership roles |
| --- | --- | --- |
| player | one per account | owner |
| team | captain or organization | captain, manager, starter, substitute, analyst |
| organizer | organization owner | owner, admin, operations, communications, finance-read, analyst |
| creator | creator identity or team | owner, manager, editor |
| coach | coach identity or organization | owner, editor, analyst |
| sponsor | verified company | owner, campaign manager, reviewer, finance-read, analyst |
| shop | verified gaming shop | owner, venue manager, tournament operator, staff, analyst |
| admin | Mechi | super-admin, operations, moderator, finance, support, analyst |

Rules:

- the active workspace is visible in desktop and mobile navigation;
- every query and mutation is scoped to both identity and workspace;
- availability, verification, suspension, and invitation status are explicit;
- role switching never silently submits an action begun in a different context;
- the last safe location is remembered per workspace;
- least privilege is the default;
- authorization is enforced server-side, not inferred from hidden buttons.

## 7. Core user stories

### 7.1 Player

- discover relevant tournaments by game, format, platform, region, time, entry, prize, and eligibility;
- see exactly why a tournament is or is not suitable;
- register solo or select an eligible team;
- complete Paystack payment once and recover from interruption without duplicate registration;
- check in, enter a match room, communicate, submit evidence, confirm or dispute a result;
- see the effect of verified outcomes on rank and reputation;
- review receipts, protected funds, prizes, payout status, and support routes;
- manage game accounts, privacy, safety, notifications, and identity security.

### 7.2 Captain and team

- create or join a team, invite members, and resolve expired or declined invitations;
- assign captain, starters, substitutes, and staff permissions;
- satisfy game-account and roster-readiness rules;
- register the team, lock the roster, check in, and operate matches;
- understand when a roster change is blocked and who can unlock or approve it;
- build a public verified team record.

### 7.3 Organizer

- activate an organizer workspace without creating a second account;
- create solo or team tournaments through a progressive wizard;
- publish a free/no-reward event immediately after readiness checks;
- submit paid or rewarded events for Mechi approval and respond to requested changes;
- manage participants, check-in, brackets, matches, results, disputes, communications, finance, reports, staff, and audit history;
- see blockers and next actions across every tournament from one portfolio dashboard.

### 7.4 Creator and streamer

- verify channels and coverage capability;
- find and accept suitable coverage assignments;
- complete live readiness, access tournament context, and submit stream links, clips, and evidence;
- track content, coverage delivery, audience, opportunities, and reports from Creator Studio;
- build public authority without changing official results.

### 7.5 Coach

- publish a verified expertise profile, guides, analyses, and team-preparation artifacts;
- connect work to games, tournaments, teams, and verified outcomes;
- build authority from useful, verifiable work;
- never see booking, rate, calendar, or checkout controls in V5.

### 7.6 Company sponsor

- create and verify a company workspace;
- describe goals, audience, budget band, games, region, and deliverables in a brief;
- discover suitable credible tournament opportunities;
- review proposals, Mechi protections, evidence, campaign health, and reports;
- invite staff with least-privilege roles.

### 7.7 Gaming shop

- verify a shop and venue, add staff, and describe equipment as venue facts;
- create and operate local tournaments under the shop organization;
- manage local check-in, match operations, community, and performance;
- never expose hourly station booking.

### 7.8 Moderator and administrator

- process tournament, sponsorship, identity, organization, moderation, appeal, and payout queues;
- see the subject, policy, evidence, history, conflicts, downstream effects, and allowed decisions together;
- request information, approve, reject, escalate, retry, reverse where policy allows, and record reasons;
- produce a durable audit reference and a clear user-facing outcome for every decision.

## 8. Reusable production design system

### 8.1 Semantic tokens

The UI uses semantic variables rather than hard-coded page colors:

- brand: electric teal `#32E0C4`, competitive coral `#FF6B6B`, night slate `#0B1121`;
- surfaces: canvas, surface, elevated, subtle, interactive, inverse;
- text: primary, secondary, muted, inverse, link;
- borders: subtle, default, strong, focus;
- states: success, warning, danger, info, pending, verified;
- layout: 4/8/12/16/24/32/48/64 spacing; compact and comfortable density;
- radius: control, card, panel, pill;
- shadow: soft, raised, overlay, focus;
- motion: fast, standard, slow, reduced-motion zero-transition alternative.

Light and dark modes share semantics. Dark mode is not a color inversion: media, charts, borders, disabled controls, status chips, focus, hover, and elevation each use tested dark tokens.

### 8.2 Foundational components

- application/public/identity/admin shells;
- workspace switcher and workspace badge;
- desktop sidebar, tablet rail, mobile header and bottom navigation;
- button, link-button, icon button, split action, danger confirmation;
- field, select, combobox, checkbox, radio, switch, date/time, money and upload controls;
- status badge, policy badge, identity badge, permission badge;
- page header, breadcrumb, tabs, local navigation, filter bar, saved view;
- metric card, action card, tournament card, match card, profile card, evidence card;
- data table with mobile list equivalent, pagination and bulk actions;
- timeline, activity feed, readiness checklist, progress stepper;
- drawer, modal, popover, command/search, toast, inline alert;
- skeleton, empty, filtered-empty, error, forbidden, offline, incident, success and partial-success states;
- bracket with accessible ordered-match alternative;
- evidence uploader/viewer/comparison;
- decision panel and immutable audit reference.

### 8.3 Density

The default desktop composition must provide the visual amount the Boss preferred at 90% browser zoom while the browser remains at 100%. This is implemented with compact tokens, a controlled 1440-wide content grid, restrained type sizes, and tighter cards—not CSS page scaling. Touch targets remain at least 44px and content remains usable at 200% text zoom.

## 9. Data and service contracts

All database work is additive until the final retirement window.

### 9.1 Workspace domain

- `workspaces`: identity, type, owner, slug, status, verification, public profile and metadata;
- `workspace_members`: account, role, status, permissions and invitation provenance;
- `workspace_invitations`: recipient, role, expiry, acceptance and revocation;
- `workspace_preferences`: last route, theme, density and notification preferences;
- server authorization helpers for membership, permissions, step-up, conflict and suspension.

### 9.2 Team domain

- `teams` and public team identity;
- `team_members` with captain/starter/substitute/staff status;
- invitations, join requests, roster snapshots and roster locks;
- game-account readiness and tournament-specific eligibility;
- team entry, check-in, result and dispute linkage.

### 9.3 Tournament domain

- retain existing tournament identifiers and live behavior;
- add participant type, team size, owning workspace and approval classification;
- introduce generic `tournament_entries` that can reference a user or team;
- add entry-state history, check-in and immutable registration references;
- evolve matches toward `entry_a_id` and `entry_b_id` while supporting old player fields during backfill;
- centralize tournament policy classification in a shared server module used by UI, API and admin review.

### 9.4 Role domains

- creator profiles, channels, assignments, live readiness, content, evidence and reports;
- coach profiles, credentials, expertise, guides, analyses and preparation artifacts;
- sponsor companies, briefs, proposals, campaigns, deliverables, evidence and reports;
- shop venue facts, staff, local events and community metrics;
- organization verification and public authority records.

### 9.5 Trust, payment and operations

- approval cases and requested changes;
- evidence objects with source, submitter, timestamp, checksum and access policy;
- moderation cases, conflicts, decisions, appeals and downstream holds;
- auditable payment references, Paystack events, idempotency keys, receipts, refunds, protected funds and payouts;
- immutable audit events with actor identity, workspace, before/after summary, reason and correlation reference.

### 9.6 API rules

- use server components for initial read models and narrow client islands for interaction;
- every mutation validates session, workspace membership, permission, current state, idempotency and policy;
- list endpoints support cursor pagination, filters and stable sort;
- money values are integer minor units with an explicit currency;
- dates are stored as UTC and rendered with an explicit timezone, defaulting to EAT where appropriate;
- response errors include a safe code, explanation, recoverability and correlation reference;
- uploads use signed access, type/size validation, progress, retry and durable association;
- webhooks are authenticated, idempotent and observable.

## 10. Canonical Figma-to-production map

| Figma pages | Production responsibility |
| --- | --- |
| 00–07, 12–15, 56–59 | tokens, foundations, components, forms, feedback, trust and operations primitives |
| 10 | public homepage |
| 16–17, 39–40, 60–63 | public discovery, tournament, rankings, profiles, games, watch, search and regional templates |
| 18–28 | tournament creation, registration/payment, match, bracket, control, dispute, finance, participants, communications and reports |
| 29–36, 64–72 | onboarding and organizer, sponsor, creator, coach and shop workspaces |
| 37–38 | player and team dashboards |
| 41–53, 80 | inbox, account, wallet, API, support, legal and system states |
| 73–79 | Mechi admin operations and trust surfaces |
| 81 | route, role, state and implementation index |

Pages 08 and 09 are archived. Pages 54 and 55 are reconciled dashboard references, not alternative shells.

## 11. Legacy route disposition

Every legacy route receives one explicit disposition: canonical replacement, permanent redirect, temporary compatibility adapter, or removal.

Initial compatibility map:

| Legacy route | V5 destination |
| --- | --- |
| `/dashboard` | `/app/player` |
| `/dashboard/tournaments` | `/app/player/tournaments` |
| `/dashboard/matches` | `/app/player/matches` |
| `/dashboard/wallet` | `/app/player/wallet` |
| `/streams/dashboard` | `/app/creator/{activeWorkspace}` |
| `/t/[slug]/manage` | `/app/organizer/{activeWorkspace}/tournaments/[slug]` |
| `/s/t/[slug]` | `/tournaments/[slug]` |
| old organizer pages | matching organizer workspace route |
| old admin pages | matching V5 admin queue/detail route |

A redirect that needs identity or workspace resolution uses a server resolver and preserves safe query context. A legacy route may not render its old page while marked complete.

## 12. Implementation phases

### Phase 0 — Contract, inventory and safety baseline

Deliverables:

- this execution document;
- machine-readable route and screen inventory;
- baseline build, lint, type, unit and browser results;
- documented migration and release rollback strategy;
- branch isolated from the dirty operator worktree.

Exit gate:

- every route is classified;
- no ambiguous V4/V5 source decision remains;
- the baseline failure list is recorded separately from V5 regressions.

### Phase 1 — V5 foundation and app shell

Deliverables:

- semantic light/dark tokens and compact/comfortable density;
- public, identity, workspace and admin shell primitives;
- responsive desktop sidebar, tablet rail and mobile bottom navigation;
- workspace switcher, global search, notifications, theme and account menu;
- page/state/form/card/table primitives;
- `/app` resolver and guarded workspace route boundary.

Exit gate:

- shell works at 390, 768, 1024, 1280, 1440 and 200% text zoom;
- keyboard, focus, reduced motion and theme persistence pass;
- switching workspaces changes navigation, permissions and route context safely;
- no shell imports a V4 visual component.

### Phase 2 — Player and account journeys

Deliverables:

- Player Dashboard, tournaments, matches, teams, rankings, wallet, inbox and profile;
- onboarding, game-account connection, identity verification and preferences;
- complete loading, empty, error, offline, permission and success states;
- real current tournament, match, result, rank, wallet and notification read models.

Exit gate:

- a new and returning player can identify the next action in five seconds;
- all dashboard actions remain within the player workspace;
- account and wallet language correctly distinguishes historical, protected, pending and withdrawable values.

### Phase 3 — Creator Studio

Deliverables:

- Creator overview, content, live, coverage, assignments, audience, opportunities, reports and profile;
- channel verification and live-readiness onboarding;
- tournament-context links and evidence submission;
- public creator authority projection where appropriate.

Exit gate:

- a creator can activate, accept an assignment, prepare, publish live context, submit evidence and see delivery reporting without leaving Creator Studio.

### Phase 4 — Organizer workspace

Deliverables:

- Organizer Portfolio and tournament control dashboard;
- organization onboarding, verification, staff, roles and permissions;
- portfolio blockers, approvals, live issues, drafts, tasks and activity;
- participant, match, communications, finance and analytics navigation.

Exit gate:

- every organizer task begins and ends inside the active organizer workspace;
- the portfolio reveals the next operational action and affected tournament;
- permission failures explain the role needed and a safe request path.

### Phase 5 — Tournament lifecycle

Deliverables:

- public directory/detail/bracket/participants;
- create wizard with solo/team and deterministic approval branch;
- registration, Paystack handoff, callback recovery and receipt;
- check-in, match room, result, evidence, confirmation, dispute and decision outcome;
- control center, bracket, standings, participants, match operations, communications, finance, analytics and sponsor report;
- accessible bracket list and low-bandwidth upload recovery.

Exit gate:

- free/no-reward events publish without approval after readiness checks;
- paid/rewarded events cannot open before approval;
- payment interruption cannot create duplicate charges or entries;
- disputes hold every dependent system and resume only after a valid decision;
- solo and team journeys pass end to end.

### Phase 6 — Team, sponsor, coach and shop workspaces

Deliverables:

- team create/join/invite/roster/readiness/register/check-in/match flows;
- sponsor marketplace, brief, proposal, campaign, evidence and report;
- coach expertise, guides, analysis, preparation and results;
- shop venue, staff, local tournament, community and analytics;
- public team, organization, coach, creator and shop authority projections.

Exit gate:

- each audience reaches its core value from workspace overview;
- coach and shop surfaces contain no booking leakage;
- all staff actions are least-privilege and audited;
- sponsorship approvals and evidence are Mechi-reviewable.

### Phase 7 — Shared communication, support and recovery

Deliverables:

- cross-workspace notification center and inbox with visible workspace context;
- conversation, attachment, block/report and delivery-failure states;
- account security, MFA, sessions, consent and communication preferences;
- wallet, receipts, payment recovery, payout recovery and help center;
- legal, privacy, community rules, not-found, forbidden, offline, maintenance and incident surfaces.

Exit gate:

- interrupted identity, payment, upload and decision flows return to exact context;
- safety actions do not require contact with the reported user;
- there are no unexplained dead ends.

### Phase 8 — V5 administration

Deliverables:

- operations overview;
- tournament and sponsorship approval queues and reviews;
- identity and organization verification;
- moderation, appeals and conflict checks;
- payout release with eligibility, holds, Paystack reference, dual approval and retry/reversal states;
- risk, immutable audit and platform health.

Exit gate:

- every gated user action has an operator queue and user-facing outcome;
- every high-risk decision has step-up, reason, scope, confirmation and audit reference;
- conflicts and insufficient permission block decisions server-side.

### Phase 9 — Legacy elimination and migration

Deliverables:

- route adapters and permanent redirects;
- removal of V4 imports from canonical route graphs;
- data backfill and compatibility-read retirement;
- asset, CSS and bundle cleanup;
- repository guard that fails CI if forbidden V4 imports re-enter canonical V5 routes.

Exit gate:

- canonical route crawl finds no legacy shell, generic catalog substitute or orphan journey;
- authenticated legacy URLs resolve into the correct workspace;
- production data reconciliation succeeds before destructive cleanup;
- no legacy table or component is removed until rollback and retention windows close.

### Phase 10 — Verification, release and observation

Deliverables:

- type, lint, unit, integration, accessibility and production-build passes;
- browser story suite for every critical audience and viewport;
- authorization, idempotency, payment, upload and webhook tests;
- performance budgets and production telemetry;
- preview stakeholder sign-off, database migration, production deployment and smoke test;
- post-release observation and rollback runbook.

Exit gate:

- all critical stories pass on preview and production;
- no severity-one or severity-two defect is open;
- no canonical route renders V4;
- telemetry confirms healthy auth, navigation, registration, payment, upload and decision flows;
- the old UI is unreachable except an intentionally retained rollback artifact outside the request path.

## 13. Verification matrix

Every phase must run the checks relevant to its risk:

| Layer | Required checks |
| --- | --- |
| Static | formatting, lint, TypeScript, forbidden-import rule, route collisions |
| Unit | policy classifier, permission matrix, money/date helpers, route resolver, state reducers |
| Integration | workspace authorization, registration idempotency, Paystack verification, evidence association, dispute holds, admin decisions |
| Browser | desktop/mobile user stories, back/forward, refresh, deep link, interrupted flow, theme, density |
| Accessibility | keyboard, focus, landmarks, names, contrast, target size, zoom, reduced motion, live updates |
| Performance | route payload, image sizing, LCP/CLS/INP, slow network, cached shell, section streaming |
| Security | IDOR/workspace isolation, privilege escalation, upload validation, CSRF/state, webhook authentication, redaction |
| Data | migration dry run, backfill counts, orphan detection, ledger reconciliation, audit completeness |
| Operations | queue ownership, escalation, user notification, correlation reference, retry and rollback |

Critical browser stories:

1. visitor discovers a tournament, signs up, and returns to registration;
2. player registers for a free solo tournament;
3. captain readies and registers a team;
4. player pays through Paystack and safely resumes after interruption;
5. player checks in, submits evidence and receives a verified result;
6. opponent disputes and moderator resolves with dependent holds;
7. eligible user publishes a free/no-reward tournament;
8. organizer submits a rewarded event and responds to a requested change;
9. creator completes coverage assignment;
10. sponsor creates a brief and reviews campaign evidence;
11. coach publishes analysis with no booking path;
12. shop operates a local tournament with no station-booking path;
13. admin approves, rejects, requests information and releases an eligible payout;
14. one account switches workspaces without leaking data or permissions;
15. legacy deep links resolve to the correct V5 context.

## 14. Release strategy

1. Build on the isolated cutover branch and keep the current production runtime untouched.
2. Apply additive migrations to a preview/staging database and run backfill/reconciliation.
3. Deploy a preview with canonical V5 routes and compatibility redirects.
4. Execute automated and manual story verification.
5. Freeze high-risk schema changes during final reconciliation.
6. Apply production-safe migrations before application promotion.
7. Promote the verified build, then smoke-test auth, workspace resolution, tournament discovery, registration, payment callback, upload and admin queues.
8. Observe logs, errors, web vitals, registration conversion, Paystack reconciliation and support contacts.
9. Roll back the application build if critical errors occur; do not destructively roll back additive schema.
10. Retire compatibility code only after the defined observation and data-retention window.

## 15. Definition of done

- [ ] Figma pages 10 and 16–81 have an implemented route/component/state disposition.
- [ ] One account can activate and switch every eligible workspace.
- [ ] Player, creator and organizer dashboards are production products, not static mock pages.
- [ ] Team, sponsor, coach and shop workspaces cover their complete V5 journeys.
- [ ] Free/no-reward and paid/rewarded tournament rules are enforced consistently.
- [ ] Solo and team registration, match, result and dispute flows work.
- [ ] Paystack registration and payout flows are idempotent and recoverable.
- [ ] Admin can operate every approval, verification, moderation and payout dependency.
- [ ] Light/dark and compact/comfortable modes pass HCI and accessibility gates.
- [ ] Desktop, tablet and mobile layouts are purpose-built and verified.
- [ ] All critical states have explanation, owner, next action and recovery.
- [ ] Canonical routes contain no V4 import or fallback.
- [ ] Legacy URLs redirect into V5 without losing safe context.
- [ ] Production build, tests, browser stories and smoke checks pass.
- [ ] Release telemetry is healthy and rollback remains available.

## 16. Execution tracking

Latest verified implementation evidence (18 July 2026):

- clean release worktree on `codex/mechi-v5-complete-cutover`;
- the current revision completed a clean production build across 280 routes after compilation, TypeScript, page-data collection, static generation, optimization and build-trace collection;
- canonical compact light/dark workspace shell implemented for player, team, organizer, creator, coach, sponsor, shop and admin;
- V5 identity shell now covers login, registration and password recovery; `/signup` canonically resolves to `/register`, and default post-auth routing enters `/app/player` or `/app/admin` instead of a legacy dashboard;
- Player Dashboard reads live tournament, match, reward, history and notification APIs;
- tournament discovery is a bespoke responsive directory rather than the generic Figma-gallery renderer;
- player registration now performs eligibility, free entry, Paystack handoff, callback recovery and payment verification inside Player Dashboard;
- organizer creation is a real five-stage solo/team wizard using the deterministic approval classifier and tournament API;
- match deep links now resolve to a V5 match workspace with result/score reporting, communication and dispute evidence;
- role-specific Team, Creator, Coach, Sponsor and Gaming Shop sections replace generic blank pages and explicitly exclude coach/shop booking;
- Mechi Operations reads protected statistics, tournament, support and reward-review sources in the V5 shell;
- operations queue rows and case decisions now stay inside `/app/admin`; tournament approval/rejection, support resolution/reopen and reward-review actions require an explicit reason and confirmation, while payout release remains visibly held without a complete eligibility contract;
- workspace/team schema and APIs are additive; migration `20260718144302` was transactionally dry-run, applied to the healthy `Mechi V4` Supabase project, and verified without creating fixture records;
- production verification confirms all nine V5 tables, twelve tournament/match columns, validated team-size constraints, RLS on every new table, zero anon/authenticated grants, no missing V5 foreign-key indexes, and no new V5 advisor warnings;
- `npm run check:v5-cutover` passes and rejects transitional presentation routes or legacy shells in canonical V5 source;
- targeted V5 lint, `tsc -p tsconfig.build.json --noEmit`, and `git diff --check` pass;
- Playwright verified the V5 public homepage at desktop and mobile, the tournament directory, the protected-player deep link, and the new identity shell at desktop light and 390px dark mode; the verified identity run reported zero browser errors and preserved `next=/app/player`.

| Phase | Status | Evidence |
| --- | --- | --- |
| 0. Contract and baseline | Complete | Blueprint, route audit, isolated cutover branch, clean lint baseline |
| 1. Foundation and shell | In progress | V5 public, identity, workspace and operations shells, workspace routes, semantic modes, workspace migration/API; desktop/mobile light/dark browser evidence passes, while tablet/200%-text gates remain |
| 2. Player and account | In progress | Live overview, V5 identity routing, tournament registration/Paystack recovery, matches, wallet, inbox and profile implemented; authenticated end-to-end fixture tests remain |
| 3. Creator Studio | In progress | Role-specific Studio sections and activation implemented; durable content/assignment contracts pending |
| 4. Organizer workspace | In progress | Live portfolio, tournament control and creation wizard implemented; staff/communications/finance mutations pending |
| 5. Tournament lifecycle | In progress | Public discovery/detail, solo entry/payment recovery, creation policy, match result/chat/evidence implemented; team entry/check-in/admin decision completion pending |
| 6. Team/sponsor/coach/shop | In progress | Role-specific dashboard journeys and workspace activation implemented; durable role-domain mutations pending |
| 7. Shared support/recovery | In progress | Password and Paystack recovery, inbox, support and canonical identity return paths are wired; MFA/session and complete cross-workspace recovery suite remain |
| 8. Administration | In progress | V5 protected overview, live queues and in-dashboard tournament/support/reward decision details implemented with confirmation and audit reasons; sponsorship/verification and payout-release contracts remain |
| 9. Legacy elimination | In progress | Canonical redirects, route disposition, production V5 schema migration and passing forbidden-route/import guard; compatibility campaign retirement remains |
| 10. Release | In progress | Current 280-route production build passes; branch publication, deployment and production smoke report remain |

This table is updated only when the phase exit gate has objective evidence. Visual resemblance alone is not completion.

### Current external release gates

1. **Authenticated fixtures:** player, captain, organizer, creator and operations browser stories need controlled preview accounts and tournament fixtures before money, evidence and decision mutations can be accepted as release-complete.

Resolved 19 July 2026: Supabase CLI access identified project `Mechi V4` (`zcpgarqumzxuwicjihxp`). The migration and transactional team-entry verification passed; no production fixture rows were retained.

Resolved 19 July 2026: the current V5 revision passed the complete Next.js production build, including all 280 generated pages.

These gates do not reopen V4 as a product option. Until they are cleared, the V5 branch is implementation-complete only for the verified surfaces above and remains intentionally unpromoted.
