# Mechi V5 Player Journey Implementation Contract

Status: implementation source of truth  
Owner: Mechi  
Audience: product, design, engineering, support, tournament operations, QA  
Last updated: 22 July 2026

## 1. Outcome

Mechi V5 will guide a player to the next useful action instead of presenting every available feature at once. The authenticated player experience is complete only when tournaments, direct 1v1 play, teams, results, support, notifications, and recovery states use live backend data and form one continuous journey.

The player home must answer, in this order:

1. What needs my attention now?
2. What should I do next?
3. What is coming later?
4. Where can I review my history and progress?

No prototype-only action, sample metric, decorative tab, dead route, or V4 fallback is allowed in the completed V5 journey.

## 2. Player promise

A player can:

- finish the minimum profile needed to play;
- find and join a suitable tournament;
- play a direct 1v1 match;
- create or join a team;
- prepare a legal tournament roster;
- check in and enter the correct match room;
- report a result with screenshot or video proof;
- confirm or dispute a reported result;
- understand which results count toward rank;
- see payment, prize, and refund status without ambiguous balances;
- ask for help from the exact context where a problem occurred;
- follow a support case through resolution or appeal.

## 3. Product language

V5 uses the player's language, not internal platform language.

| Avoid | Use |
| --- | --- |
| Competition identity | Player profile |
| Competitive journey | Your games and tournaments |
| Reputation | Fair-play score |
| Verified result | Confirmed result |
| Evidence | Screenshot or video proof |
| Workspace | Use Mechi as / Switch profile |
| Readiness | Ready to play |
| Participant mode | Playing solo / Playing with a team |
| Result lifecycle | What happens next |
| Payout readiness | Prize payment status |
| 1v1 Challenges | Play 1v1 |
| Challenge player | Invite to play |
| Outbound challenges | Invites you sent |
| Mechi protected | Payment and prize protected by Mechi |
| Pending external action | Waiting for the named person or service |

`Tournament` is used for a tournament. `Match` is used for a match. `Competition` is reserved for broad brand statements and is not used as a substitute for either object in task instructions.

## 4. Player home

### 4.1 Priority engine

The player home presents one dominant next action. The first applicable state wins:

1. Active match room is open.
2. Tournament or team check-in is open.
3. Incoming 1v1 invite needs a response.
4. Interrupted tournament registration or payment can be resumed.
5. A reported result needs confirmation or dispute.
6. Team roster or game account is blocking registration.
7. A registered tournament is approaching.
8. The player has no active item and should find a tournament or play 1v1.

Every next action contains:

- a specific title;
- a plain-language explanation;
- owner of the next step;
- deadline and absolute EAT time when relevant;
- one primary action;
- one optional secondary action only when it helps recovery.

### 4.2 Page structure

Above the fold:

- greeting and player setup status;
- one `Do this next` card;
- compact `Today` list.

Below the fold:

- up to three relevant tournaments;
- team summary or create/join team prompt;
- incoming and sent 1v1 activity;
- recent confirmed results;
- compact player progress summary.

Rank breakdowns, achievements, full history, recommendations, wallet details, and profile details live on their dedicated pages.

### 4.3 Home API contract

`GET /api/dashboard/player` returns a player-safe DTO containing:

- profile completion;
- computed `nextAction`;
- active/current match;
- incoming 1v1 count;
- tournament registrations and check-in state;
- team summary and blockers;
- unread notifications;
- recent confirmed results;
- recommended tournaments only when no urgent item outranks them.

The API performs authentication and authorization beside the data query. It never returns private game IDs, contact details, or unrelated team-member data.

## 5. New player journey

1. Create account.
2. Verify account.
3. Choose games.
4. Add the public game name or ID required to play.
5. Land on player home.
6. Choose `Find a tournament`, `Play 1v1`, or `Create or join a team`.

Optional setup can be skipped, but the consequence is explicit. Example: `You can browse now, but you will need your eFootball player name before sending a 1v1 invite.`

## 6. Tournament journey

### 6.1 Discovery

Directory cards show:

- game;
- solo or team;
- registration state;
- start date in EAT;
- entry fee;
- cash prize and non-cash reward separately;
- Mechi approval where required;
- slots used and total capacity;
- one action: view, resume, check in, or open match.

### 6.2 Registration

1. Check eligibility before collecting data.
2. Choose self or eligible team.
3. Verify required game account and roster.
4. Show fee, refund rule, prize, reward conditions, schedule, and check-in.
5. Reserve a slot idempotently.
6. Open Paystack only for a valid paid reservation.
7. Return to the exact registration after payment.
8. Confirm registration with a durable reference and next action.

Duplicate slot and duplicate charge protection is mandatory. Interrupted, expired, successful, failed, duplicate, and refunded states are first-class screens.

### 6.3 Play and result

Registered -> check-in -> match room -> play -> report score -> upload proof -> opponent response -> confirmed result or dispute -> rank/prize consequences.

A dispute pauses bracket progression, rank movement, fair-play changes, and prize eligibility until an authorized decision is recorded.

## 7. Direct 1v1 journey

The player-facing name is `Play 1v1`.

Page order:

1. Incoming invites requiring action.
2. Choose a supported 1v1 game.
3. Search eligible players.
4. Send an invite.
5. Sent invites with expiry and cancel action.
6. Recent 1v1 matches.

Rules:

- only games saved by the player and supporting 1v1 are selectable;
- both players need compatible platform and game setup;
- a player in an active queue or match cannot create a conflicting match;
- duplicate pending invites are blocked;
- invites expire after the backend-defined period;
- accepting creates exactly one match;
- decline and cancel are reversible only by sending a new invite;
- every mutation returns the updated item and a user-facing next action.

## 8. Team journey

### 8.1 Team lifecycle

No team -> create team or accept invite -> add members -> assign roles -> add game roster -> resolve blockers -> register -> roster lock -> team check-in -> matches -> confirmed team record.

### 8.2 Team data model

#### `teams`

- `id`
- `name`
- `slug`
- `description`
- `region`
- `avatar_url`
- `visibility`: public or private
- `recruiting`
- `owner_id`
- timestamps

#### `team_members`

- `team_id`
- `user_id`
- `role`: captain, starter, substitute, member
- `status`: active, left, removed
- `joined_at`
- `left_at`

One active membership per team/user. Every team has at least one active captain. Ownership transfer is required before the owner leaves.

#### `team_invitations`

- team, invitee, inviter;
- pending, accepted, declined, cancelled, expired;
- expiry and response timestamps.

Duplicate pending invitations are blocked.

#### `team_roster_entries`

- team;
- game;
- member;
- roster role;
- game account snapshot;
- eligibility status and reason.

#### Tournament team registration

Team tournaments store the selected team and an immutable roster snapshot. A roster lock records who locked it, when, and the tournament rule that triggered the lock.

### 8.3 Team permissions

| Action | Owner/captain | Starter/member | Invitee |
| --- | --- | --- | --- |
| Edit team profile | Yes | No | No |
| Invite/cancel invitation | Yes | No | No |
| Assign roster roles | Yes | No | No |
| Accept/decline own invitation | No | No | Yes |
| Leave unlocked team | Yes, after ownership transfer if owner | Yes | No |
| Register team | Yes | No | No |
| Check in self | Yes | Yes | No |
| Lock tournament roster | Yes | No | No |
| Submit team result | Yes | According to tournament permission | No |

Every API repeats authorization server-side. Hidden buttons are not an authorization control.

### 8.4 Team API

- `GET /api/teams` - active memberships and invitations for current player.
- `POST /api/teams` - create team and captain membership atomically.
- `GET /api/teams/[id]` - player-safe team detail.
- `PATCH /api/teams/[id]` - captain-managed profile.
- `POST /api/teams/[id]/invitations` - invite by username.
- `POST /api/team-invitations/[id]/accept`.
- `POST /api/team-invitations/[id]/decline`.
- `POST /api/teams/[id]/members/[userId]/role`.
- `POST /api/teams/[id]/leave`.
- `GET /api/teams/[id]/readiness?game=...`.

All mutations are transactional where a partial write would violate membership, captain, or invitation invariants.

## 9. Support journey

### 9.1 Entry points

Support can be opened from:

- account access;
- tournament detail and registration;
- payment or refund status;
- check-in;
- match room and result;
- team invitation and roster;
- player home;
- the public support page.

The route carries safe context IDs, never a prefilled accusation or sensitive data.

### 9.2 Player support case

1. Choose a specific issue type.
2. Confirm automatically attached context.
3. Explain what happened.
4. Attach screenshot or video proof when helpful.
5. Submit once.
6. Receive a case reference.
7. Read replies and status.
8. Reply, resolve, reopen where policy permits, or appeal a decision.

### 9.3 Support storage

The existing support inbox remains the operator source of truth. It is extended with:

- `channel = in_app`;
- subject and issue category;
- structured context type and ID;
- player-visible case reference;
- player-safe status;
- optional resolution summary;
- attachment metadata.

Player APIs expose only threads owned by the authenticated player. Admin APIs continue to use existing role gates.

### 9.4 Player support API

- `GET /api/support` - current player's cases.
- `POST /api/support` - create case idempotently.
- `GET /api/support/[id]` - owned case and messages.
- `POST /api/support/[id]/messages` - reply to owned open case.
- `POST /api/support/[id]/resolve` - player closes case.

## 10. System states

Every player screen implements applicable states:

- initial loading;
- section refresh;
- empty first use;
- empty filtered;
- validation error;
- network failure with unsaved-work explanation;
- offline/last-known state;
- 401 re-authentication with return path;
- 403 permission explanation;
- 404 removed/private/invalid distinction;
- 409 stale or conflicting state;
- 429 wait guidance;
- service incident;
- success and next action;
- partial success;
- waiting for another person or service;
- expired;
- restricted or suspended with appeal path.

## 11. Notifications

Notifications are generated for:

- incoming, accepted, declined, cancelled, and expired 1v1 invites;
- team invitation and response;
- team role or roster change;
- tournament registration and payment change;
- check-in opening and deadline;
- match room opening;
- reported, confirmed, disputed, and resolved results;
- support case creation, reply, resolution, and reopening.

Each notification links directly to the item and names the action required.

## 12. Security and integrity

- Authenticate in every private route handler.
- Authorize at the data mutation, not only in navigation or UI.
- Return minimal DTOs.
- Validate identifiers, enums, length, and ownership.
- Preserve audit history for membership, roster, result, moderation, and money-related changes.
- Use idempotency or unique constraints for registration, payment, invitation, challenge acceptance, and support creation.
- Never expose private contact details or private game IDs in public team/player responses.
- Do not rely on proxy/middleware as the only access control.

## 13. Accessibility and responsive behavior

- One page-level heading.
- One visually dominant action.
- Minimum 44px targets.
- Visible focus and logical keyboard order.
- Status always uses words in addition to color.
- Mobile bottom navigation: Home, Tournaments, 1v1, Team, More.
- Long operational pages use anchored sections, not competing sticky controls.
- Tables become labeled cards on mobile.
- Deadlines include absolute EAT time; countdown is supplementary.

## 14. Implementation sequence

### Phase 1 - Player home

- extend dashboard DTO and compute next action;
- reduce dashboard density;
- add team and 1v1 summaries;
- use player-friendly language.

### Phase 2 - Teams

- apply schema migration;
- implement authorization and DTO helpers;
- implement team APIs;
- add team list/create/detail/invitations/roles/readiness UI;
- connect team summary to home.

### Phase 3 - 1v1

- restructure the existing page without replacing the proven API behavior;
- make incoming actions first;
- add clear empty/error/recovery states;
- ensure accepted invite routes into the created match.

### Phase 4 - Support

- extend support schema for in-app cases;
- add authenticated player APIs;
- build help center, case form, case list, and conversation;
- connect contextual help links.

### Phase 5 - Tournament and V5 integration

- use the V5 player shell for live player routes;
- remove sample metrics, decorative tabs, Figma references, and dead actions;
- connect team registration and roster readiness;
- normalize player-facing language.

### Phase 6 - Verification and cutover

- schema contract checks;
- lint and production build;
- desktop and mobile tests;
- API authorization and conflict tests;
- end-to-end player stories;
- no V4 fallback inside the V5 journey.

### 14.1 Detailed delivery gates

#### Phase 1 - Player home

Status: complete on 30 July 2026.

Deliverables:

- a player-safe `GET /api/dashboard/player` DTO with no private game IDs;
- one deterministic next-action engine using the priority order in section 4.1;
- a maximum four-item `Today` list with durable links and absolute EAT deadlines;
- profile setup completeness based on selected game, platform, and player ID;
- incoming and sent 1v1 counts, team memberships, and team invitation counts;
- live tournament registrations, recent confirmed results, and recommendations only when no urgent action outranks discovery;
- responsive loading, partial-data, empty, and retry states;
- focused priority-order contract tests.

Dependencies: existing match, challenge, tournament, notification, profile, and team tables only. No Phase 1 schema change.

Acceptance gate: focused tests, build TypeScript contract, targeted lint, and production build pass. The dashboard exposes one dominant action, the exact owner of the next step, and no sample data on the authenticated route.

Completion evidence:

- priority-order contract tests pass;
- `tsconfig.build.json` type checking passes;
- targeted dashboard/API lint passes;
- Next.js 16.2.4 production compilation, type checking, and all 199 static pages pass;
- the finalized production artifact serves the dashboard preview with HTTP 200;
- desktop 1440x1000 and mobile 390x844 browser checks pass.

#### Phase 2 - Teams

Status: implementation complete on 30 July 2026. Environment rollout is gated on applying `20260730174238_team_lifecycle_and_tournament_registration.sql`; this implementation pass did not mutate the live Supabase project.

Deliverables:

- close remaining team schema compatibility gaps and apply the migration in every environment;
- make create, invite, accept, decline, role, transfer, leave, and readiness flows transactional;
- add team tournament registration with immutable roster snapshots and roster locking;
- surface captain/member permissions and explicit readiness blockers in the UI;
- connect team registration, check-in, and notifications back to player home.

Dependencies: Phase 1 DTO contract, the existing team migration, tournament participant-mode policy, and a defined minimum roster per supported game.

Acceptance gate: the team automated stories in section 15 pass, including duplicate membership, ownership transfer, unauthorized role change, and missing-game-setup cases.

Completion evidence:

- service-only transactional RPCs now cover team creation, invitation creation/response, role changes, ownership transfer, leave, roster replacement, tournament entry, team payment confirmation, and team check-in;
- tournament roster snapshots are immutable after insertion and record the actor, timestamp, version, required starters, platform, and selected players;
- a tournament-row lock serializes slot claims and prevents one player from being locked to two active teams in the same tournament;
- the Teams workspace exposes owner/captain permissions, transfer/leave recovery, player setup blockers, saved starter/substitute rosters, open team tournaments, payment continuation, and roster-lock state;
- tournament create/detail, listing counts, payment verification, notifications, and Player Home now understand solo versus team entry;
- four roster/migration contract tests and the three existing Player Home priority tests pass;
- `tsconfig.build.json` type checking and targeted Phase 2 lint pass.

Operational rollout gate:

- apply the Phase 2 migration to each Supabase environment;
- run the database-backed stories for concurrent invitation acceptance, unauthorized role mutation, owner leave, duplicate cross-team tournament players, payment retry, and check-in;
- run the production build and responsive authenticated browser stories against a migrated test environment before cutover.

#### Phase 3 - Play 1v1

Status: implementation complete on 30 July 2026. Environment rollout is gated on applying `20260730190954_challenge_acceptance_idempotency.sql`; this implementation pass did not mutate the live Supabase project.

Deliverables:

- preserve the proven challenge APIs while making incoming invites the first page section;
- give sent, cancelled, declined, expired, accepted, conflicting, and offline states explicit UI;
- route acceptance to exactly one created match and its match room;
- align notifications and player-home summaries with the challenge state.

Dependencies: Phase 1 priority engine and the existing challenge idempotency/conflict rules.

Acceptance gate: send, cancel, receive, decline, expire, and accept stories pass; concurrent acceptance cannot create duplicate matches.

Completion evidence:

- incoming invites are always the first task section, including a useful caught-up state;
- pending sent invites and accepted, declined, cancelled, and expired history remain visible with explicit ownership and recovery language;
- the challenge list returns player-safe pending and recent-history DTOs, while mutations return the updated item and a user-facing next action;
- the database function locks the challenge and both player rows in stable order, returns the existing match on acceptance replay, and creates the match plus accepted state in one transaction;
- a partial unique index prevents concurrent duplicate pending invites for the same player pair, game, and platform;
- decline and cancel use conditional pending-state updates so they cannot overwrite a concurrent acceptance;
- expired invites generate direct-linked notifications, accepted notifications open the exact match, and Player Home links to the exact incoming invite;
- offline mode preserves last-known challenge activity and disables mutations until reconnection;
- five focused lifecycle, conflict, migration, and API contract stories pass alongside the existing Player Home and team suites;
- `tsconfig.build.json` type checking and targeted Phase 3 lint pass.

Operational rollout gate:

- apply the Phase 3 migration after the Phase 2 migration in each Supabase environment;
- run database-backed concurrent send and concurrent accept stories against a migrated non-production environment;
- verify queue conflict, existing-match conflict, acceptance replay, expiry notification, and match-room routing with authenticated test players;
- run the production build and responsive authenticated browser stories before cutover.

#### Phase 4 - Support

Deliverables:

- finish the in-app support schema rollout and authenticated player-safe DTOs;
- implement contextual case creation, owned case list/detail, replies, resolve, reopen, and appeal policy;
- attach only safe tournament, payment, match, team, or account references;
- preserve the operator inbox as the source of truth and notify players of replies.

Dependencies: support ownership policy, attachment limits, and the existing operator inbox.

Acceptance gate: cross-user access is denied, duplicate submissions are idempotent, and the player can follow one contextual case through resolution.

#### Phase 5 - Tournament and V5 integration

Deliverables:

- move all live player routes into the canonical V5 shell;
- connect solo and team registration, payment recovery, check-in, match room, result, dispute, prize, and refund states;
- remove sample metrics, dead actions, decorative tabs, prototype references, and V4 fallbacks;
- normalize player-facing language and contextual support links.

Dependencies: Phases 1-4 plus final tournament, payment, refund, and dispute policies.

Acceptance gate: the full tournament journey works on desktop and mobile, interrupted flows resume without duplicates, and every visible primary action performs a real operation.

#### Phase 6 - Verification and cutover

Deliverables:

- schema and API contract verification in the target environment;
- authorization, idempotency, concurrency, accessibility, responsive, and recovery testing;
- production build plus desktop and mobile end-to-end suites;
- release checklist, rollback point, support handoff, and post-release monitoring.

Dependencies: all implementation phases complete and production migrations confirmed.

Acceptance gate: all section 15 stories pass, no V4 fallback remains in the V5 journey, and release owners approve cutover.

## 15. Required automated stories

1. New player completes game setup and reaches a useful home action.
2. Player sends, cancels, receives, declines, and accepts a 1v1 invite.
3. Accepting one invite creates exactly one match.
4. Player creates a team and becomes captain.
5. Captain invites a player; player accepts; duplicate membership is blocked.
6. Captain changes a member role; unauthorized member cannot.
7. Owner cannot leave without transferring ownership.
8. Team readiness identifies missing game setup.
9. Player joins a free solo tournament and receives confirmation.
10. Captain registers an eligible team and locks the roster.
11. Check-in and match room become the highest-priority home action.
12. Player reports and confirms a result.
13. A dispute pauses downstream result consequences.
14. Player creates a contextual support case and can read an admin reply.
15. Player cannot read another player's team-private or support data.
16. Every player page has useful loading, empty, error, forbidden, and success behavior.

## 16. Definition of done

Implementation is complete only when:

- every visible primary action performs a real operation;
- every player status explains what it means and what happens next;
- no sample player, team, rank, case, or payment data appears in live V5 routes;
- teams and team tournaments use durable backend state;
- support cases flow through the existing operator inbox;
- interrupted registration/payment flows recover without duplicates;
- all private APIs enforce server-side ownership and permissions;
- desktop and mobile core player stories pass;
- lint and production build pass;
- the player never needs to understand internal terms such as competition identity, participant mode, readiness, or lifecycle to complete a task.
