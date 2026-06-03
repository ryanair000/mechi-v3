# PlayMechi Matchmaking Dashboard Phased Implementation Plan

## Current Repo Reality

PlayMechi already has meaningful matchmaking infrastructure. The repo includes authenticated app routes, queue APIs, direct challenges, match rooms, result reporting, dispute proof upload, ratings, notifications, Paystack subscription pieces, and a capable admin surface.

The plan is therefore not a rebuild. It is a dashboard-first migration that reuses the working foundation, adds the missing open challenge/result/pass systems, and gradually moves players and operators to the planned `/dashboard/*` and `/admin/*` information architecture.

## Completion Definition

The dashboard plan is 100% implemented when a player can:

- Sign in, finish profile setup, and save game IDs.
- Join matchmaking from `/dashboard/play`.
- Create or accept direct and open challenges.
- Enter a match room from `/dashboard/matches/[id]`.
- Submit results, confirm opponent results, upload proof, or open a dispute.
- See ranking changes and per-game rank progress.
- Manage rewards, notifications, subscription/pass access, and payments.
- Get support without leaving the dashboard flow.

The operator side is complete when admins can:

- Monitor users, queues, challenges, matches, results, disputes, payments, subscriptions, tournaments, reports, moderators, content, analytics, and settings.
- Resolve disputes and match issues with audit logging.
- Enforce account, plan, and tournament rules without editing data manually.

## Phase 1 - Dashboard Route Foundation

Goal: establish the planned dashboard URL structure without breaking existing screens.

Scope:

- Add `/dashboard/play`, `/dashboard/challenges`, `/dashboard/matches`, `/dashboard/matches/[id]`, `/dashboard/game-ids`, `/dashboard/games`, `/dashboard/leaderboard`, `/dashboard/tournaments`, `/dashboard/rewards`, `/dashboard/socials`, `/dashboard/notifications`, and `/dashboard/profile`.
- Reuse existing working pages for this phase.
- Update desktop sidebar and mobile dock to make dashboard-first navigation the default.
- Keep legacy routes alive so old links, notifications, tests, and share flows do not break.
- Make queue selection preserve `/dashboard/play` when accessed through the new route.

Done when:

- New dashboard routes render.
- Sidebar and mobile nav point to the new dashboard routes.
- Legacy routes still work.
- Typecheck/lint does not introduce new route-layer errors.

## Phase 2 - Dashboard Command Center

Goal: replace the current promotional dashboard with an operational home.

Status: baseline implemented. `/dashboard` now renders a real player command center backed by existing APIs for queue state, current match, challenges, profile setup, rewards, notifications, recent results, subscription state, and open tournaments.

Scope:

- Build a real dashboard summary endpoint or server data loader.
- Show active match, pending result actions, pending challenges, open challenges, queue state, rank, selected games, tournament entries, rewards, plan/pass status, and unread notifications.
- Remove fake stats and avoid marketing-only cards.
- Add empty, loading, and error states.

Done when:

- `/dashboard` answers "what should I do next?" for a player.
- All cards are backed by real user data.
- Mobile and desktop layouts are dense, fast, and readable.

## Phase 3 - Play Queue Experience

Goal: make `/dashboard/play` the main matchmaking entry point.

Status: baseline implemented. `/dashboard/play` now lets players choose a configured ranked game and platform, joins through `/api/queue/join`, handles active matches, duplicate queue state, plan limit errors, setup errors, retry, active queue polling, cancel search, and match-room navigation.

Scope:

- Add game, platform, region, mode, and ranked/casual selection.
- Call the existing `/api/queue/join` route from the visible UI.
- Show active queue state, elapsed time, nearby pool count, and cancel action.
- Redirect match-found players to `/dashboard/matches/[id]`.
- Enforce plan/pass limits before joining.

Done when:

- A player can join queue from UI, wait, cancel, and land in a match room.
- Queue errors are understandable.
- E2E covers join, status polling, cancel, and match-found navigation.

## Phase 4 - Challenge Board

Goal: evolve direct challenges into the planned challenge marketplace.

Scope:

- Extend challenge data additively for open/direct/scheduled/rematch types.
- Add rank range, platform, expiry, notes, proof requirements, and accept rules.
- Build tabs for Open, Mine, Sent, Received, Completed, and Disputed.
- Keep existing direct challenge buttons working.

Done when:

- Players can post open challenges and accept eligible challenges.
- Direct challenges still work.
- Admin can inspect challenge health.

## Phase 5 - Match Room, Results, and Disputes

Goal: make the match room the operational source of truth.

Scope:

- Extract reusable match room components from the existing page.
- Add clearer lifecycle states: waiting, ready, in progress, awaiting result, awaiting confirmation, finalized, disputed, voided, expired.
- Add result submissions, opponent confirmation, auto-confirm windows, screenshot proof, and dispute escalation.
- Preserve current `matches` fields while adding normalized result/dispute tables where needed.

Done when:

- Both players have clear next actions.
- Result conflicts become disputes.
- Admin resolution finalizes match state and ratings safely.

## Phase 6 - Ranking System

Goal: implement the planned per-game rank model.

Scope:

- Add a normalized player game rating table.
- Backfill from existing profile rating columns.
- Implement Bronze III through Legend labels.
- Track games played, wins, losses, streaks, season, and rating history.
- Keep public leaderboard and dashboard rank cards consistent.

Done when:

- Each supported game has a reliable ranking ladder.
- Match finalization updates rank once and only once.
- Leaderboards, profile, and dashboard all agree.

## Phase 7 - Subscription and Pass Access

Goal: convert the existing subscription foundation into the planned access model.

Scope:

- Support Pro Daily, Pro Weekly, Pro Monthly, Elite Daily, Elite Weekly, and Elite Monthly.
- Keep payments for subscriptions, passes, and tournament registrations only.
- Avoid player cash staking or gambling-like flows.
- Enforce access in queue, challenges, game slots, and tournament perks.
- Update Paystack checkout metadata and entitlement activation.

Done when:

- Active entitlement controls product access.
- Payment callbacks activate the correct pass.
- Expired passes degrade gracefully.

## Phase 8 - Admin Completion

Goal: align operator tooling with the final plan.

Scope:

- Add dedicated admin routes for challenges, results, disputes, subscriptions, payments, reports, content, analytics, and settings.
- Reuse the current admin users, matches, queue, rewards, support, and tournament logic.
- Add role-safe actions and audit logs for every sensitive mutation.

Done when:

- Operators can manage the full dashboard lifecycle without manual database edits.
- Every high-risk action has authorization and audit coverage.

## Phase 9 - QA, Hardening, and Launch

Goal: prove the complete flow before broad rollout.

Scope:

- Add Playwright tests for login, profile setup, game IDs, queue, open challenge, direct challenge, match result, dispute, admin resolution, subscription checkout, and mobile navigation.
- Fix lint scope by excluding prototype/reference folders or moving them out of app lint paths.
- Add route smoke tests for dashboard and admin pages.
- Verify production runtime assumptions against EC2-only OpenClaw state.

Done when:

- Lint and tests pass for the production app scope.
- New dashboard routes are stable on mobile and desktop.
- Launch notes and rollback path are documented.
