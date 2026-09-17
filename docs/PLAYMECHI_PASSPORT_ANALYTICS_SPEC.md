# PlayMechi Gamer Passport analytics specification

Status: implemented V1 contract  
Schema version: `1`  
Product owner: Passport product lead  
Data owner: Mechi data/operations  
Decision review: weekly during rollout, monthly after general availability

## Measurement principles

- Events measure product behavior, not the content of a player's identity.
- Raw handles, names, game titles, opponent identifiers, contact data, URLs,
  tokens, free-form copy, IP addresses, and user agents are prohibited event
  properties.
- The subject UUID is pseudonymous, server-only, and removed automatically if
  the account is deleted. Anonymous events can omit it.
- Counts and percentages are bucketed before storage when exact values would
  create unnecessary cardinality.
- Events are stored for 180 days and then deleted by the existing Passport
  retention operation.
- Browser roles have no direct access to the event table. Database triggers and
  authenticated server routes are the only writers.
- Every event carries a SHA-256 deduplication key. Database lifecycle events use
  stable entity/version seeds; request events use a request/correlation seed;
  client share signals are bounded to a ten-second request window.
- Analytics failure never blocks a Passport read, card, comparison, CV, or owner
  mutation.

## Event contract

| Event | Trigger and owner | Purpose | Allowed properties | PII class | Deduplication | Primary decision/dashboard |
| --- | --- | --- | --- | --- | --- | --- |
| `passport_created` | First Passport identity row; Product | Measure identity adoption | `creation_source` | Pseudonymous | Once per subject | Monthly Active Gamer Passports and creation funnel |
| `passport_publication_changed` | Publication, discovery, or default audience change; Trust | Measure safe publication choices and reversals | `publication_status`, `discoverable`, `default_visibility` | Pseudonymous | Subject plus public version | Publication funnel and privacy reversals |
| `passport_onboarding_completed` | Five library entries plus at least one current game; Product | Measure first credible identity | `completion_version` | Pseudonymous | Once per completion version | Passport activation rate and time to activation |
| `passport_game_added` | New library entry; Product | Measure library adoption | `play_status`, `source_type`, `visibility` | Pseudonymous | Once per game-entry ID | Game-entry depth and import/manual mix |
| `passport_five_games_reached` | Fifth library entry; Product | Measure five-game activation | `game_count_at_milestone` | Pseudonymous | Once per subject | Five-game activation and time to fifth game |
| `passport_current_game_added` | Entry first becomes `playing`; Product | Measure current-game activation | `source_type`, `visibility` | Pseudonymous | Once per game entry | Current-game activation |
| `passport_record_claimed` | Verification record created; Trust | Measure verified identity growth | `subject_type`, `verification_state`, `source_type` | Pseudonymous | Once per verification record | Verification coverage and source mix |
| `passport_comparison_completed` | Successful authenticated comparison; Social | Measure tangible friend comparison | `relationship`, `shared_games_bucket`, `taste_match_bucket` | Pseudonymous | Request ID | First comparison and repeat comparisons |
| `passport_card_generated` | Successful or contained-fallback PNG generation; Growth | Measure first attractive artifact and renderer quality | `format`, `delivery`, `render_state` | Pseudonymous | Request ID | Card activation, format mix, renderer fallback rate |
| `passport_card_shared` | Clipboard, WhatsApp, or download action in owner studio; Growth | Measure intentional sharing | `format`, `channel` | Pseudonymous | Request/window | Share rate and channel mix |
| `passport_public_viewed` | Successful canonical page or public API projection; Growth | Measure Passport reach | `access`, `viewer_kind` | Pseudonymous | Request ID | Organic/public visits and friend-view usage |
| `passport_cv_viewed` | Successful public Gamer CV page; Competitive product | Measure professional presentation adoption | `surface` | None when subject unavailable | Request ID | CV reach |
| `passport_cv_downloaded` | Successful PDF generation; Competitive product | Measure durable CV value | `format` | None when subject unavailable | Request ID | CV download conversion |
| `passport_friend_action` | Friendship request/status/removal; Social | Measure social graph activation | `action` | Pseudonymous | Entity/action/transaction | Friend conversion and retention |
| `passport_replay_generated` | Annual Replay generated or regenerated; Growth | Measure annual retention artifact adoption | `replay_year`, `period_state` | Pseudonymous | Replay/generation time | Replay generation rate |
| `passport_replay_shared` | Public-link enablement or card download; Growth | Measure Replay distribution | `channel`, `replay_year` | Pseudonymous | Request/window | Replay share conversion |

## KPI definitions

All KPIs exclude synthetic subjects and known operator/test accounts in the
reporting layer. Calendar windows use UTC and are displayed with the operator's
selected timezone.

- **Monthly Active Gamer Passports (MAGP):** distinct `subject_user_id` with at
  least one owner action, public view, comparison, card, CV, friend, or Replay
  event in the trailing 30 days.
- **Passport completion rate:** distinct created Passports that emit
  `passport_onboarding_completed` within seven days divided by created
  Passports eligible for a full seven-day observation window.
- **Five-game activation:** distinct subjects emitting
  `passport_five_games_reached` divided by created subjects.
- **Current-game activation:** distinct subjects emitting
  `passport_current_game_added` divided by created subjects.
- **First comparison:** median time from `passport_created` to the first
  `passport_comparison_completed`, plus the percentage completing within seven
  days.
- **Time to first attractive card:** median time from `passport_created` to the
  first `passport_card_generated` where `render_state=rendered`.
- **Passport share rate:** subjects with `passport_card_shared` divided by
  subjects with a rendered card in the same cohort.
- **Public organic visits:** successful anonymous `passport_public_viewed`
  events. Search/referrer attribution is intentionally deferred until it can be
  collected without storing full URLs.
- **Repeat comparisons:** subjects with comparison events on at least two
  distinct UTC days in the trailing 30 days.
- **Event retention:** subjects with an event verification record who remain
  active in the following 30-day window versus matched activated subjects.
- **Trust coverage:** activated subjects with at least one active verification
  record; report separately by subject/source type.

## Required dashboard slices and guardrails

The core Passport dashboard must show the KPIs above by cohort, platform entry
surface, country only when the cohort is sufficiently large, and anonymous vs
authenticated viewer kind. It must also show:

- event ingestion delay and insert failures;
- duplicate suppression rate;
- rendered versus fallback cards by format;
- public/private/friends/discoverable population;
- event volume by schema version;
- retention deletions and oldest remaining event.

Never expose subject-level event streams in a general operations UI. Access to
raw rows is restricted to approved debugging/data-rights workflows and must be
audited.

## Release acceptance

- Migration applies cleanly to an empty database and an upgraded V5 database.
- RLS and grants deny `anon` and `authenticated` direct access.
- Runtime tests prove the property allowlist removes prohibited identifiers.
- A seeded end-to-end run produces creation, game, milestone, public-view,
  comparison, and card events without duplicate rows for the same dedupe key.
- The retention job deletes expired rows and reports the deletion count.
