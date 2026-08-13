# Mechi V5 / PlayMechi Gamer Passport Product Blueprint

Status: Approved direction; Phase 1 implemented locally and pending production migration/QA
Owner: the Boss / Mechi
Product surface: Mechi and PlayMechi
Last updated: 2026-08-01
Document purpose: living product requirements, architecture direction, and phased delivery plan

## Executive Decision

PlayMechi should build a **Gamer Passport**, not another decorative profile page.

The Gamer Passport is a persistent, shareable gamer identity combining:

- games played, including story-driven and non-competitive games;
- competitive match and ranking history;
- tournaments and physical or online events attended;
- teams, friends, rivals, and shared gaming history;
- achievements, awards, screenshots, and verified evidence;
- player-controlled showcases and privacy;
- comparison experiences that make profiles useful between friends.

The public promise is:

> Every game you have played. Every event you have joined. Every gaming achievement that matters. One Gamer Passport.

The recommended public identity URL is:

```text
https://mechi.club/@username
```

Existing public URLs such as `/s/[username]` and `/o/[username]` should remain valid through redirects or compatibility routes while the unified identity is introduced.

## Product North Star

PlayMechi becomes the identity and participation layer for gamers, starting in Africa:

- a gamer can show who they are without being limited to one title or platform;
- a friend can understand and compare their gaming history in seconds;
- an organizer can verify attendance, competition, placements, and awards;
- a team can assess a recruit from credible activity rather than claims alone;
- a creator can show community, events, broadcasts, and gaming history;
- every Mechi match and PlayMechi event strengthens a user's long-term identity.

The profile is the public output. The deeper product is a trusted **gamer identity ledger and relationship graph**.

## Strategic Positioning

### What PlayMechi should be

- A gamer passport across competitive and non-competitive gaming.
- An esports resume backed by Mechi-verified records.
- A personal game journal for story games, multiplayer games, and old favorites.
- A social comparison tool for friends, teammates, and rivals.
- An event passport for online and physical gaming participation.
- An Africa-first identity that can expand globally.

### What PlayMechi should not be

- A single universal score pretending every type of gamer is comparable.
- A clone of a game database or backlog tracker.
- A profile where self-reported claims look officially verified.
- A public display of sensitive disputes, phone numbers, earnings, or moderation history.
- A platform dependent on console integrations before it has a useful native experience.
- A cosmetic page with no reason for users or friends to return.

## Product Principles

1. **Identity before vanity**
   Every module should help answer who the gamer is, what they have done, or who they have played with.

2. **Verified and self-reported can coexist**
   Evidence quality must be visible at the fact level.

3. **Story gaming is first-class**
   Competitive statistics must not overwhelm completion history, reviews, favorites, and personal gaming memories.

4. **Comparison should create connection**
   The objective is not only to declare a winner. Comparisons should reveal shared games, compatible taste, rivalries, and what friends should play next.

5. **Every Mechi action compounds identity**
   Matches, tournament entries, check-ins, team membership, placements, hosting, and rewards should flow into the Passport automatically.

6. **Privacy is part of the model**
   Public, friends-only, and private visibility cannot be an afterthought.

7. **Free identity, paid depth**
   Basic profile creation, comparison, sharing, and verified history remain free. Monetization comes from customization, advanced analytics, organizer tools, and professional exports.

8. **Mobile and WhatsApp sharing first**
   Cards, pages, and comparisons must work cleanly on low-to-mid-range mobile devices and share well into WhatsApp and Instagram.

## Primary Users

### Competitive player

Needs:

- credible game-specific record;
- current and peak rankings;
- tournament history and placements;
- team and teammate history;
- a profile they can send to organizers or teams.

### Story and casual gamer

Needs:

- a record of games played across years and platforms;
- completed, playing, backlog, paused, dropped, and mastered statuses;
- favorites, ratings, reviews, screenshots, and personal lists;
- comparisons based on taste rather than only wins.

### Social gamer

Needs:

- games in common with friends;
- squad recommendations;
- shared events and played-together history;
- lightweight reactions and activity updates;
- a reason to invite friends.

### Tournament participant

Needs:

- registration and check-in history;
- verified attendance and results;
- event stamps, placements, rewards, and proof;
- one permanent record after temporary WhatsApp groups become inactive.

### Team or clan

Needs:

- public roster and roles;
- verified member game identities;
- team record, events, achievements, and recruitment status;
- comparison against other teams.

### Organizer or creator

Needs:

- tournaments hosted and players reached;
- event, staff, stream, and winner history;
- public credibility and organizer verification;
- shareable pages for sponsors and communities.

## Core Product Model

The Gamer Passport contains six connected layers.

### 1. Gamer Identity

Core fields:

- unique username and display name;
- avatar and cover;
- short bio;
- country and region, never precise public address;
- gamer-since year;
- primary platforms;
- external gamer tags;
- languages;
- current activity status;
- team or clan;
- up to three featured gamer archetypes;
- featured game, achievement, and event;
- profile theme and card style;
- verification summary.

Suggested gamer archetypes:

- Competitive
- Story Explorer
- Completionist
- Casual
- Trophy Hunter
- Speedrunner
- Mobile Gamer
- Console Gamer
- PC Gamer
- Sports Specialist
- Fighting Game Specialist
- Battle Royale Player
- Retro Gamer
- Tournament Organizer
- Content Creator
- Community Builder

Archetypes may be selected initially, but PlayMechi should gradually recommend or derive them from credible activity.

### 2. Game Journey

Every title in the user's library has a status:

- want to play;
- backlog;
- playing;
- paused;
- completed;
- mastered or 100 percent;
- dropped;
- played before joining Mechi.

Optional personal fields:

- platform;
- edition;
- start date;
- completion date;
- approximate hours;
- completion percentage;
- playthrough count;
- difficulty;
- personal score;
- short review;
- private journal notes;
- spoiler-marked notes;
- favorite character;
- favorite moment;
- screenshot or clip;
- ownership status;
- replay intention;
- proof source.

Default shelves:

- Currently Playing
- Recently Completed
- All-Time Favorites
- Competitive Games
- Proud Completions
- Childhood Classics
- Want to Play

Users should later be able to create named custom shelves and rank items inside them.

### 3. Competitive Record

Competitive statistics remain game-specific.

Shared competitive concepts:

- matches played;
- wins, losses, draws, and win rate;
- current rating and peak rating;
- current season and historical seasons;
- recent form;
- best streak;
- tournaments entered;
- rounds reached;
- podium finishes;
- championships;
- verified team history;
- notable opponents and head-to-head history;
- screenshots or match evidence;
- game, mode, platform, and region filters.

Battle Royale extensions:

- rounds played;
- total kills;
- average kills;
- highest-kill round;
- best placement;
- top-ten finishes;
- lobby wins;
- tournament-series totals.

One-versus-one extensions:

- head-to-head record;
- scoreline history;
- clean sweeps;
- comebacks;
- current rivalry streak;
- rating difference at match time.

Competitive records generated by Mechi are automatically marked `mechi_verified`.

### 4. Event Passport

Every online or physical event can issue a permanent participation stamp.

Participant states:

- registered;
- confirmed;
- checked in;
- attended;
- competed;
- completed event;
- finalist;
- podium;
- champion;
- organizer;
- admin or staff;
- streamer or creator;
- volunteer.

Event record fields:

- event identity and artwork;
- date and timezone;
- online or physical event type;
- public venue label where safe;
- game and format;
- role;
- team;
- placement;
- verified result;
- badge or stamp;
- public photos or highlights;
- reward summary with privacy controls;
- organizer and verifier;
- verification URL and QR payload.

Registration alone must not be labeled attendance. Check-in, verified result, or an organizer action should promote the record to attended or competed.

### 5. Social Graph

Relationships:

- following;
- mutual friends;
- teammates;
- former teammates;
- rivals;
- recently played together;
- event co-attendees;
- organizers followed;
- blocked users.

Social actions:

- follow or friend request;
- challenge;
- invite to team;
- compare;
- recommend a game;
- share profile or card;
- react to eligible activity;
- mark played together when supported by a match or confirmed by both players.

Open-ended public profile comments are deliberately excluded from early phases because they add moderation cost without strengthening the core identity loop.

### 6. Trust and Verification

Verification is attached to an individual claim or record.

| Verification state | Meaning |
| --- | --- |
| `self_reported` | Entered manually by the player |
| `evidence_attached` | Screenshot, clip, receipt, or other evidence is attached but not necessarily reviewed |
| `community_confirmed` | Confirmed by another participant under a defined workflow |
| `organizer_verified` | Confirmed by an approved organizer or event admin |
| `mechi_verified` | Generated or confirmed through Mechi-controlled competition or operations data |
| `platform_synced` | Imported through an authorized external platform connection |

Rules:

- never display a whole-profile verification badge that implies every claim is verified;
- summarize verification counts at profile level;
- show the specific source and date when a user opens a verified item;
- retain an audit trail for verification changes;
- let moderators revoke a verification without deleting the underlying private evidence;
- prevent users from directly setting privileged verification states;
- do not award meaningful RP for unverified, high-volume self-reported activity.

## Gamer Dimensions

PlayMechi should avoid one universal Gamer Score. Use independent dimensions that celebrate different gamer identities.

### Competitor

Derived from verified matches, ratings, tournament advancement, placements, and consistent participation.

### Explorer

Derived from unique games, genres, platforms, franchises, and gaming eras.

### Finisher

Derived from completions, mastery, replayed games, and verified achievements where available.

### Community

Derived from events, teams, valid referrals, hosting, staff roles, and positive participation.

### Veteran

Derived from sustained activity over time, account age, verified historical events, and active seasons.

Each dimension should have independent levels and plain-language explanations. The product must never imply that a high competitor level makes a user a better overall gamer than a story-game specialist.

## Friend Comparison Product

Recommended route:

```text
/@username/compare/@friend
```

Compatibility fallback route:

```text
/compare?players=username,friend
```

### Comparison summary

- gamer archetypes;
- games played;
- games completed;
- competitive matches;
- events attended;
- podiums and championships;
- achievement count;
- gamer-since year;
- primary platforms;
- verification summary.

### Games in common

For each shared game:

- both statuses;
- both personal ratings;
- platforms;
- hours where shared publicly;
- completion dates;
- shared competitive record;
- head-to-head record;
- reviews and favorites;
- suggested action: challenge, discuss, or play together.

### Taste Match

Taste Match is a transparent, playful compatibility indicator based on:

- shared games;
- shared favorite games;
- genre overlap;
- similarity of ratings;
- platform overlap;
- self-selected play styles.

It must be described as an estimate. The UI should explain the main factors rather than present an unexplained score.

Example:

```text
82% Taste Match
You both like football and narrative action games.
Ryan competes more often. Ephrem completes more story games.
```

### Rivalry comparison

When verified competitive history exists:

- total matches;
- series leader;
- wins per player;
- current streak;
- most-played game;
- biggest rating upset;
- latest result;
- rematch action;
- shareable rivalry card.

### Event overlap

- events both registered for;
- events both attended;
- events where they competed against each other;
- team participation together;
- shared event photographs where both consented.

### Squad comparison

Later phases should support 3-8 users:

- shared game ownership or library overlap;
- suggested next game;
- widest genre range;
- most completions;
- strongest verified competitive form;
- most events attended;
- squad timeline;
- private group share link.

## Public Passport Experience

### Profile header

- cover, avatar, display name, and username;
- location at safe granularity;
- gamer archetypes;
- primary platforms;
- featured team;
- verification summary;
- Follow, Compare, Challenge, Share, and Invite actions;
- public QR code.

### Context for the viewer

When the visitor is signed in, the profile should prioritize relationship context:

- games in common;
- mutual friends;
- shared teams;
- shared events;
- head-to-head record;
- the most relevant challenge action.

### Profile navigation

- Overview
- Games
- Competitive
- Events
- Achievements
- Activity

Optional roles can add:

- Teams
- Organized Events
- Creator

### Overview modules

- identity summary;
- featured showcases;
- currently playing;
- latest completions;
- competitive highlights;
- recent form;
- event stamps;
- rare achievements;
- viewer relationship card;
- recent activity.

### Empty states

Empty profiles should never display rows of zeroes. They should guide the user toward identity-building actions:

- add five favorite games;
- claim a Mechi tournament;
- connect a gamer tag;
- complete a first comparison;
- add a currently playing title.

## Tangible Outputs

### Digital Gamer Card

Automatically generated card formats:

- square social post;
- vertical story card;
- horizontal WhatsApp or link-preview card;
- compact mini-card for event brackets and player lists.

Card content:

- avatar and username;
- primary archetype;
- featured games;
- one featured verified achievement or event;
- verification mark scoped to the displayed record;
- QR code and public URL;
- PlayMechi branding.

### Gamer CV

A downloadable, verification-linked summary for competitive players, organizers, creators, and staff:

- gamer identity;
- game-specific competitive history;
- teams and roles;
- event participation and placements;
- selected achievements;
- organizer and staff experience;
- public verification URL;
- privacy-safe contact or inquiry action.

### Annual PlayMechi Replay

Yearly recap:

- games added and completed;
- top genres;
- most-played or most-mentioned games;
- best verified result;
- events attended;
- frequent teammates and opponents;
- rivalry summary;
- rarest badge;
- gaming personality for the year;
- shareable cards.

### Physical or NFC Passport

This is a later validation-dependent product:

- QR or NFC identity card;
- event check-in;
- safe staff lookup;
- digital stamp issuance;
- collectible event editions.

Physical production must not begin until digital cards, QR event check-in, and repeat profile usage demonstrate demand.

## Privacy and Safety Requirements

### Visibility levels

Every appropriate field or module supports:

- public;
- followers or friends;
- private.

### Mandatory safeguards

- phone, email, WhatsApp number, and authentication identifiers are never public;
- precise location is never public by default;
- gamer IDs have individual visibility controls;
- prize amounts and earnings are opt-in;
- future physical event attendance is private unless explicitly shared;
- underage users receive stricter visibility defaults;
- users can block, report, mute, export, and delete data;
- spoiler content is hidden until revealed;
- private evidence uses signed, expiring URLs;
- moderation disputes, bans, internal notes, and risk markers are not public profile fields;
- external account connections require proof of ownership and revocable authorization;
- activity-feed objects respect the original object's visibility.

## Information Architecture and Routes

Recommended long-term routes:

```text
/@username
/@username/games
/@username/competitive
/@username/events
/@username/achievements
/@username/activity
/@username/compare/@friend
/passport/edit
/passport/games
/passport/showcases
/passport/connections
/passport/privacy
/passport/cards
/compare
/events/[slug]/passport
```

Compatibility:

- `/s/[username]` redirects or resolves to the unified player Passport;
- `/o/[username]` may remain an organizer-focused view but links to the same identity;
- existing match, tournament, team, and creator pages link back to the Passport;
- existing OG profile URLs continue to resolve during migration.

## Data Architecture Direction

### Key decision

Do not continue adding one profile column per game or every new Passport feature. Keep authentication/account identity in `profiles` and model collection data relationally.

### Proposed tables

#### `game_catalog`

Canonical game metadata cached inside Mechi.

Suggested columns:

- `id`
- `source`
- `source_game_id`
- `slug`
- `title`
- `summary`
- `cover_url`
- `release_date`
- `genres`
- `platforms`
- `game_modes`
- `franchise`
- `age_rating`
- `metadata_updated_at`

Provider terms, attribution, commercial usage, caching, image usage, and deletion rules must be approved before production integration.

#### `player_game_entries`

One record per player, game, and optional platform or edition.

Suggested columns:

- `id`
- `user_id`
- `game_id`
- `platform`
- `status`
- `is_favorite`
- `is_owned`
- `started_on`
- `completed_on`
- `minutes_played`
- `completion_percent`
- `playthrough_count`
- `difficulty`
- `personal_rating`
- `short_review`
- `private_notes`
- `contains_spoilers`
- `visibility`
- `verification_state`
- `verification_source_id`
- timestamps

Uniqueness rules must allow legitimate multi-platform and remaster entries without creating accidental duplicates.

#### `player_game_media`

- screenshots;
- clips;
- captions;
- spoiler state;
- visibility;
- moderation state;
- verification linkage.

#### `player_showcases`

- user;
- showcase type;
- title;
- ordered item references;
- visibility;
- theme configuration;
- display order.

#### `player_relationships`

- requester;
- target;
- relationship type;
- status;
- source match or event where applicable;
- timestamps.

Store blocking separately or ensure block queries cannot leak through ordinary relationship reads.

#### `player_event_records`

- user;
- tournament or event reference;
- external event reference when approved;
- participation state;
- role;
- team;
- placement;
- stamp design;
- verification state;
- verified by;
- verified at;
- visibility;
- public metadata snapshot.

The source tournament remains authoritative. The event record is a stable Passport projection and should be repairable from source data.

#### `player_verification_records`

- subject type and subject ID;
- verification state;
- evidence references;
- issuer or verifier;
- source system;
- issued at;
- revoked at;
- revocation reason;
- audit metadata.

#### `player_activity`

Normalized activity objects for feed distribution:

- actor;
- verb;
- object type and ID;
- optional target;
- visibility;
- happened at;
- deduplication key;
- source system.

Do not create feed events from private edits or sensitive admin actions.

#### `player_profile_summaries`

A refreshable read model for public profile speed:

- counts by game status;
- competitive summaries;
- verified record counts;
- event totals;
- gamer dimensions;
- most recent public activity;
- featured showcase references;
- refreshed at.

This table or materialized view must be rebuildable from authoritative data.

### Existing source systems to reuse

- `profiles` for account identity, media, location, game IDs, and access state;
- `matches` for verified Mechi match history;
- ratings, wins, losses, seasons, and lobby score fields during transition;
- `tournaments` and `tournament_players` for generic tournament history;
- PlayMechi online tournament registration and result tables for campaign history;
- `teams` and membership tables for team identity;
- achievements and profile badges;
- profile snapshots and uploaded match evidence;
- organizer pages and creator profiles.

### Migration principle

The Passport should initially project existing data without rewriting authoritative competition systems. New normalized Passport tables are added alongside current tables, followed by gradual backfills and compatibility reads.

## API Direction

Suggested bounded APIs:

```text
GET    /api/passport/me
PATCH  /api/passport/me
GET    /api/passport/[username]
GET    /api/passport/[username]/games
POST   /api/passport/games
PATCH  /api/passport/games/[entryId]
DELETE /api/passport/games/[entryId]
GET    /api/passport/[username]/events
GET    /api/passport/[username]/competitive
GET    /api/passport/[username]/activity
GET    /api/passport/compare?left=&right=
POST   /api/passport/showcases
PATCH  /api/passport/showcases/[id]
POST   /api/passport/relationships
PATCH  /api/passport/privacy
POST   /api/passport/connections/[provider]
DELETE /api/passport/connections/[provider]
```

API rules:

- authenticated private response shapes and public response shapes remain distinct;
- public APIs never return hidden fields for the client to filter;
- list endpoints are paginated;
- comparison reads apply both users' privacy rules;
- mutations use server-side validation and rate limits;
- external imports are idempotent and source-attributed;
- card generation uses a stable public summary model;
- expensive summaries are cached or precomputed.

## Analytics Plan

### North-star metric

**Monthly Active Gamer Passports**: unique users who perform or receive at least one meaningful Passport action in a rolling 30-day window.

Meaningful actions include:

- add or update a game;
- complete or master a game;
- receive a verified match or event record;
- compare with another player;
- customize a showcase;
- share a Passport or card;
- connect an approved external account;
- receive a friend, teammate, or game recommendation interaction.

### Activation metrics

- Passport creation completion rate;
- users adding at least five games;
- users adding a currently playing game;
- users claiming at least one Mechi record;
- users completing first comparison;
- time to first attractive share card.

### Growth metrics

- Passport shares per active user;
- comparison links created;
- new registrations attributed to a Passport;
- friend invitations converted;
- event-card shares;
- organic visits to public Passport URLs.

### Retention metrics

- weekly game-entry updates;
- monthly profile revisits;
- repeat comparisons;
- repeat event participation;
- challenge starts from Passport pages;
- users returning after friend activity.

### Trust metrics

- percentage of active Passports with at least one verified record;
- ratio of verified to self-reported competitive claims;
- verification dispute rate;
- fraudulent evidence rate;
- profile reports per 1,000 public views;
- verification correction time.

## Phased Delivery Roadmap

## Phase 0 - Product Contract and Technical Baseline

### Goal

Lock the core vocabulary, data ownership, privacy model, and migration plan before building UI that creates incompatible data.

### Product work

- Confirm the public name `PlayMechi Gamer Passport`.
- Confirm whether `@username` becomes the canonical public identity route.
- Define public, friends-only, and private visibility behavior.
- Finalize game statuses and verification states.
- Define Gamer Dimension formulas at a high level without tuning scores yet.
- Decide how organizer and creator roles appear inside one identity.
- Define the first supported content and moderation rules.

### Engineering work

- Audit all current profile, match, rating, achievement, team, creator, tournament, and event data.
- Document source-of-truth ownership per field.
- Inventory existing public selectors to prevent private-field leakage.
- Define compatibility for `/s/[username]`, `/o/[username]`, OG cards, and share endpoints.
- Select a game metadata strategy and review commercial terms.
- Produce migration and rollback plans.
- Define analytics event names before release.

### Deliverables

- approved product vocabulary;
- data ownership matrix;
- privacy matrix;
- initial schema migration design;
- route and redirect design;
- game catalogue provider decision or provider-independent adapter contract;
- moderation checklist;
- analytics tracking specification.

### Acceptance gate

- No ambiguous use of `played`, `attended`, `verified`, `friend`, or `completed` remains.
- Every public field has an explicit visibility rule.
- Every derived statistic has an identified source.
- Existing profiles and tournament operations have a non-destructive migration path.

### Explicit exclusions

- no physical cards;
- no external platform syncing;
- no public feed;
- no score tuning based on unvalidated assumptions.

## Phase 1 - Passport Data Foundation and Unified Identity

### Goal

Create the durable data model and one unified public identity without breaking current profiles, tournament pages, or share links.

### Implemented in the Mechi V5 Phase 1 pass

- Added normalized `passport_profiles`, `passport_profile_summaries`, `passport_verification_records`, and `passport_audit_logs` tables.
- Added RLS and explicit default-deny grants for browser roles because Mechi uses custom JWT authentication and server-side database access.
- Added backfill behavior so every existing Mechi account receives a Passport identity record and summary projection.
- Added a server-only Passport projection across current profile, game, match, tournament, PlayMechi registration, achievement, badge, and team sources.
- Added fact-level verification scaffolding without presenting the whole profile as verified.
- Added owner-safe `GET/PATCH /api/passport/me` handlers with validation and audit logging.
- Added privacy-filtered `GET /api/passport/[username]` public reads.
- Added canonical public Passport pages at `/@username` with dynamic metadata and social preview compatibility.
- Added the `/passport` Mechi V5 player-workspace editor for identity, archetypes, status, discoverability, color, default privacy, and section privacy.
- Added a permanent compatibility redirect from `/s/[username]` to `/@username`.
- Updated profile sharing helpers to generate canonical Passport URLs.
- Added read-only fallback behavior for environments where the migration is not yet applied.
- Added focused Passport foundation tests and production TypeScript verification.

### Remaining before Phase 1 production completion

- Review and apply `20260801175303_passport_foundation.sql` to the approved Supabase environment.
- Run post-migration table, grant, RLS, backfill-count, and privacy smoke checks.
- Validate real profiles representing competitive-only, story-focused, team, organizer, and empty-account states.
- Complete desktop/mobile visual QA for `/passport`, `/@username`, OG previews, and legacy redirects.
- Confirm whether `friends` visibility remains hidden until Phase 3 or temporarily behaves as private with explicit UI copy. The current implementation treats it as private for strangers.
- Confirm the Boss's final wording for Africa-first positioning and public launch copy.
- Enable public discovery only after search and block/report enforcement are shipped; the stored discoverability flag alone does not expose a directory.

### Player capabilities

- edit display name, bio, gamer-since year, archetypes, platforms, and safe location;
- control profile and field visibility;
- see existing Mechi gamer IDs;
- view automatically projected Mechi competitive summary;
- view automatically projected PlayMechi event summary;
- open the canonical public Passport URL;
- share a basic Passport card.

### Engineering scope

- add normalized Passport foundation tables;
- create public and owner-safe read models;
- add a profile summary projection from existing data;
- create canonical public route and redirects;
- preserve current OG image and challenge behavior;
- implement privacy-safe server queries;
- add audit logging for visibility and verification changes;
- backfill existing user identity and supported Mechi history;
- add feature flags for incremental exposure.

### UX scope

- Passport header;
- Overview tab;
- primary games and platforms;
- existing wins, losses, rank, events, badges, and teams where available;
- empty-state onboarding;
- owner edit entry point;
- mobile share action;
- clear verification legend.

### Acceptance criteria

- Existing users receive a Passport without manually re-entering current Mechi data.
- Public profile reads never expose phone, email, WhatsApp, private evidence, or admin state.
- Existing `/s/[username]` links continue to work.
- A player can set each eligible identity field to public, friends-only, or private.
- A Passport page is useful even when the player has zero competitive matches.
- Page metadata and social previews use the unified identity.
- Profile projection failures can be rebuilt without altering match or tournament truth.

### Release gate metrics

- no confirmed private-field leakage;
- at least 95 percent successful profile backfill for eligible accounts;
- public Passport page error rate within current profile baseline;
- at least 60 percent of test users understand the verification legend without explanation.

## Phase 2 - Gamer Passport MVP and Game Library

### Implementation status - completed locally in Mechi V5

Implemented in the Phase 2 engineering pass:

- a canonical local game catalogue with editions, aliases, platforms, genres, modes, provider metadata, and an admin-resolution request queue;
- a launch catalogue spanning current Mechi competitive games and story-led titles so non-competitive gamers can build a credible Passport;
- platform-specific player game records with playing, completed, backlog, paused, dropped, and replaying states;
- start and completion dates, 1-10 ratings, recorded hours, 500-character reviews, and spoiler labels;
- favorites, up to five featured games, per-entry visibility, and one Cloudinary-backed screenshot per entry;
- automatic backfill of existing `selected_games` as Mechi-projected library records;
- five-game owner onboarding, tolerant catalogue search, editing, quick status controls, filtering, and missing-title requests;
- a public `@username/games` library with status, platform, genre, and year filters;
- featured games on the main public Passport overview;
- square, story, and horizontal Gamer Card image routes plus an authenticated share studio;
- server-only access through Mechi JWT route handlers, RLS on all new exposed tables, and no anon/authenticated Data API grants;
- focused Phase 2 contract tests and production TypeScript validation.

Remaining production gates:

- review and apply the Phase 1 and Phase 2 migrations to live Supabase in order;
- run database advisors and live backfill-count checks;
- verify real Cloudinary uploads, card rendering, WhatsApp previews, and Instagram-oriented downloads in the deployed environment;
- connect a licensed external catalogue provider and complete provider attribution before expanding beyond the curated launch catalogue;
- run the five-minute onboarding study and collect the release metrics below.

### Goal

Deliver the core promise: a gamer can create an attractive record of their whole gaming life and share it immediately.

### Player capabilities

- search and add games;
- mark status;
- add platform, dates, rating, hours, and short review;
- choose favorites;
- set currently playing titles;
- add games played before joining Mechi;
- feature selected games on the Overview;
- upload one screenshot per entry under limits;
- generate square, story, and horizontal Gamer Cards;
- browse another player's public game library;
- filter a library by status, platform, genre, and year.

### Onboarding flow

1. Confirm identity.
2. Select platforms.
3. Add five favorite or memorable games.
4. Mark at least one currently playing or recently completed game.
5. Claim automatically found Mechi matches and events.
6. Choose one featured showcase.
7. Generate the first Gamer Card.

### Game catalogue requirements

- tolerant search;
- cover art;
- title, year, platforms, genres, and modes;
- canonical handling of editions, remasters, and DLC;
- local metadata cache;
- provider attribution where required;
- manual admin resolution for missing or duplicate titles.

### Acceptance criteria

- A new user can build a credible Passport in under five minutes.
- A story-only gamer can create a rich profile without competitive activity.
- A competitive gamer sees current Mechi history alongside manually added games.
- Duplicate game entries are prevented or intentionally platform-specific.
- Spoiler-marked text is hidden by default.
- Card links return to the owner's public Passport.
- Cards render correctly for WhatsApp and Instagram-oriented dimensions.

### Release gate metrics

- 40 percent of activated Passport users add at least five games;
- 25 percent generate or share a Gamer Card;
- median time to first useful Passport below five minutes;
- fewer than 3 percent unresolved game-search attempts for target launch titles.

### Explicit exclusions

- full review comments;
- arbitrary media galleries;
- automatic console imports;
- paid customization marketplace.

## Phase 3 - Comparison, Friends, and Rivalries

### Goal

Turn static identity into a social acquisition and retention loop.

### Player capabilities

- compare with any eligible public user;
- see games in common;
- see differences in completion, ratings, platforms, and favorites;
- view transparent Taste Match factors;
- view verified head-to-head rivalry data;
- add or follow another player;
- see mutual friends and teams;
- recommend a game;
- share comparison and rivalry cards;
- start a Mechi challenge from relevant comparisons.

### Comparison rules

- only mutually visible fields participate;
- hidden data does not influence visible totals;
- competitive comparison is game-specific;
- self-reported competitive claims cannot override verified Mechi records;
- Taste Match explains its strongest factors;
- zero shared games produces discovery prompts, not a score of zero identity value;
- block state prevents profile discovery, comparison, and recommendations as appropriate.

### Acquisition loop

1. User creates Passport.
2. User enters friend's username or shares a compare invitation.
3. Friend sees a partial comparison.
4. Friend creates or claims a Passport.
5. Full comparison unlocks.
6. Both receive a game, event, or challenge next action.

### Acceptance criteria

- Users can create a comparison in no more than three interactions from a profile.
- Comparison results remain useful for users with no competitive overlap.
- Verified head-to-head records match authoritative Mechi match data.
- A blocked or private user cannot be compared through alternate public endpoints.
- Share cards identify both players and link to the comparison.
- Comparison invitations have attribution for conversion analytics.

### Release gate metrics

- 15 percent of active Passport users create a comparison;
- 10 percent of comparison recipients visit or claim a Passport;
- measurable challenge starts from rivalry pages;
- privacy and block bypass tests pass completely.

### Explicit exclusions

- public comments;
- global popularity leaderboard;
- unsolicited direct messaging;
- opaque AI personality judgments.

### Phase 3 implementation status - local, migration-ready

Implemented on 2026-08-10 for Mechi V5:

- canonical, deduplicated friend requests with accept, decline, and removal states;
- directional follows, mutual relationship state, and player blocking;
- blocking removes friendship/follow edges, cancels pending challenges, and gates discovery, comparisons, recommendations, challenge creation, and challenge acceptance;
- public and friend-visible game-library projections, with private entries excluded before any comparison calculation;
- player discovery restricted to discoverable, non-private, non-blocked Passports;
- comparison creation from public profiles and the owner Passport in no more than three interactions;
- games-in-common comparison covering play status, platform, favorites, completion, and rating differences;
- transparent 100-point Taste Match composed of shared library, shared favorites, play-style agreement, platform agreement, and genre overlap;
- a scoreless discovery experience when no visible games overlap, avoiding a misleading zero-value identity score;
- verified rivalry totals sourced only from completed authoritative Mechi matches, grouped by game;
- mutual accepted friends and mutual public teams;
- compatible 1v1 challenge options based on both players' visible configured games and platforms;
- friend-only game recommendations with notification delivery and save/dismiss inbox states;
- authenticated comparison views, public comparison pages, and 1200x630 comparison/rivalry share cards naming both players and linking back to the comparison;
- attributed comparison invitations with atomic visit counting, expiry, campaign metadata, and event records;
- measurable comparison viewed, shared, recommendation sent, invitation visited, and challenge started events;
- server-only service-role access with RLS enabled and browser database roles revoked for all Phase 3 tables;
- social counters projected into the Passport summary and governed by the Passport social visibility field.

Local release checks:

- focused ESLint: passing;
- production TypeScript check: passing;
- Phase 1-3 Passport contract tests: passing after final validation;
- Phase 3 migration is duplicated exactly at the end of the empty-project bootstrap;
- a full Next production build is intentionally deferred because the current E drive has less than 0.7 GB free.

Production gates still requiring the Boss's approval and live infrastructure:

- apply `20260810153013_passport_social_comparison_rivalries.sql` to Supabase;
- smoke-test friend, block, comparison, recommendation, invitation, and challenge flows against production-like data;
- confirm notification delivery and comparison-card rendering in WhatsApp/Instagram previews;
- turn on Phase 3 navigation or promotion only after privacy bypass tests pass against the deployed database;
- monitor the release-gate metrics above before widening acquisition campaigns.

## Phase 4 - Competitive Resume and Event Passport

### Goal

Make the Passport trusted enough for tournaments, teams, creators, sponsors, and physical events.

### Competitive capabilities

- game-specific competitive dashboards;
- current and peak rating;
- season history;
- verified match history;
- tournament entries and rounds reached;
- podiums and championships;
- team history;
- performance filters;
- shareable competitive summary;
- Gamer CV export.

### Event capabilities

- digital stamps for registration, check-in, attendance, competition, placement, staff, organizer, and streamer roles;
- QR-based event check-in;
- organizer issuance and revocation workflow;
- public event history timeline;
- photos and highlights with consent;
- player-safe reward status where appropriate;
- verification detail page;
- event-specific share card.

### Organizer capabilities

- view participant Passport readiness;
- issue or confirm attendance states;
- verify placements and roles;
- batch-create event stamps from completed tournament data;
- correct records with an audit trail;
- export participant and Passport linkage data;
- prevent duplicate or transferred check-ins.

### Gamer CV requirements

- clean mobile and PDF views;
- public verification link;
- selected competitive games;
- event and team history;
- selected achievements;
- no private contact details by default;
- optional inquiry link controlled by the owner;
- generated-at timestamp.

### Acceptance criteria

- Registration is never misrepresented as attendance.
- Every verified event record identifies source, issuer, and date.
- Revoked records stop appearing as verified while the audit trail remains internal.
- Existing PlayMechi tournament history can be backfilled.
- QR check-in rejects replay or invalid event codes.
- Competitive totals reconcile with authoritative match and tournament data.
- Gamer CV links resolve to live verification pages.

### Release gate metrics

- at least 80 percent of eligible PlayMechi participants receive correct projected event records;
- less than 1 percent duplicate check-in rate;
- zero unsupported payout or eligibility claims exposed publicly;
- organizer correction workflow resolves test cases without direct database edits.

### Phase 4 implementation status - local, migration-ready

Implemented on 2026-08-12 for Mechi V5:

- game-specific competitive resume cards from authoritative completed Mechi matches;
- current and peak rating projections, verified wins/losses/draws, win rate, and recent match history;
- game-filtered performance views and persisted season-history projections;
- tournament registration state, check-in state, highest reached round, and championship projection;
- current and historical team membership with role and departure state;
- independent Event Passport credentials for registration, check-in, attendance, competition, placement, staff, organizer, and streamer roles;
- immutable public verification tokens with player, source, issuer, occurrence date, and issue date;
- explicit active/revoked credential state with moderator correction reasons and internal Passport audit records;
- audited organizer issuance plus tournament-owned or moderator correction authority;
- generic tournament and PlayMechi online-event backfill, with registration and checked-in attendance stored as separate facts;
- authoritative placement backfill from finalized PlayMechi placement rows without exposing payout or reward eligibility state;
- account-bound, expiring, single-use QR check-in passes using SHA-256 token storage;
- transactional QR redemption with row locking and outcomes for accepted, invalid, expired, replayed, transferred, and revoked attempts;
- persistent check-in attempt logs for duplicate and abuse monitoring;
- organizer/moderator participant-readiness API and event operations console;
- idempotent organizer projection of confirmed registration, real check-in, and completed-tournament champion credentials;
- organizer-safe participant linkage CSV export and tournament-owned credential revocation;
- public Competitive Resume, Event Passport timeline, verification detail pages, event share cards, and mobile Gamer CV view;
- owner-controlled selected games, event/team/achievement inclusion, headline, and optional HTTPS inquiry link;
- downloadable Gamer CV PDF containing public verification links and no private contact details;
- public resume projections governed by the owner's Passport competitive, event, and team visibility fields;
- RLS enabled and browser database roles revoked for every Phase 4 trust table.

Local release checks:

- isolated Next.js 16 production build: passing across all 215 generated pages;
- production TypeScript check: passing;
- focused ESLint: passing after final validation;
- Phase 1-4 Passport contract tests: passing after final validation;
- representative two-page Gamer CV PDF generation and rendered visual inspection: passing;
- Phase 4 migration is mirrored exactly at the end of the empty-project bootstrap after final validation.

Production gates still requiring the Boss's approval and live infrastructure:

- apply `20260812131546_passport_competitive_resume_event_passport.sql` to Supabase;
- run the backfill against a production-like snapshot and reconcile eligible participant coverage before live exposure;
- smoke-test tournament organizer authorization, pass issuance, QR scanning, replay rejection, transfer rejection, and revocation;
- validate public credential links and social-card previews from the deployed origin;
- review database advisors after migration and confirm duplicate-check-in and backfill reconciliation metrics;
- enable organizer promotion only after privacy, payout-claim, and correction-workflow checks pass.

## Phase 5 - Activity, Teams, and Community Identity

### Goal

Create repeat usage around people and communities without opening high-cost social surfaces too early.

### Player capabilities

- followers and accepted friends;
- privacy-aware activity feed;
- reactions to eligible completions, achievements, matches, and event stamps;
- recent teammates and played-together context;
- personal highlights;
- notification controls;
- game recommendations from friends;
- small Gaming Circles for squad comparisons.

### Team capabilities

- team Passport;
- current and historical roster;
- member roles;
- supported games;
- tournament and match history;
- verified team achievements;
- recruitment status;
- team comparison;
- shared team card.

### Feed rules

- only meaningful, visibility-safe actions produce feed objects;
- edits are deduplicated;
- users control activity categories;
- no private game journal text enters public activity;
- sensitive reward, payout, moderation, or dispute actions never enter feeds;
- users can hide an individual activity object;
- reactions are rate-limited and reportable.

### Acceptance criteria

- Feed visibility matches source-object visibility under all tested combinations.
- Team history differentiates current and former membership.
- Users can stop following without breaking verified historical records.
- Activity notifications can be disabled by category.
- Gaming Circle comparisons work for 3-8 users without exposing hidden data.

### Release gate metrics

- improved four-week retention among users with at least two relationships;
- meaningful activity interaction without report-rate spikes;
- team profile usage correlates with tournament participation;
- notification opt-out and complaint rates remain within an approved threshold.

### Phase 5 implementation status - local, migration-ready

Implemented on 2026-08-12 for Mechi V5:

- source-backed activity objects for game completions, achievements, verified matches, Event Passport credentials, and team membership;
- rebuildable activity projection with stable source deduplication and automatic retraction when a source disappears, is revoked, becomes private, or its category is disabled;
- effective feed audience calculated from the most restrictive of Passport default visibility, field visibility, and source-object visibility;
- a relationship-scoped activity feed for the owner, followed players, and accepted friends with block enforcement and cursor pagination;
- explicit exclusion of private journal/review text, payouts, reward eligibility, disputes, and moderation actions from the activity contract;
- structured `GG`, fire, clap, and trophy reactions with serialized mutation, one reaction per user/object, toggle behavior, and a 20-attempt-per-minute database rate limit;
- visibility revalidation before reactions and reports so stale feed objects cannot be used to bypass tightened privacy;
- actor hide controls and a deduplicated activity-report queue that rejects self-reports, hidden/retracted activity, blocks, and unauthorized friends-only activity;
- separate sharing controls for completions, achievements, matches, events, and teams, plus independent reaction and Gaming Circle notification controls;
- owner-curated Passport Highlights backed only by authoritative game, achievement, match, event-credential, or active-team sources;
- a Highlights studio with public, friends-only, and private visibility and explicit consent requirements for HTTPS media;
- recent played-together context derived from completed Mechi matches with block filtering;
- private, member-visible Gaming Circles enforcing 3-8 distinct members, owner inclusion, and accepted friendship for every invited member inside one locked database transaction;
- Circle comparisons that omit competitive aggregates for members whose competitive Passport field is private;
- public Team Passports with current and former roster history, roles, supported games, tournament entries, member match summary, recruitment status, and captain-managed presentation settings;
- public team-versus-team comparison pages and APIs using only visible Team Passports;
- 1200x630 Team Passport share cards wired into public-page Open Graph and Twitter metadata;
- verified team achievements with immutable public tokens, source identity, issue history, active/revoked audit state, organizer/moderator issuance, and moderator revocation;
- public verification pages and APIs for both active and revoked team achievements;
- captain links from the team workspace into the public Team Passport and its settings;
- RLS enabled and browser database roles revoked for all Phase 5 community tables, with targeted foreign-key, feed, moderation, and rate-limit indexes.

Local release checks:

- production TypeScript source check reaches only pre-existing test-fixture errors and reports no Phase 5 source errors;
- focused ESLint for Phase 5 services, routes, pages, and interactive components: passing;
- Phase 5 privacy, feed, reaction, report, Circle, roster-history, team-verification, and notification contract tests: 10/10 passing;
- full Next.js production build was attempted but exceeded the five-minute local verification window without emitting a compiler error; it remains a release-gate check;
- local Supabase lint was attempted but Docker/Postgres was not running on `127.0.0.1:54322`; no live database was contacted;
- Phase 5 migration is mirrored exactly at the end of the empty-project bootstrap after final validation.

Production gates still requiring the Boss's approval and live infrastructure:

- apply `20260812152249_passport_activity_teams_community.sql` to Supabase;
- run visibility-matrix tests against deployed RLS and verify public, friends-only, private, block, unfollow, and revoked-source behavior;
- confirm feed projection and reaction-attempt retention jobs, moderation ownership, report response times, and notification-volume thresholds;
- reconcile team tournament achievements and historical membership against a production-like snapshot before promotion;
- smoke-test team-card previews, public verification links, organizer issuance, moderator revocation, and captain settings from the deployed origin;
- review database advisors and query plans for relationship feeds and large-circle match histories after representative data is loaded;
- release only behind the existing Passport rollout controls until report rate, opt-out rate, and four-week relationship-cohort retention meet the approved gates.

## Phase 6 - Progression, Customization, and Growth Products

### Goal

Make the Passport collectible and expressive while protecting trust and keeping core identity free.

### Capabilities

- Gamer Dimensions and level progression;
- meaningful achievement families;
- rare and event-limited badges;
- profile themes;
- avatar frames;
- featured showcases;
- custom shelves;
- animated or premium card styles under performance limits;
- Annual PlayMechi Replay;
- sponsor-safe event cards;
- organizer and creator media kits.

### Achievement rules

- achievements document requirement, issuer, date, and rarity;
- competitive achievements require verified sources;
- self-reported library activity can unlock low-risk personal milestones but not high-trust competitive awards;
- revoked source records trigger achievement re-evaluation;
- limited badges disclose issuance criteria;
- paid items never imitate verification marks.

### Monetization candidates

Free:

- core Passport;
- game library;
- public comparisons;
- verified history;
- standard Gamer Card;
- basic privacy.

Pro or Elite candidates:

- additional showcase slots;
- advanced personal analytics;
- extended season history presentation;
- premium themes and frames;
- custom comparison cards;
- advanced Gamer CV layouts;
- profile media kit;
- private custom shelves and journals;
- organizer/team analytics.

### Acceptance criteria

- Free users retain a complete, credible identity.
- Paid cosmetics cannot be mistaken for rank or verification.
- Gamer Dimension formulas have user-readable explanations.
- Replay values reconcile with source data and label estimates.
- Premium media remains performant on mobile.

### Release gate metrics

- customization increases profile shares or return visits;
- free-to-paid conversion occurs without reducing Passport activation;
- no measurable confusion between cosmetics and verified status;
- Replay has strong completion and share rates among eligible users.

### Phase 6 implementation status - 13 August 2026

Status: implementation complete in the Mechi V5 workspace. Production rollout remains gated on applying `20260813101621_passport_progression_customization_replay.sql` and completing the live verification checklist below. This pass did not mutate Supabase production, deploy code, or publish user-visible messaging.

#### Shipped product contract

- six independent 0-100 Gamer Dimensions: Competitor, Explorer, Completionist, Community, Event Presence, and Team Player;
- a 1-100 Passport Level derived from the six-Dimension total, explicitly described as breadth of progress rather than a universal skill or rank;
- user-readable contribution inputs and formula explanations on both the owner dashboard and public Passport;
- achievement families with requirement, issuer, issuance date, rarity, trust tier, source type, active/revoked state, and limited-edition window support;
- deterministic achievement projection and re-evaluation from current authoritative sources;
- free core theme, frame, Gamer Card, all six Dimensions, achievement cabinet, and three showcase slots;
- server-enforced Pro/Elite cosmetic entitlements, six/nine showcase slots, custom shelves, and public media-kit publishing;
- cosmetic catalogue constraints that require `is_cosmetic = true` and `resembles_verification = false` for every item;
- public showcase visibility inherited from public/friends/private audience rules and accepted-friend checks;
- named game shelves built only from game entries owned by the player;
- Annual Replay snapshots with explicit source cutoff, year-to-date/final state, exact-value block, separately modeled estimate block, and public/private share control;
- public Replay pages and 1200x630 PNG cards with reproducible source disclosure;
- public creator/organizer media kits with an HTTPS inquiry URL and section-level inclusion controls;
- sponsor-safe Event Passport cards that remove the public handle while retaining credential state, source, occurrence date, and verification URL;
- public Passport integration for selected theme/frame, Passport Level, Dimensions, showcases, achievement cabinet, and shelves.

#### Dimension formula version `v1`

The formula deliberately rewards different gamer identities without collapsing them into one competitive leaderboard:

| Dimension | Inputs | Current points | Trust boundary |
| --- | --- | --- | --- |
| Competitor | completed Mechi matches, recorded wins | `4 per match + 2 per win` | verified match records only |
| Explorer | library titles, distinct genres | `7 per title + 6 per genre` | owner-recorded library identity |
| Completionist | completed and replaying titles | `14 per completion + 5 per replay` | owner-recorded library identity |
| Community | accepted friendships, reactions received | `9 per friend + 2 per reaction`, reactions capped at 25 points | accepted relationships and retained activity reactions |
| Event Presence | distinct events with active presence credentials | `22 per event` | registration never counts; checked-in/attended/competed/placement/staff/organizer/streamer credentials only |
| Team Player | active team memberships | `35 per active team` | current Mechi team membership only |

Every Dimension is independently clamped to 100. Passport Level maps the total 0-600 Dimension points to levels 1-100. Formula versions are persisted so a later rebalance can be audited and replayed.

#### Storage and API surface

New server-mediated storage:

- `passport_dimension_snapshots`;
- `passport_achievement_definitions` and `passport_achievement_awards`;
- `passport_cosmetic_catalog` and `passport_customizations`;
- `passport_showcase_items`;
- `passport_custom_shelves` and `passport_custom_shelf_items`;
- `passport_replay_snapshots`;
- `passport_media_kit_settings`.

All Phase 6 tables have RLS enabled, direct `anon` and `authenticated` table privileges revoked, and access granted only to `service_role`. Owner access, source ownership, visibility, friendship, entitlement, and public-token rules are enforced by application services before mutation or disclosure.

Owner endpoints:

- `GET /api/passport/progression`;
- `GET|PATCH /api/passport/customization`;
- `GET|POST|DELETE /api/passport/showcase`;
- `GET|POST /api/passport/shelves`;
- `GET|POST|PATCH /api/passport/replay`;
- `GET|PATCH /api/passport/media-kit`.

Public surfaces:

- `GET /@username` for integrated Passport progression and collectibles;
- `GET /replay/:token` and `GET /api/passport/replay-cards/:token` for public Replays;
- `GET /media-kit/@username` for enabled, plan-eligible media kits;
- `GET /api/passport/event-cards/:token?sponsor=1` for sponsor-safe credentials.

#### Entitlement and trust decisions

- Progression, credible identity, verified history, privacy, and a standard shareable profile remain free.
- Payment expands presentation capacity; it cannot increase a Dimension, award an achievement, alter match/event facts, or generate a verification-looking mark.
- Custom shelves and media-kit publishing are Pro/Elite expansion products. If a plan expires, the stored settings remain recoverable but the public media kit stops resolving and locked cosmetics cannot be newly selected.
- Showcase source validity is checked server-side against the current owner and active/revoked state.
- Achievement revocation is reversible: when an eligible source returns, deterministic projection restores the active award without inventing a second award.
- Event Presence excludes registration-only credentials, preserving the Phase 4 distinction between intent and actual presence.
- Replay currently publishes only exact source-derived values. The estimate array exists for future formulas, but every estimate must carry a label, value, and explanation before display.

#### Local verification evidence

- focused Phase 6 contract suite: 8/8 passing, including nested shelf/showcase visibility non-escalation;
- focused ESLint across Phase 6 services, route handlers, owner pages, public pages, image routes, and the integrated public Passport: passing with no warnings;
- repository TypeScript check reaches only pre-existing test-fixture errors and reports no Phase 6 source error;
- the Phase 6 migration is mirrored at the end of `supabase/bootstrap_from_empty_project.sql`;
- the full Next.js production build was attempted but exceeded the six-minute local verification window without emitting a compiler error; it remains a release-gate check;
- local Supabase lint reached the connection step but the local Docker/Postgres stack was not running; no remote database was contacted;
- no live database, deployment, or production runtime was changed.

#### Production rollout gates

- apply migrations through `20260813101621_passport_progression_customization_replay.sql` to a non-production environment first;
- run Supabase database lint, advisors, and representative query plans for projection, showcase, shelves, and public Replay lookups;
- backfill customizations/media-kit defaults and verify counts against `profiles`;
- exercise source revocation and restoration for match, event, team, game, and friendship achievement inputs;
- validate Free, Pro, expired-Pro, Elite, and forged-client entitlement cases against every mutation route;
- test public/friends/private showcase and shelf visibility, blocked-player behavior, private Replay 404s, and plan-expired media-kit 404s;
- verify Replay reconciliation for current-year, past-year, zero-activity, old-entry/new-completion, draw, and revoked-credential cases;
- run production build plus authenticated desktop/mobile browser stories against the migrated environment;
- measure Phase 6 activation, customization adoption, public share rate, Replay completion/share rate, paid conversion, and verification-confusion support reports before broad release.

## Phase 7 - Platform Connections and Ecosystem Scale

### Goal

Reduce manual entry and make the Gamer Passport portable across gaming services without surrendering product usefulness to third-party APIs.

### Connection sequence

1. Game catalogue metadata provider.
2. Steam or another accessible library connection.
3. Approved achievement and play-history connections.
4. Creator or streaming connections.
5. Additional console or publisher integrations where terms and access permit.

### Connection requirements

- explicit authorization;
- verified ownership;
- granular scopes;
- encrypted token storage;
- clear last-sync state;
- revocation and deletion;
- idempotent imports;
- source attribution;
- conflict resolution between manual and synced records;
- compliance with provider caching, display, and branding terms;
- graceful behavior when an API is unavailable.

### Import conflict rules

- platform-synced facts do not silently delete personal notes;
- manual status can coexist with platform play history where appropriate;
- authoritative external achievement data overrides conflicting achievement counts but does not erase the audit history;
- users can hide imported titles without disconnecting the provider;
- deleted connections stop future sync and follow provider-specific retention rules.

### Ecosystem capabilities

- public developer API for user-authorized Passport summaries;
- embeddable Gamer Card;
- partner event stamp issuance under approval;
- webhooks for verified event and achievement changes;
- sponsor and scouting views;
- physical Passport or NFC pilot after validation.

### Acceptance criteria

- A provider outage does not make core Passports unavailable.
- Imports are repeatable without duplicates.
- Revoked connections cannot continue syncing.
- Partner-issued records are visibly distinguished from Mechi-issued records.
- API consumers receive only scopes explicitly approved by the user.

### Phase 7 implementation status - completed locally on 2026-08-13

Phase 7 establishes the first external platform connection and the security boundary for the wider Passport ecosystem. Steam is the only provider marked `available`. Twitch, YouTube, Xbox, PlayStation Network, and Nintendo are deliberately represented as `planned`; the interface must never imply that an unavailable or unofficial integration works.

No external provider is required to render, edit, compare, or share a core Gamer Passport. Connection failures are isolated to the connection surface and return player-safe recovery messages.

#### First provider: Steam

The Steam connection uses Steam OpenID for account ownership and the server-side Steam Web API for owned-game retrieval.

- Mechi never asks for or receives the player's Steam password.
- Connection intent state contains 32 random bytes and only its SHA-256 digest is stored.
- An intent expires after ten minutes and can be consumed once.
- Callback verification requires the exact expected OpenID endpoint, namespace, claimed identity, identity, response mode, and return URL.
- Mechi posts the signed fields back to Steam using `check_authentication` and accepts only an exact valid response.
- A verified Steam account can belong to only one Mechi account at a time.
- The Steam Web API key remains server-only and is never included in a browser payload.
- Provider account IDs and token envelopes never appear in the connection DTO returned to the client.
- A private or unavailable Steam library produces a recoverable sync error; the existing Passport remains usable.
- A sync stages at most 5,000 titles per run to bound memory, request size, and review workload.

Required release configuration names:

- `STEAM_WEB_API_KEY` for server-side Steam library and optional profile retrieval;
- `PASSPORT_CONNECTION_ENCRYPTION_KEY` as a dedicated 32-byte hex or base64url key for authenticated encryption of future OAuth credentials and webhook signing secrets.

Configuration values must be supplied through the production secret store. They must not be committed or exposed to clients.

#### Connection and import lifecycle

```text
not connected
    |
    v
intent created -> verified by provider -> connected
                                         |
                                         v
                                      syncing
                                         |
                     +-------------------+-------------------+
                     v                                       v
                 connected                              sync error
                     |
                     v
                  revoked -> reconnect or explicit provider-data erasure

external title discovered
    |
    v
pending review -> accepted -> imported Passport game
        |              |
        v              v
      hidden        restore/review later
```

Syncing is idempotent at two levels: each connection/run pair has a unique idempotency key, and each external item is unique by connection, item type, and provider item ID. Repeating the same provider response updates staging metadata instead of creating duplicate Passport games.

The player is always the publication authority. Newly synced titles default to private visibility and remain in a review inbox until accepted. Hiding a title does not disconnect Steam. Restoring it returns it to review.

#### Import conflict matrix

| Data | Provider contribution | Mechi rule |
|---|---|---|
| Game identity | Steam App ID and provider name | Resolves to a stable `steam-app-{appid}` catalogue key. |
| Playtime | Minutes reported by Steam | Keep the maximum recorded value so a partial response cannot move history backward. |
| Play status | Presence of playtime | Zero hours maps to backlog and positive hours maps to playing. Never infer story completion. |
| Completion | None | Only the player or an approved authoritative achievement source may establish completion. |
| Review, rating, favorite, featured, screenshot | None | Player-authored fields are preserved on every re-import. |
| Visibility | Import choice | Defaults to private; the player may explicitly select friends or public. |
| Removed provider item | Missing on a later sync | Mark the external item removed without deleting the Passport entry. |
| Disconnect | Provider authorization revoked | Stop all future syncs and clear stored credentials while keeping accepted Passport records. |
| Erase provider data | Explicit destructive choice | Delete staged/provider records; delete only untouched platform-only entries and convert enriched entries to manual ownership. |

Every accepted import records source attribution and an audit event. Public game views show the provider attribution only when the field is present; manual games remain visually neutral.

#### Phase 7 data model

| Table | Purpose | Primary safety property |
|---|---|---|
| `passport_provider_catalog` | Approved provider registry and capabilities | Availability is explicit; planned providers cannot be started. |
| `passport_provider_connections` | User/provider connection state | Provider identity is globally unique and revocation clears token envelopes. |
| `passport_connection_intents` | Short-lived authorization intents | State is one-time and SHA-256 hashed. |
| `passport_provider_sync_runs` | Observable sync execution | Connection/idempotency uniqueness prevents duplicate runs. |
| `passport_external_items` | Staged provider records | Stable provider identity and payload hashes support repeatable imports. |
| `passport_import_events` | Import decision audit | Records action, visibility, and conflict outcome. |
| `passport_developer_tokens` | User-issued API credentials | Stores SHA-256 digests, scopes, limits, and revocation—not raw tokens. |
| `passport_developer_api_events` | Rate and response audit | A serialized transaction reserves capacity before serving data. |
| `passport_ecosystem_events` | Durable domain-event outbox source | Unique event keys make projections repeatable. |
| `passport_webhook_subscriptions` | User-controlled delivery destinations | HTTPS-only, scoped event types, encrypted signing secrets. |
| `passport_webhook_deliveries` | Retryable delivery outbox | Unique subscription/event/attempt identity. |
| `passport_partner_issuers` | Approved organizations | Status, allowed events, and issuance scopes are explicit. |
| `passport_partner_api_keys` | Partner bearer credentials | Raw key is shown once; only a digest remains. |
| `passport_partner_issuance_requests` | Staged partner claims | Idempotent, event-limited, and human reviewed before issuance. |

All Phase 7 tables have row-level security enabled. Direct `anon` and `authenticated` table access is revoked because Mechi's current auth boundary uses application-verified sessions and server-side service clients. The developer rate-limit reservation function is `SECURITY INVOKER`, locks the token row, acquires a transaction advisory lock, counts the current one-hour window, and creates a provisional audit event atomically.

#### User-authorized developer API

Developer credentials use the prefix `mchi_`; the raw token is displayed once and only its SHA-256 digest is stored. A user can revoke a token immediately or set an expiry.

Supported Phase 7 scopes:

- `passport.summary:read` - public-style identity and aggregate summary;
- `passport.games:read` - the owner's game library;
- `passport.competition:read` - competitive records;
- `passport.events:read` - event stamps and credentials;
- `passport.achievements:read` - achievement awards.

`GET /api/v1/passport` returns only the sections authorized by the token. The request budget is reserved transactionally before Passport data is read. The provisional audit response is finalized as 200, 403, 404, or 500. Bearer-token routes are exempt from browser-origin checks but remain separately rate limited.

Raw tokens cannot be recovered. Creating a replacement is the recovery flow.

#### Webhooks and delivery boundary

Users may register a public HTTPS endpoint for selected ecosystem events:

- `passport.updated`;
- `game.imported`;
- `achievement.issued` and `achievement.revoked`;
- `event.credential_issued` and `event.credential_revoked`.

Registration rejects credentials in URLs, non-HTTPS schemes, custom ports, localhost, `.local`, and private/link-local IPv4 ranges. Signing secrets are generated randomly, encrypted with AES-256-GCM using endpoint-bound associated data, and shown once.

Database triggers project Passport-profile, achievement, and event-credential changes into unique ecosystem events, then enqueue matching subscriptions into the delivery outbox. Phase 7 intentionally does not send outbound requests from the web process. A hardened worker remains a production rollout gate and must:

1. claim due deliveries without double-processing;
2. re-resolve DNS immediately before every request and reject private, loopback, link-local, metadata, and rebinding targets;
3. use a short connect and total timeout, a strict response-size limit, and no redirects;
4. sign the exact request body with the decrypted per-subscription secret;
5. retry only retryable responses with bounded exponential backoff and jitter;
6. disable or dead-letter repeatedly failing subscriptions;
7. emit delivery latency, retry, and failure metrics without logging secrets or private payloads.

The Developer Access interface labels outbound delivery as gated until this worker exists and is verified.

#### Approved partner issuance

Partner integrations are not permitted to write Passport credentials directly.

1. An administrator creates an issuer with a status, allowed event keys, and narrow scopes.
2. A raw partner key is displayed once; only its digest is stored.
3. The partner submits a claim with a bearer key and `Idempotency-Key`.
4. Mechi validates issuer approval, scope, event allow-list, subject username, and idempotency.
5. The request enters `pending_review` and has no public Passport effect.
6. An administrator approves or rejects it with reviewer identity and notes.
7. Approval uses the existing authoritative credential service and marks the source `approved_partner`.
8. Achievement issuance additionally requires an existing active definition whose verification level is `organizer_verified`.
9. An existing active award from another source cannot be overwritten by a partner request.

This separation keeps partner transport credentials, partner claims, human decisions, and final Passport evidence independently auditable.

#### Player-facing surfaces delivered

- `/passport/connections` - provider catalogue, connection health, sync controls, staged import inbox, disconnect, and explicit erasure;
- `/passport/developer` - token creation/revocation, scope selection, API example, webhook registration, and webhook disable controls;
- `/[handle]` and `/[handle]/games` - source attribution for synchronized games;
- admin partner endpoints - issuer creation/listing and staged issuance review;
- versioned bearer endpoints - scoped Passport read and partner issuance submission.

#### Phase 7 verification completed locally

- focused Phase 7 contract suite: 10/10 passing;
- repository TypeScript build configuration: passing with zero diagnostics;
- focused ESLint across Phase 7 services, route handlers, owner interfaces, public attribution views, and proxy rules: passing with no warnings;
- full Next.js 16.2.4 production build: passing, including all 236 generated static pages and every Phase 7 owner, admin, public, and API route in the build manifest;
- local Supabase database lint reached only the local connection step because Docker/Postgres was not running at `127.0.0.1:54322`; no remote database was contacted and database lint remains a non-production rollout gate;
- connection and API secrets are absent from all browser DTOs and are never stored in plaintext;
- core Passport reads have no dependency on provider services or Steam configuration;
- no live database, provider account, deployment, or production runtime was changed.

#### Production rollout gates

- mirror and review the migration in the empty-project bootstrap, then apply it to a non-production Supabase environment;
- run Supabase database lint, security/performance advisors, and representative plans for sync staging, API rate accounting, outbox enqueue, and partner review;
- configure distinct non-production Steam and encryption secrets and exercise successful, cancelled, replayed, expired, mismatched-return, and already-owned OpenID callbacks;
- verify public, private, empty, and oversized Steam libraries plus provider outage, timeout, malformed response, renamed title, removed title, and repeat-sync cases;
- exercise accept, hide, restore, disconnect, reconnect, and erase flows against manual-only, untouched-import, and enriched-import games;
- confirm every scope combination yields the minimum API representation and that revoked, expired, malformed, and rate-limited tokens fail closed;
- implement and security-review the isolated webhook delivery worker, including DNS rebinding protection, signature vectors, retry/dead-letter behavior, and secret rotation;
- test partner rejection, duplicate idempotency keys, disallowed events, missing scopes, revoked keys, suspended issuers, unknown users, and conflicting active awards;
- run the production Next.js build and authenticated desktop/mobile browser stories against the migrated environment;
- launch Steam behind a cohort flag, monitor connect completion, sync success, private-library errors, import acceptance, disconnect/erase success, support demand, and external API latency before wider release;
- keep NFC/physical Passport, sponsor/scouting distribution, additional providers, and direct outbound webhooks disabled until Phase 7 trust and retention metrics are validated.

## Phase 8 - Launch Readiness and Controlled Operations

### Goal

Turn the locally complete Gamer Passport into a reversible, measurable, supportable production capability. Phase 8 does not widen product scope. It provides the operational controls required to release Phases 1-7 without making external services, partner traffic, or background jobs a new single point of failure.

### Release principles

- production defaults fail closed for every external capability;
- cohort membership is deterministic so a player does not move in and out between requests;
- explicit beta users can be added without increasing the global percentage;
- turning a feature off blocks new risky activity but preserves disconnect, revoke, export, and erasure paths;
- core Passport identity, library, comparison, event history, and manual editing never depend on external rollout gates;
- external delivery is observable before it is scalable;
- operator actions that can contact third parties require authentication, confirmation, and audit;
- migrations, secrets, cron activation, and kill-switch changes remain separate production decisions.

### Rollout gates

| Gate | Environment name | Production default | Scope |
|---|---|---:|---|
| Platform connections | `PASSPORT_CONNECTIONS_ENABLED` | Off | New Steam authorization and sync. |
| Developer API | `PASSPORT_DEVELOPER_API_ENABLED` | Off | New user tokens, webhook registration, and token reads. |
| Partner API | `PASSPORT_PARTNER_API_ENABLED` | Off | Partner claim submission; admin review data remains accessible. |
| Webhook delivery | `PASSPORT_WEBHOOK_DELIVERY_ENABLED` | Off | Outbound delivery worker only. |
| External cohort | `PASSPORT_EXTERNAL_ROLLOUT_PERCENT` | 0 | Deterministic 0-100 cohort for connections and developer API. |
| Explicit beta users | `PASSPORT_BETA_USER_IDS` | Empty | Comma-separated internal user UUID allow-list. |

Boolean gates accept `true`, `1`, or `yes` and explicit false equivalents. In development they default on for local verification; in production they default off. Invalid or missing rollout percentage resolves to zero in production.

The same authorization check is enforced server-side. The browser's rollout message is explanatory only and is not a security boundary.

### Webhook delivery architecture

```text
authoritative Passport change
          |
          v
passport_ecosystem_events
          |
          v
matching subscription outbox row
          |
          v
atomic claim function
  FOR UPDATE SKIP LOCKED
          |
          v
DNS resolve + public-address validation
          |
          v
pinned-address HTTPS POST
  TLS verifies original hostname
  no redirects
  10 second deadline
  8 KiB response ceiling
          |
          v
atomic finalization
  delivered | retry attempt | terminal failure
          |
          v
operation metrics + admin control room
```

`claim_passport_webhook_deliveries` claims at most 50 records, defaults to 12, and uses `FOR UPDATE SKIP LOCKED` so concurrent workers do not wait on or duplicate each other's current rows. A worker killed after claiming does not strand the event forever: a delivery in `delivering` for more than five minutes becomes claimable again.

Each attempt is an immutable row. A retry creates attempt `n + 1`; the previous failure remains available for diagnosis. Eight consecutive failures automatically pause the subscription. A successful delivery resets its consecutive-failure count.

### Outbound request security

Every delivery attempt:

1. parses the stored endpoint again and requires HTTPS without embedded credentials or a custom port;
2. resolves every DNS answer immediately before the request;
3. rejects the endpoint if any answer is loopback, private, link-local, multicast, documentation-only, carrier-grade NAT, or otherwise non-public;
4. pins the validated address into the request lookup while retaining the original hostname for TLS Server Name Indication and certificate verification;
5. follows no redirects;
6. applies a ten-second total deadline and an 8 KiB response ceiling;
7. sends no cookies, internal authorization headers, player contact details, or provider credentials;
8. decrypts the signing secret only inside the server worker;
9. signs `timestamp + "." + exact JSON body` using HMAC-SHA-256;
10. identifies the logical event through `Idempotency-Key` and `X-Mechi-Event-Id` so receivers can deduplicate at-least-once delivery.

Signature headers:

- `X-Mechi-Webhook-Timestamp` - Unix seconds;
- `X-Mechi-Webhook-Signature` - `v1=<hex HMAC-SHA256>`;
- `X-Mechi-Event-Id` - stable ecosystem event UUID;
- `X-Mechi-Delivery-Id` - individual attempt UUID;
- `Idempotency-Key` - the stable ecosystem event UUID.

Receiver verification must reject stale timestamps, compute the HMAC over the raw body before JSON parsing, compare signatures in constant time, and persist the event ID before applying side effects.

### Retry policy

- retry: network failures, timeouts, HTTP 408, 425, 429, and 5xx;
- terminal failure: invalid/private target, oversized response, most other 4xx responses, or signing-secret decryption failure;
- exponential schedule: approximately 1 minute, 5 minutes, 30 minutes, 2 hours, 8 hours, 24 hours, and 48 hours;
- each delay receives 80-120% jitter;
- maximum eight attempts and eight consecutive failures before automatic pause.

### Scheduled operations

| Route | Schedule | Function |
|---|---|---|
| `/api/cron/passport-webhooks` | Daily at 02:15 UTC while delivery is launch-gated; every five minutes after the production plan upgrade | Claims and processes one bounded delivery batch. |
| `/api/cron/passport-retention` | Daily at 02:30 UTC | Removes expired operational data according to the retention contract. |

Both routes require `Authorization: Bearer <CRON_SECRET>`; the existing `X-Cron-Secret` compatibility path is also accepted for controlled internal invocation. A missing secret fails closed. Vercel schedules run only in production, and the webhook job returns without claiming anything while its rollout gate is closed.

### Retention contract

| Data | Retention |
|---|---:|
| Expired connection intents | Seven days after expiry |
| Provider sync run telemetry | 180 days |
| Developer API request telemetry | 90 days |
| Delivered, failed, or cancelled webhook attempts | 30 days after final update |
| Ecosystem events with no active queued delivery | 180 days |
| Operation-run telemetry | 180 days |

Pending, retrying, or delivering webhook work is never removed by cleanup. Accepted import audit events, partner issuance requests, partner review evidence, user-authored games, event credentials, achievements, and the Passport itself are not operational telemetry and are not deleted by this job.

### Admin launch control

`/admin/passport/operations` provides the primary-admin control room for:

- current environment gates and cohort percentage;
- connection and recent sync states;
- active token count;
- webhook subscription, queue, stale-claim, and failure health;
- pending partner-review pressure;
- recent webhook and retention operation runs;
- a manually confirmed one-batch delivery action;
- an audited manual retention action.

The admin endpoint is protected by the existing primary-admin host boundary and repeats application-level admin authorization. Manual external delivery is disabled unless storage is ready and the webhook kill switch is open.

### Operational schema

Phase 8 adds delivery claim time, duration, bounded error code, subscription pause reason/time, and `passport_operation_runs`. All new operational data remains RLS enabled, unavailable to `anon` and `authenticated`, and mediated by server-side service access. Queue functions use `SECURITY INVOKER`, an explicit search path, and service-role-only execution grants.

### Phase 8 acceptance criteria

- Production with no Phase 8 environment configuration sends no external requests.
- Two concurrent workers cannot claim the same active queue row.
- A crashed worker's claim is recovered without manual database editing.
- Every retry preserves the earlier attempt and receiver idempotency identity.
- Private DNS answers and DNS rebinding to private space fail before a request is sent.
- Redirect responses are recorded but never followed.
- Webhook secrets, provider credentials, and service-role keys never cross the server boundary.
- Disabling rollout does not remove a player's ability to revoke or erase existing access.
- Cleanup never deletes active delivery work or durable verification/audit evidence.
- The Boss can determine rollout state and queue health without querying raw tables.

### Phase 8 implementation status - completed locally on 2026-08-13

- atomic claim, stale recovery, finalization, retry, auto-pause, and retention functions implemented in `20260813113747_passport_launch_readiness_operations.sql`;
- feature gates applied to Steam start/sync, developer token/webhook creation, versioned Passport API, and partner submission API;
- hardened Node.js webhook worker implemented with public-address validation and pinned DNS;
- authenticated webhook and retention cron routes added to `vercel.json`;
- primary-admin launch control and audited manual actions implemented;
- focused Phase 8 contract suite: 9/9 passing;
- combined Phase 7 and Phase 8 contract suites: 19/19 passing;
- repository TypeScript check: passing with zero diagnostics after final worker hardening;
- focused ESLint across rollout, worker, operations, cron, admin, API-gate, and player-control surfaces: passing with no warnings;
- full Next.js 16.2.4 production build: passing, including 240 generated static pages and the Phase 8 admin/cron routes in the build manifest;
- Phase 8 migration is mirrored exactly at the end of `supabase/bootstrap_from_empty_project.sql`;
- local Supabase database lint reached only the local connection step because Docker/Postgres was not running at `127.0.0.1:54322`; no remote database was contacted and database lint remains a staging gate;
- no migration, secret, cron, external request, deployment, or production rollout was performed.

### Production rollout sequence

1. Apply all Passport migrations through Phase 8 to a disposable database, then staging.
2. Run database lint, security/performance advisors, migration replay, and representative queue plans.
3. Confirm the deployment plan supports all five configured cron jobs, the five-minute webhook schedule, and the 60-second function budget.
4. Configure staging encryption, Steam, and cron secrets; keep every Phase 8 production gate off.
5. Register a Mechi-controlled webhook receiver and verify canonical signature vectors, duplicate event handling, timestamp rejection, timeout, 4xx, 5xx, 429, oversized response, redirect, private DNS, mixed public/private DNS, and crash-recovery cases.
6. Validate retention counts against seeded data and confirm durable imports, partner requests, credentials, and achievements remain.
7. Enable connections for explicit staff UUIDs only; test connect, sync, import, disconnect, reconnect, and erasure.
8. Enable developer API for explicit staff UUIDs only; test every scope combination, expiry, revocation, and rate limit.
9. Enable webhook delivery only for the controlled receiver; monitor at least 48 hours with zero private-target requests, unresolved stale claims, or duplicate side effects.
10. Enable partner API for one approved sandbox issuer and maintain human review.
11. Advance the cohort 1% -> 5% -> 20% -> 50% -> 100% only after each observation window meets its gate metrics.

### Rollback sequence

1. Set the affected feature gate false; set `PASSPORT_EXTERNAL_ROLLOUT_PERCENT=0` for cohort features.
2. If external delivery is implicated, disable `PASSPORT_WEBHOOK_DELIVERY_ENABLED` first. Existing outbox records remain durable.
3. Do not roll back the schema merely to stop traffic; the feature gates are the first-line rollback.
4. Pause individual failing subscriptions from data/admin operations where necessary.
5. Preserve operation runs, delivery attempts, and audit logs for incident review.
6. Restore only after the cause and data impact are understood and a staging replay passes.

### Promotion metrics

- Steam connection completion rate >= 85% excluding explicit provider cancellation;
- successful or private-library-resolved sync rate >= 95%;
- imported-title duplicate rate < 0.1%;
- destructive erasure support incidents = 0;
- developer API 5xx rate < 0.5%;
- webhook successful delivery rate >= 99% for healthy controlled endpoints;
- stale claims unresolved after ten minutes = 0;
- webhook p95 worker duration remains within the serverless execution budget;
- unexpected subscription auto-pause rate < 1%;
- partner claims issued without human approval = 0;
- confirmed private-address outbound requests = 0;
- privacy or source-attribution severity-one incidents = 0.

## Phase Dependencies

```text
Phase 0: product contract and privacy
   |
   v
Phase 1: identity, schema, projections, compatibility
   |
   v
Phase 2: game library and shareable MVP
   |
   +-----------> Phase 3: comparison and relationships
   |                         |
   v                         v
Phase 4: competition and event trust
   |                         |
   +------------+------------+
                v
Phase 5: activity, teams, and community
                |
                v
Phase 6: progression, customization, monetization
                |
                v
Phase 7: external connections and ecosystem scale
                |
                v
Phase 8: launch readiness and controlled operations
```

Phase 4 can begin source-data preparation during Phase 2, but public event verification should not ship before Phase 1 privacy and trust contracts are complete.

## Recommended MVP Cut

If scope must be aggressively controlled, the first public release should contain only:

- unified `@username` Passport;
- identity, platforms, gamer archetypes, and privacy;
- five-game onboarding;
- playing, completed, favorite, and backlog states;
- automatically projected Mechi competitive summary;
- automatically projected PlayMechi participation summary with honest status labels;
- one featured showcase;
- one-to-one comparison;
- games in common;
- verified head-to-head where available;
- standard Gamer Card;
- WhatsApp-friendly sharing;
- analytics and report/block foundations.

Do not delay this MVP for:

- console account syncing;
- public comments;
- animated themes;
- physical cards;
- complex AI recommendations;
- a full game-review community;
- sponsor dashboards.

## Initial Backlog by Epic

### Epic A - Passport identity and privacy

- canonical public identity route;
- identity editor;
- field visibility controls;
- public/owner read models;
- compatibility redirects;
- OG metadata and share previews;
- block and report foundations.

### Epic B - Game catalogue and library

- provider adapter;
- local catalogue cache;
- search and deduplication;
- player game entries;
- status and rating flows;
- favorites and current play;
- library filters;
- spoiler handling.

### Epic C - Existing Mechi history projection

- match aggregation;
- rating and season summary;
- tournament participation;
- event state mapping;
- badges and achievements;
- team membership;
- repairable summary jobs.

### Epic D - Public Passport

- header and actions;
- overview modules;
- Games tab;
- Competitive tab;
- Events tab;
- Achievements tab;
- viewer-context module;
- empty states.

### Epic E - Comparison

- player selection;
- shared-game query;
- comparison summary;
- Taste Match explanation;
- rivalry record;
- event overlap;
- share card;
- invitation attribution.

### Epic F - Cards and sharing

- square card;
- vertical story card;
- horizontal link card;
- QR code;
- server-generated images;
- safe public cache;
- share analytics.

### Epic G - Admin and trust

- evidence review;
- verification issuance and revocation;
- duplicate game resolution;
- profile report queue;
- audit logs;
- repair and backfill controls.

## Quality and Acceptance Test Matrix

### Identity

- existing username resolves case-insensitively;
- reserved and unsafe usernames remain blocked;
- renamed users preserve approved redirects where supported;
- private identity fields never enter public payloads or metadata.

### Game library

- multiple editions resolve predictably;
- duplicate submissions are idempotent;
- completion and mastered states validate percentage rules;
- private entries are excluded from counts shown to others;
- spoiler content remains concealed in cards and metadata.

### Comparison

- both users' privacy is enforced;
- block rules are enforced in direct URLs and APIs;
- shared games are deterministic;
- head-to-head totals reconcile with match records;
- deleted or private items disappear from comparison caches.

### Events

- registration, check-in, attendance, competition, and placement are distinct;
- source edits correctly refresh Passport projection;
- revoked verification is removed from public display;
- event QR codes cannot be reused outside policy;
- private future attendance is not discoverable.

### Cards and metadata

- no sensitive data appears in generated images;
- long usernames and Unicode render safely;
- images remain legible at WhatsApp preview sizes;
- deleted or private profiles invalidate public card access as required;
- cards identify estimates and verification accurately.

### Accessibility and performance

- keyboard and screen-reader navigation;
- meaningful text alternatives;
- reduced-motion support;
- mobile layouts at common low-width devices;
- progressive image loading;
- usable profile core under slow connections;
- performance budgets for public Passport and comparison pages.

## Operational Requirements

- Verification, event results, reward eligibility, and payouts remain high-risk operations.
- Admin corrections require an audit trail.
- Public support agents may explain static Passport behavior but must not invent verification or reward state.
- Profile reports need a defined moderation owner and response path before public social growth.
- External imports require legal and privacy review.
- Physical-event check-in requires an offline or degraded-connectivity fallback.
- Source tables remain authoritative; Passport projections must be repairable.

## Key Risks and Mitigations

### Risk: empty profiles feel unimpressive

Mitigation:

- five-game onboarding;
- automatic Mechi history claims;
- strong empty states;
- immediate card generation;
- progressive prompts rather than a long form.

### Risk: users fabricate competitive history

Mitigation:

- visible fact-level verification;
- verified records ranked ahead of claims;
- no high-trust badges or RP for unverified claims;
- evidence review and revocation.

### Risk: third-party game catalogue dependency

Mitigation:

- provider adapter;
- local canonical IDs;
- cached minimum metadata;
- admin resolution tools;
- no provider-specific identifiers in public product contracts.

### Risk: comparison causes unhealthy status pressure

Mitigation:

- independent Gamer Dimensions;
- highlight commonality and recommendations;
- no universal winner;
- privacy controls;
- playful, explainable Taste Match.

### Risk: social features create moderation cost

Mitigation:

- delay comments and DMs;
- begin with structured actions;
- rate limits, block, report, and visibility controls;
- moderation metrics before expansion.

### Risk: profile data model becomes another collection of columns

Mitigation:

- normalized relational entries;
- source-specific projections;
- rebuildable summaries;
- schema review before each new game-specific statistic.

### Risk: event participation language damages trust

Mitigation:

- separate registered, checked-in, attended, competed, and placed states;
- require source evidence for promotion;
- show issuer and verification date.

## Decisions Required from the Boss

Before Phase 1 implementation begins, approve or revise:

1. Product name: `PlayMechi Gamer Passport`.
2. Canonical public URL: `mechi.club/@username`.
3. Initial market wording: Africa-first or globally neutral at launch.
4. Friend model: follow-only, mutual friends, or both.
5. MVP game metadata provider strategy.
6. Whether game hours are included in MVP or deferred.
7. Whether short public reviews are included in MVP.
8. Initial age and minor-account policy.
9. Which event history is eligible for the first backfill.
10. Free versus Pro showcase limits.

## Recommended Immediate Next Steps

1. Approve this blueprint as product direction.
2. Complete Phase 0 data and privacy contracts.
3. Produce low-fidelity flows for onboarding, public Passport, adding a game, and comparison.
4. Design the normalized schema and existing-data backfill.
5. Build a feature-flagged vertical slice for one existing Mechi user and one friend comparison.
6. Test with competitive, story-focused, and casual players before broad implementation.
7. Ship the MVP only after privacy, verification language, and existing-link compatibility pass review.

## Definition of Product Success

The Gamer Passport succeeds when a gamer wants to share it even without being asked, and when the recipient immediately wants to create their own so they can compare.

The long-term defensible loop is:

```text
Play games
  -> record identity
  -> attend and compete
  -> receive verified history
  -> compare with friends
  -> share
  -> bring new gamers and organizers
  -> create more matches and events
  -> strengthen every Passport
```

PlayMechi should own the connection between a gamer's memories, competition, community, and verified participation over time.
