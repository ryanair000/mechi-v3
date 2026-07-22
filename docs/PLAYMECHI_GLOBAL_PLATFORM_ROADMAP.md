# PlayMechi Global Platform Roadmap

Owner: Mechi
Operating target: make PlayMechi an Africa-first tournament platform in the same category as global self-serve esports platforms, while keeping the current Mechi.club Online Gaming Tournament stable.

## Product North Star

PlayMechi should become the tournament operating system for African gaming communities:

- Players discover tournaments, register, check in, play, submit results, watch streams, and track rewards.
- Organizers create tournaments, collect registrations, seed brackets, message players, verify results, manage disputes, and close payouts.
- Creators and communities publish recurring cups with their own pages, streams, sponsors, and audiences.
- Partners embed registration, pull public event data, and receive webhooks without needing Mechi staff to manually wire every event.

## Category Standard

To sit near Kafu, game.tv, Repeat.gg, Toornament, and start.gg, PlayMechi needs these platform muscles:

1. Self-serve depth: tournament creation, templates, rules, eligibility, registration forms, brackets, and result tools.
2. Discovery: public tournament marketplace by game, country, status, format, entry fee, prize, and organizer.
3. App ecosystem: player profile, game IDs, match history, rewards wallet, streams, and notifications.
4. Embedded registration: shareable tournament pages and iframe/script widgets for communities and creators.
5. Automation: reminders, check-in, slot locking, bracket seeding, result verification, no-show handling, payout state, and audit logs.
6. Scale: reliable data model, public APIs, webhooks, moderation, analytics, sponsor views, and operator controls.

## Phase 1 - Platform Foundation And Trust

Goal: make PlayMechi read as a platform, not only a one-off campaign, and fix the highest-risk launch mechanics.

Scope:

- Make `/playmechi` the public PlayMechi platform surface.
- Keep `/playmechi/register` alive for the current PlayMechi launch event.
- Add public tournament discovery at `/playmechi/tournaments`.
- Surface the current PlayMechi Launch event as one featured event inside the marketplace.
- Fix launch-event state consistency and obvious trust issues.
- Add a roadmap reference for operators and engineering.

Acceptance criteria:

- A new visitor can understand PlayMechi as a tournament platform within the first viewport.
- A player can reach current tournament registration and general tournament browsing from `/playmechi`.
- A creator can see the path to host a tournament.
- The launch event no longer hard-codes one game as full while marketing says 216 slots.
- Battle Royale verified-result counts reflect actual verified match submissions.
- Social proof checkboxes require deliberate player confirmation.

Implementation notes:

- Use existing tournament tables and APIs first.
- Do not create a second tournament system unless the current model cannot support the target.
- Keep the event-specific `online_tournament_*` tables for the launch event until the generic platform model can replace them cleanly.

## Phase 2 - Self-Serve Organizer V1

Goal: any trusted organizer can create and publish a basic tournament without code changes.

Scope:

- Improve `/tournaments/create` into a guided creator flow.
- Add tournament templates:
  - 1v1 knockout
  - mobile Battle Royale room series
  - creator cup
  - sponsored free-entry cup
- Add organizer profiles and public organizer pages.
- Add draft, preview, publish, and close states.
- Add rules builder fields:
  - format
  - schedule
  - check-in policy
  - result proof type
  - dispute window
  - prize terms
- Add reusable registration requirements:
  - account required
  - game ID required
  - WhatsApp required
  - social follow optional/required
  - country/region eligibility

Acceptance criteria:

- A Pro/Elite organizer can create a public tournament from a template.
- A tournament has a public page before players join.
- The organizer can edit details before publishing.
- Players see clear requirements before joining.

Implemented in this pass:

- Added template-backed creation for 1v1 knockout, creator cup, and sponsored free cup.
- Added organizer policy fields for check-in, proof type, dispute window, prize terms, and registration requirements.
- Persisted the template and policy choices into the public tournament rules block without requiring a production schema change.
- Added public organizer pages at `/o/[username]`.
- Routed the PlayMechi marketplace to public tournament share pages and organizer pages.

Remaining Phase 2 gaps:

- Draft/edit/publish states need a schema-backed publication model.
- Mobile Battle Royale self-serve creation stays disabled until the generic lobby-series engine exists.
- Organizer pages can later add branding, social links, sponsor slots, and creator analytics.

## Phase 3 - Registration, Check-In, And Bracket Automation

Goal: reduce manual operator work and make tournaments feel reliable at scale.

Scope:

- Transaction-safe slot allocation for generic tournaments.
- Configurable registration forms.
- Check-in windows and no-show handling.
- Auto-seeding options:
  - first registered
  - random
  - rating-based
  - checked-in players first
- Bracket lifecycle automation:
  - pending
  - ready
  - active
  - completed
  - disputed
- Public standings and brackets for all supported formats.
- WhatsApp, Telegram, email, and in-app reminders.

Acceptance criteria:

- Registration cannot oversell slots under concurrent joins.
- Organizers can seed brackets without manual SQL or code edits.
- Players receive timely reminders and check-in prompts.
- Public bracket pages update as matches advance.

Implemented in this pass:

- Added a Supabase migration and bootstrap update for generic tournament player check-ins.
- Added `claim_tournament_slot(...)` RPC to lock the tournament row before reserving a slot.
- Updated tournament join to use the atomic slot claim for free and paid reservations.
- Added generic tournament player check-in API and player-facing check-in button.
- Updated bracket start seeding so checked-in players are prioritized before registered-only players.

Remaining Phase 3 gaps:

- Waitlists, no-show automation, and multi-channel reminders need scheduled jobs and notification templates.
- Seeding choices can expand from checked-in-first to random, rating-based, and organizer-selected.
- Generic Battle Royale standings need the Phase 6/7 lobby-series model before self-serve mobile room events.

## Phase 4 - Result Verification, Disputes, And Payout Desk

Goal: make result handling and rewards trustworthy enough for sponsored events.

Scope:

- Unified result submission model across 1v1 and lobby/Battle Royale tournaments.
- Screenshot/video proof uploads.
- Result review queue for organizers and moderators.
- Dispute center with evidence, notes, status, and resolution.
- Payout ledger:
  - pending
  - approved
  - paid
  - failed
  - ineligible
- Player-facing payout status without exposing private finance details.
- Audit logs for all admin result, eligibility, and payout actions.

Acceptance criteria:

- Every winner/reward decision has a traceable review path.
- Players can see whether their result is pending, verified, rejected, or disputed.
- Operators can export prize and payout state after an event.

Implemented in this pass:

- Surfaced player-safe result, dispute, and payout state in the tournament detail page.
- Reused existing match score reporting, mismatch dispute, screenshot proof, admin audit, and tournament payout state.
- Kept private payout references/errors inside admin surfaces while showing players a safe payout status.

Remaining Phase 4 gaps:

- Dedicated organizer dispute center for all tournament matches.
- Exportable payout ledger for generic tournaments.
- Richer evidence timeline across screenshots, admin notes, score reports, and match escalations.

## Phase 5 - Creator And Community Growth Layer

Goal: turn organizers and streamers into growth loops.

Scope:

- Creator pages with tournaments, stream links, socials, and past winners.
- Stream scheduling and embedded live/VOD modules.
- Affiliate/referral links for creators.
- Public share cards for tournament registration and winners.
- Sponsor inventory:
  - title sponsor
  - prize sponsor
  - stream sponsor
  - creator sponsor
- Community tools:
  - WhatsApp group links
  - Discord links
  - announcement templates
  - reminder templates

Acceptance criteria:

- A creator can share one page that shows their tournament calendar.
- PlayMechi can attribute registrations to creators or campaigns.
- Sponsor-ready event pages can be generated without custom engineering.

Implemented in this pass:

- Added public organizer pages with hosted tournaments, active event count, total player count, and completed event count.
- Added WhatsApp share links for organizer pages.
- Added past-winner display on organizer tournament cards where a winner exists.
- Reused public tournament share pages as sponsor/creator-friendly event links.

Remaining Phase 5 gaps:

- Creator social links and branded sponsor slots need profile/schema support.
- Campaign attribution needs referral parameters stored on registration/join records.
- Sponsor reports and creator analytics need durable event/funnel tracking.

## Phase 6 - Embeds, APIs, And Partner Distribution

Goal: let communities and partners run PlayMechi registrations outside the Mechi app.

Scope:

- Public tournament API:
  - list tournaments
  - tournament detail
  - registrations summary
  - bracket/standings
  - stream state
- Organizer API keys.
- Webhooks:
  - registration.created
  - checkin.completed
  - match.ready
  - result.submitted
  - result.verified
  - tournament.completed
- Embeddable registration widget.
- Partner-safe rate limits and audit logs.
- API docs and examples.

Acceptance criteria:

- A partner can embed a registration widget on their own site.
- A partner can pull standings without asking Mechi for manual exports.
- Webhooks let creators automate community announcements.

Implemented in this pass:

- Added safe public tournament list API at `/api/public/tournaments`.
- Added safe public tournament detail API at `/api/public/tournaments/[slug]`.
- Added iframe-friendly tournament card route at `/embed/tournaments/[slug]`.
- Centralized public tournament shaping so marketplace, partner API, and embeds can share safe fields.

Remaining Phase 6 gaps:

- Actual registration widget submission still redirects to PlayMechi instead of embedded registration.
- Organizer API keys, rate-limit tiers, and webhook delivery need a dedicated partner auth model.
- Public standings/brackets can be added once result visibility rules are finalized for every format.

## Phase 7 - Scale, Moderation, And Analytics

Goal: operate many tournaments at once without losing trust.

Scope:

- Abuse detection:
  - duplicate accounts
  - repeated no-shows
  - suspicious score patterns
  - repeated disputes
- Organizer quality scores.
- Player reliability scores.
- Tournament analytics:
  - funnel conversion
  - drop-off
  - check-in rate
  - completion rate
  - dispute rate
  - payout time
- Sponsor reports.
- Admin dashboards by tournament, creator, game, and country.
- Data export and archival.

Acceptance criteria:

- Operators can identify broken tournaments before players complain.
- Sponsors can receive a clean report after an event.
- Mechi can scale across countries, games, and creators with clear operating metrics.

Implemented in this pass:

- Added organizer/admin-only ops metrics to tournament detail pages.
- Metrics include fill rate, check-in rate, match completion rate, and open dispute count.
- Reused loaded page data, so this adds no extra private analytics endpoint yet.

Remaining Phase 7 gaps:

- Abuse detection and organizer quality scoring need durable event history and thresholds.
- Sponsor reports need exportable post-event summaries.
- Cross-tournament dashboards by creator, game, and country should live in admin/data surfaces.

## Phase 8 - Mobile App And Regional Expansion

Goal: make PlayMechi feel native for recurring players.

Scope:

- Android-first tournament discovery.
- Push notifications for:
  - registration confirmation
  - check-in open
  - match ready
  - result review
  - payout update
- Country-specific tournament pages.
- Regional leaderboards.
- Local payment and payout adapters by market.
- Offline/online hybrid event support.

Acceptance criteria:

- Players can manage tournament participation from mobile without relying only on WhatsApp.
- Country pages make PlayMechi feel local in Kenya first, then Tanzania, Uganda, Rwanda, and Ethiopia.

Implemented in this pass:

- Added country filtering to the PlayMechi tournament marketplace.
- Added `country` filtering to `/api/public/tournaments`.
- Kept the regional model aligned with Kenya, Tanzania, Uganda, Rwanda, and Ethiopia location support already in Mechi.

Remaining Phase 8 gaps:

- Android-native tournament discovery and push notifications need app work after the web/API contract settles.
- Dedicated country landing pages can be generated from the marketplace country filter.
- Local payout/payment adapters by market need billing/finance approval and implementation.

## Operating Principles

- Keep player flows mobile-first.
- Prefer WhatsApp-native coordination where African communities already operate.
- Make every money, eligibility, and result decision auditable.
- Make public pages shareable without requiring login.
- Avoid one-off event code when a reusable template can carry the next event.
- Build with organizer self-service as the default and Mechi operator override as the safety layer.

## Immediate Phase 1 Checklist

- [x] Add this roadmap to the repo.
- [x] Build `/playmechi` as the platform/discovery page.
- [x] Build `/playmechi/tournaments` as the public tournament marketplace.
- [x] Keep launch registration at `/playmechi/register`.
- [x] Remove the hard-coded eFootball-only closed state and rely on time/window/real counts.
- [x] Make social proof confirmation opt-in instead of pre-checked.
- [x] Fix Battle Royale verified submission count.
- [x] Run lint/build or targeted TypeScript checks.
