# Game System — Full Redesign Spec

This document covers every game-facing system: ranking, leaderboard, 1v1 matches, lobbies, tournaments, rewards, and share.
It is organised as a single codex prompt. Implement each numbered section independently — they do not depend on each other except where stated.
Read `src/app/globals.css` and `src/lib/config.ts` before writing any code.

---

## Current system — what's broken and why

### 1. Rank math makes Silver trivial

Players start at ELO 1000, which maps to **Bronze II**. The threshold for Silver is 1100. A new player needs to win 3–4 matches to reach Silver. This destroys progression meaning.

The tier widths are also severely uneven:
- Bronze spans **1100 points** (0–1099)
- Silver spans only **200 points** (1100–1299)
- Legend has **no ceiling** (1900+)

A player going from 0 to Legend takes ~900 meaningful rating points. That is not a ranking system — it is a three-week grind.

### 2. Six ranked games, nine untracked

`TRACKED_RANKED_GAMES` includes: `efootball`, `fc26`, `mk11`, `nba2k26`, `tekken8`, `sf6`, `ludo`.

Not tracked despite being 1v1: `cs2`, `valorant`, `mariokart`, `smashbros`, `rocketleague`.
Not tracked in any performance system: `codm`, `pubgm`, `freefire`, `fortnite`.

Rocket League, Mario Kart, and Smash Bros are competitive 1v1 games with an active African playerbase. Leaving them out of ranking while listing them in the app is misleading.

CODM, PUBG Mobile, Free Fire, and Fortnite are inherently multi-player lobby games. ELO does not apply, but placement-based performance scoring does. They have no performance tracking today.

### 3. No seasons, no decay, no protection

No seasonal resets. A player who hit Diamond in the first month and never played again stays Diamond forever.
No inactivity decay at high tiers.
No promotion protection window (a player who just promoted to Gold can immediately drop back on their next loss).
No placement matches — new accounts get rated immediately on their first match.

### 4. Leaderboard only shows your games

The leaderboard page calls `filterRankedGames(user.selected_games)` and only renders tabs for games on the user's profile. A player who only plays eFootball cannot browse the Tekken leaderboard. This is a discovery dead end.

### 5. Tournament page has no bracket data in the list

The tournament list shows: title, slot count, start date, prize pool, action button. It does not show: format (single elimination vs round robin), region, or current round. A player cannot assess whether to join without clicking through to the detail page.

### 6. Lobby UX relies on WhatsApp for notifications

The lobby list hardcodes a WhatsApp group link as the notification mechanism for room drops. This is a workaround, not a feature. It should be removed from the UI and replaced with in-app lobby alerts.

### 7. Rewards do not differentiate by game

Every game earns the same RP rates. A player who wins a tournament in eFootball earns the same as one who finishes last in a PUBG lobby. Tournament performance and ranked milestones should carry specific RP weights.

---

## Section 1: New ranking system

### 1.1 New tier structure

Replace the 6-tier system with an 8-tier system with wider bands and a higher floor.

```ts
// Replace RANK_DIVISIONS in src/lib/gamification.ts

const RANK_DIVISIONS = [
  { min: 0,    max: 399,  tier: 'Rookie',      division: 'III', color: '#6B7280' },  // Grey
  { min: 400,  max: 599,  tier: 'Rookie',      division: 'II',  color: '#6B7280' },
  { min: 600,  max: 799,  tier: 'Rookie',      division: 'I',   color: '#6B7280' },
  { min: 800,  max: 1099, tier: 'Bronze',      division: 'III', color: '#CD7F32' },
  { min: 1100, max: 1349, tier: 'Bronze',      division: 'II',  color: '#CD7F32' },
  { min: 1350, max: 1599, tier: 'Bronze',      division: 'I',   color: '#CD7F32' },
  { min: 1600, max: 1899, tier: 'Silver',      division: 'III', color: '#C0C0C0' },
  { min: 1900, max: 2149, tier: 'Silver',      division: 'II',  color: '#C0C0C0' },
  { min: 2150, max: 2399, tier: 'Silver',      division: 'I',   color: '#C0C0C0' },
  { min: 2400, max: 2699, tier: 'Gold',        division: 'III', color: '#FFD700' },
  { min: 2700, max: 2949, tier: 'Gold',        division: 'II',  color: '#FFD700' },
  { min: 2950, max: 3199, tier: 'Gold',        division: 'I',   color: '#FFD700' },
  { min: 3200, max: 3499, tier: 'Platinum',    division: 'III', color: '#00CED1' },
  { min: 3500, max: 3749, tier: 'Platinum',    division: 'II',  color: '#00CED1' },
  { min: 3750, max: 3999, tier: 'Platinum',    division: 'I',   color: '#00CED1' },
  { min: 4000, max: 4349, tier: 'Diamond',     division: 'III', color: '#60A5FA' },
  { min: 4350, max: 4649, tier: 'Diamond',     division: 'II',  color: '#60A5FA' },
  { min: 4650, max: 4999, tier: 'Diamond',     division: 'I',   color: '#60A5FA' },
  { min: 5000, max: 5999, tier: 'Master',      division: '',    color: '#A855F7' },
  { min: 6000, max: Number.POSITIVE_INFINITY, tier: 'Grandmaster', division: '', color: '#EF4444' },
];
```

Update `TIERS` in `src/lib/config.ts` to match these new boundaries.

**Why this works:**
- Starting rating of 1000 → **Rookie III** — new players are clearly beginners
- Bronze starts at 800 — takes real wins to reach
- Master and Grandmaster are elite-only tiers with no division subdivisions
- 6000 Grandmaster is far enough from the start to be meaningful

### 1.2 Starting rating

Change `DEFAULT_RATING` from 1000 to **1000** (Rookie III). Do not change the constant name, just the contextual expectation. Rookie I caps at 799 — a player needs to actively improve before reaching Bronze.

Wait — the new Rookie III starts at 0. Set `DEFAULT_RATING = 500` so fresh accounts start at Rookie II, meaning they have room to drop and room to rise.

```ts
// src/lib/config.ts
export const DEFAULT_RATING = 500;
```

Update all DB migration defaults that reference `DEFAULT_RATING`. Any `rating_[game]` column default should be 500.

### 1.3 Placement matches

New accounts get **no rated rank** until they complete 5 placement matches per game.

DB change — add to `profiles`:
```sql
-- Per-game placement state. Key: game. Value: matches played before placement complete.
alter table profiles add column if not exists
  placement_matches jsonb not null default '{}';
```

Logic in the match completion route:
1. Read `profile.placement_matches[game]`
2. If count < 5: increment count, do NOT write to `rating_[game]` yet, mark match as unranked
3. At exactly 5 completed placement matches: compute the player's rating from those 5 games using provisional ELO (K=64 for each placement), write the final rating, clear the placement counter

Show "Placement (N/5)" instead of a rank division on the leaderboard and profile until placement is done.

### 1.4 Adaptive K-factor

Replace the fixed K=32 in `src/lib/elo.ts`.

```ts
export function getKFactor(rating: number, totalMatches: number): number {
  if (totalMatches < 10) return 64;  // New players swing fast
  if (rating >= 5000) return 16;     // Master+ converge slowly
  if (rating >= 4000) return 24;     // Diamond — stable
  if (rating >= 3200) return 28;     // Platinum — moderately stable
  return 32;                          // Bronze/Silver/Gold — standard
}
```

Pass both players' total match counts and ratings into the ELO calculation.

### 1.5 Promotion protection

After a player's ELO moves them into a new **tier** (not just division), flag them as protected for 3 matches. During protection, they cannot drop below the tier floor.

DB change:
```sql
alter table profiles add column if not exists
  rank_protection jsonb not null default '{}';
-- Shape: { "[game]": { tier: "Silver", protected_until_match: 47 } }
```

Logic: on tier promotion, write `{ tier: newTier, protected_until_match: totalMatches + 3 }`. On each match completion, if `totalMatches <= protected_until_match` and the rating drop would cross below the tier floor, clamp the rating to the tier floor.

Remove protection when `totalMatches > protected_until_match` or when the player promotes again.

### 1.6 Inactivity decay

For players at **Platinum and above**: if no ranked matches in the last 21 days, deduct 15 rating points per day until they drop to the bottom of Platinum (3200). This runs as a daily cron.

```ts
// New function in src/lib/gamification.ts

export const DECAY_RULES = {
  startTier: 'Platinum',       // Only Platinum+ decays
  minRating: 3200,             // Floor — never decays below Platinum III entry
  inactiveDays: 21,            // Grace period before decay starts
  dailyDecay: 15,              // Points per day
} as const;
```

Add a `POST /api/cron/rank-decay` route (protected by `CRON_SECRET` header check). Run daily.

### 1.7 Seasons

Season duration: 90 days (quarterly). At season end:
1. Archive current ratings in a `rank_seasons` table
2. Soft-reset: compress all ratings toward 1500 by 30%
   - New rating = currentRating - (currentRating - 1500) × 0.3
   - A player at 4000 resets to 4000 - (2500 × 0.3) = 3250
   - A player at 1000 resets to 1000 - (-500 × 0.3) = 1150

DB schema:
```sql
create table public.rank_seasons (
  id            serial primary key,
  season_number integer not null,
  game          text not null,
  user_id       uuid not null references profiles(id),
  peak_rating   integer not null,
  final_rating  integer not null,
  peak_tier     text not null,
  final_tier    text not null,
  matches       integer not null default 0,
  wins          integer not null default 0,
  ended_at      timestamptz not null default now()
);
create index on public.rank_seasons(user_id, game, season_number);
```

Add a `POST /api/cron/season-reset` route. Run once per quarter.

Current season number should be stored in `app_config` table or as an env var `CURRENT_SEASON=1`.

---

## Section 2: Game-by-game audit and changes

### 2.1 Add missing games to TRACKED_RANKED_GAMES

```ts
// src/lib/gamification.ts — replace TRACKED_RANKED_GAMES
export const TRACKED_RANKED_GAMES: GameKey[] = [
  'efootball',
  'fc26',
  'mk11',
  'nba2k26',
  'tekken8',
  'sf6',
  'ludo',
  'rocketleague',   // ADD — genuine 1v1 esport
  'mariokart',      // ADD — competitive 1v1
  'smashbros',      // ADD — competitive 1v1
  'cs2',            // ADD — 1v1 aim duel mode
  'valorant',       // ADD — custom 1v1 mode
];
```

Add the corresponding `rating_rocketleague`, `rating_mariokart`, `rating_smashbros`, `rating_cs2`, `rating_valorant` columns to `profiles` (default 500) and their wins/losses columns.

Migration:
```sql
alter table profiles
  add column if not exists rating_rocketleague integer not null default 500,
  add column if not exists wins_rocketleague   integer not null default 0,
  add column if not exists losses_rocketleague integer not null default 0,
  add column if not exists rating_mariokart    integer not null default 500,
  add column if not exists wins_mariokart      integer not null default 0,
  add column if not exists losses_mariokart    integer not null default 0,
  add column if not exists rating_smashbros    integer not null default 500,
  add column if not exists wins_smashbros      integer not null default 0,
  add column if not exists losses_smashbros    integer not null default 0,
  add column if not exists rating_cs2          integer not null default 500,
  add column if not exists wins_cs2            integer not null default 0,
  add column if not exists losses_cs2          integer not null default 0,
  add column if not exists rating_valorant     integer not null default 500,
  add column if not exists wins_valorant       integer not null default 0,
  add column if not exists losses_valorant     integer not null default 0;
```

### 2.2 Score reporting — extend to NBA 2K26

Currently only `fc26` and `efootball` use score-reported mode. NBA 2K26 is a score-heavy game. Add:

```ts
// src/lib/config.ts
const SCORE_REPORTED_GAMES = new Set<GameKey>(['fc26', 'efootball', 'nba2k26']);
```

### 2.3 Lobby-only games — add lobby performance scoring

CODM, PUBG Mobile, Free Fire, and Fortnite are lobby games with no ELO. Add a `lobby_score` system.

**Score formula (per lobby match):**

| Event | Points |
|---|---|
| 1st place | 10 |
| 2nd place | 7 |
| 3rd place | 5 |
| 4th place | 3 |
| Every kill | 1 |
| Win streak (3+ 1st places) | +3 bonus |

Add to `profiles`:
```sql
alter table profiles
  add column if not exists lobby_score_codm    integer not null default 0,
  add column if not exists lobby_score_pubgm   integer not null default 0,
  add column if not exists lobby_score_freefire integer not null default 0,
  add column if not exists lobby_score_fortnite integer not null default 0;
```

The lobby result report API (`POST /api/lobbies/[id]/result`) should accept:
```ts
{
  placements: Array<{ user_id: string; position: number; kills: number }>;
}
```

Compute and write lobby scores per player. Display on a **Lobby Rankings** tab in the leaderboard, separate from ranked 1v1.

### 2.4 eFootball — remove the hidden variant complexity

The `efootball_mobile` key with `canonicalGame: 'efootball'` is a legacy workaround. It exists to merge old mobile game IDs. Keep the normalization function `normalizeGameIdKeys` for backwards compatibility but stop surfacing this distinction anywhere in the UI. The `efootball_mobile` hidden flag already prevents it from appearing in selectors — leave it.

### 2.5 CS2 and Valorant — label as "Custom 1v1"

In the game config, add a `customMatch?: boolean` flag:

```ts
cs2: {
  label: 'CS2',
  platforms: ['pc'],
  mode: '1v1',
  steamAppId: 730,
  customMatch: true,           // ADD — signals that the match format is custom
},
valorant: {
  label: 'Valorant',
  platforms: ['pc'],
  mode: '1v1',
  customMatch: true,           // ADD
},
```

In the match page and challenge flow, when `GAMES[game].customMatch` is true, show a note: _"This is a custom 1v1 — both players agree on the format before playing."_ No other UI difference.

### 2.6 Game interface — add new fields

```ts
// src/types/index.ts — extend Game interface
interface Game {
  label: string;
  platforms: PlatformKey[];
  mode: GameMode;
  supportsLobby?: boolean;
  maxPlayers?: number;
  steamAppId?: number;
  hidden?: boolean;
  canonicalGame?: GameKey;
  customMatch?: boolean;          // NEW — custom room format, no standard structure
  hasLobbyScore?: boolean;        // NEW — participates in lobby performance scoring
  scoreReported?: boolean;        // NEW — mirrors SCORE_REPORTED_GAMES, for UI use
}
```

---

## Section 3: Leaderboard redesign

### 3.1 Show all games, not just profile games

**File:** `src/app/(app)/leaderboard/page.tsx`

Remove the `filterRankedGames(user.selected_games)` tab restriction. Replace with all ranked games:

```ts
const ALL_RANKED_GAMES = TRACKED_RANKED_GAMES;
const LOBBY_SCORE_GAMES: GameKey[] = ['codm', 'pubgm', 'freefire', 'fortnite'];
```

Add two tabs at the top of the page:
- **Ranked** (default) — 1v1 ELO leaderboard tabs per game
- **Lobby** — lobby score leaderboard tabs for CODM / PUBG / Free Fire / Fortnite

When viewing a game the user does not have on their profile, the Challenge button is hidden. Everything else is visible.

### 3.2 Show the user's own rank position

Below the leaderboard list, if the current user is not in the top 50, add a sticky "You" row:

```tsx
{/* After the entries list, if user is not in visible entries */}
{!isUserInList && userEntry && (
  <div className="mt-3 border-t border-[var(--border-color)] pt-3">
    <div className="flex items-center gap-2.5 rounded-xl bg-[var(--surface-live)] px-3 py-2.5">
      {/* same row layout as entries above, but with "You" badge */}
      <span className="text-xs text-[var(--text-soft)]">#{userEntry.rank} globally</span>
      {/* ... rest of row */}
    </div>
  </div>
)}
```

The `/api/users/leaderboard/[game]` API should accept a `?include_self=1` query param that adds the current user's row with their global rank position even if they are not in the top 50.

### 3.3 Page structure

Replace the current `circuit-panel` hero card + nested "Pick a game" card. Use the minimalist header pattern from the challenges redesign.

```
page-container  max-w-[64rem]
├── PageHeader
│   ├── h1 "Leaderboard"
│   ├── Mode tabs: Ranked | Lobby
│   └── Season chip (e.g. "Season 1")
├── GameTabs    (horizontal scroll)
├── RankTable   (or LobbyTable)
└── SelfRow     (sticky bottom — your rank if outside top 50)
```

No hero card. No description paragraph. No "Pick a game" section label. The tabs are the navigation.

### 3.4 LeaderboardEntry — update response

The API response for ranked leaderboard should include:

```ts
interface LeaderboardEntry {
  id: string;
  username: string;
  avatar_url: string | null;
  plan: 'free' | 'pro' | 'elite';
  rating: number;
  division: string;        // e.g. "Silver II"
  wins: number;
  losses: number;
  win_streak: number;
  placement_complete: boolean;   // NEW — false while in placement
  rank: number;                  // NEW — global rank number (1-indexed)
}
```

For lobby leaderboard:
```ts
interface LobbyLeaderboardEntry {
  id: string;
  username: string;
  avatar_url: string | null;
  lobby_score: number;
  matches_played: number;
  avg_placement: number;
  rank: number;
}
```

### 3.5 Platform filter

Add a platform filter chip row below the game tabs when the selected game supports multiple platforms:

```tsx
{gamePlatforms.length > 1 && (
  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
    <button onClick={() => setPlatformFilter(null)} className={...}>All platforms</button>
    {gamePlatforms.map((p) => (
      <button key={p} onClick={() => setPlatformFilter(p)} className={...}>
        {PLATFORMS[p].label}
      </button>
    ))}
  </div>
)}
```

Pass `?platform=[p]` to the leaderboard API. The API filters by players whose configured platform for that game matches.

---

## Section 4: Tournament system improvements

### 4.1 New tournament fields

Add to the `tournaments` table:

```sql
alter table tournaments
  add column if not exists format       text not null default 'single_elimination',
  -- 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss'
  add column if not exists platform     text,         -- required platform (ps/xbox/pc/mobile/nintendo)
  add column if not exists region       text,         -- optional region filter
  add column if not exists max_rounds   integer,      -- computed from size and format
  add column if not exists current_round integer not null default 0,
  add column if not exists rules        text;         -- freeform rules text, markdown
```

Update the tournament create form (`src/app/(app)/tournaments/create/page.tsx`) to include format selector, platform selector, and region selector.

### 4.2 Tournament list page

**File:** `src/app/(app)/tournaments/page.tsx`

**What to remove:**
- `circuit-panel` hero card with marketing h1
- Description paragraph

**What to replace it with:**

```
page-container  max-w-[64rem]
├── PageHeader
│   ├── h1 "Tournaments"
│   ├── live count chip
│   └── "Host tournament" btn-primary
├── FilterRow     (status tabs + game filter)
└── TournamentList
    ├── Desktop: flat table rows (existing pattern — keep)
    └── Mobile: flat rows with dividers (not cards-inside-cards)
```

**Add to each tournament row:**
- Format badge (`brand-chip` showing "Single Elim" / "Round Robin" etc.)
- Platform badge (`brand-chip-coral` showing "PlayStation" / "PC" / etc.)
- Current round indicator when `status === 'active'` (e.g., "Round 2/4")

**Mobile card → flat row:**

Replace the mobile card grid (3 stat boxes inside a card) with a flat two-line row matching the same pattern as the challenges and lobbies redesign.

```tsx
{/* Mobile tournament row — no nested stat boxes */}
<div className="flex flex-col gap-2 border-b border-[var(--border-color)] py-4 last:border-0">
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-[var(--text-primary)]">{tournament.title}</p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusClasses(tournament.status)}`}>
          {formatTournamentStatus(tournament.status)}
        </span>
        <span className="brand-chip px-2 py-0.5 text-[10px]">{game?.label ?? tournament.game}</span>
        {tournament.format && (
          <span className="text-[11px] text-[var(--text-soft)]">{formatLabel}</span>
        )}
      </div>
    </div>
    <div className="text-right">
      <p className="text-sm font-black text-[var(--brand-teal)]">
        {tournament.prize_pool > 0 ? `KES ${tournament.prize_pool.toLocaleString()}` : 'No prize'}
      </p>
      <p className="text-[11px] text-[var(--text-soft)]">
        {playerCount}/{tournament.size} · {formatTournamentDate(tournament)}
      </p>
    </div>
  </div>
  <Link href={`/t/${tournament.slug}`} className="btn-primary w-full py-2 text-xs text-center">
    {tournament.status === 'open' ? 'Join' : tournament.status === 'active' ? 'Watch live' : 'View bracket'}
  </Link>
</div>
```

### 4.3 Tournament detail — bracket visualization

**File:** `src/app/(app)/t/[slug]/page.tsx` (create if not yet existing, or update)

Add a `BracketView` component that renders the current bracket state.

For `single_elimination`: render a bracket tree. Use nested `div` columns for rounds. Each match cell: player A vs player B, with winner highlighted. No external library — pure JSX.

```tsx
function BracketView({ rounds }: { rounds: BracketRound[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {rounds.map((round) => (
        <div key={round.number} className="flex flex-col gap-3" style={{ minWidth: '160px' }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
            {round.label}
          </p>
          {round.matches.map((match) => (
            <BracketMatchCell key={match.id} match={match} />
          ))}
        </div>
      ))}
    </div>
  );
}

function BracketMatchCell({ match }: { match: BracketMatch }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-soft)]">
      {[match.player1, match.player2].map((player, i) => (
        <div
          key={player?.id ?? i}
          className={`flex items-center justify-between gap-2 px-3 py-2 ${
            i === 0 ? 'border-b border-[var(--border-color)]' : ''
          } ${player?.id === match.winner_id ? 'text-[var(--text-primary)]' : 'text-[var(--text-soft)]'}`}
        >
          <span className="text-xs font-semibold truncate">
            {player?.username ?? 'TBD'}
          </span>
          {player?.id === match.winner_id && (
            <span className="text-[10px] text-[var(--brand-teal)]">✓</span>
          )}
        </div>
      ))}
    </div>
  );
}
```

For `round_robin`: render a standings table (points, W/L/D).

### 4.4 Remove prize pool confusion

Currently shows "KES 0" when `entry_fee > 0` but `prize_pool === 0`. Replace with:

```tsx
{tournament.prize_pool > 0
  ? `KES ${tournament.prize_pool.toLocaleString()}`
  : tournament.entry_fee > 0
    ? 'Community prize'   // Organiser decides at time of payout
    : 'No prize'}
```

---

## Section 5: Lobby system improvements

### 5.1 Remove WhatsApp promo card from lobby list

**File:** `src/app/(app)/lobbies/page.tsx` lines 167–189.

Delete the entire `{WHATSAPP_GROUP_URL ? (...) : null}` block. This is a community support link, not a product feature. It does not belong inside the app's lobby browser.

The WhatsApp link (if needed) can live in a dedicated Community page or the app footer.

### 5.2 Lobby list — page header

Same hero card problem. Remove the `circuit-panel` wrapper, description paragraph, and `section-title` kicker. Replace with:

```
page-container  max-w-[64rem]
├── PageHeader
│   ├── h1 "Lobbies"
│   ├── open count chip
│   └── "Create lobby" btn-primary
├── GameFilter  (tab row)
└── LobbyList   (table on desktop, flat rows on mobile)
```

### 5.3 Mobile lobby rows — remove nested stat boxes

The mobile view has two stat boxes (Mode/Map and Players) inside a card. Replace with a flat two-line row:

```tsx
{/* Mobile lobby row */}
<div className="flex flex-col gap-2 border-b border-[var(--border-color)] py-4 last:border-0">
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{lobby.title}</p>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusClasses(lobby.status)}`}>
          {getStatusLabel(lobby.status)}
        </span>
        {isHost && <span className="brand-chip px-2 py-0.5 text-[10px]">Host</span>}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-[var(--text-soft)]">{game?.label ?? lobby.game}</span>
        {lobby.mode && <span className="text-[11px] text-[var(--text-soft)]">· {lobby.mode}</span>}
        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-soft)]">
          <Users size={10} />
          {memberCount}/{lobby.max_players}
        </span>
      </div>
    </div>
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${visibility === 'public' ? '...' : '...'}`}>
      {visibility === 'public' ? <Globe size={10} /> : <Lock size={10} />}
      {visibility}
    </span>
  </div>
  <div className="flex gap-2">
    <button onClick={() => router.push(`/lobbies/${lobby.id}`)} className="btn-outline flex-1 py-2 text-xs">View</button>
    {!isMember && !isFull && lobby.status === 'open' && (
      <button onClick={() => void handleJoin(lobby.id)} disabled={joiningId === lobby.id} className="btn-primary flex-1 py-2 text-xs">
        {joiningId === lobby.id ? 'Joining…' : 'Join'}
      </button>
    )}
  </div>
</div>
```

### 5.4 Lobby performance report

For lobby-score games (CODM, PUBG, Free Fire, Fortnite), add a result report screen to the lobby detail page.

The host can submit placements after a lobby session ends:

```tsx
{isHost && lobby.game in LOBBY_SCORE_GAMES && lobby.status === 'in_progress' && (
  <div className="mt-4">
    <h3 className="text-sm font-black text-[var(--text-primary)]">Submit results</h3>
    {members.map((member, i) => (
      <div key={member.id} className="flex items-center gap-3 py-2">
        <span className="text-sm text-[var(--text-primary)]">{member.username}</span>
        <select /* position */ />
        <input type="number" placeholder="Kills" /* kills */ />
      </div>
    ))}
    <button onClick={submitResults} className="btn-primary mt-3">Submit results</button>
  </div>
)}
```

This calls `POST /api/lobbies/[id]/result` and updates `lobby_score_[game]` on each player's profile.

---

## Section 6: 1v1 match system improvements

### 6.1 Match result — add optional notes field

In the match report form, add an optional text input for match notes:

```tsx
<input
  type="text"
  placeholder="e.g. Room code: 8472, best of 3"
  maxLength={200}
  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-sm"
/>
```

Store in `matches.notes` (add column: `alter table matches add column if not exists notes text`). Show in match history.

### 6.2 Match history page

Create `src/app/(app)/matches/page.tsx` if it does not exist as a standalone page.

Layout:
```
page-container  max-w-[52rem]
├── PageHeader ("Match history" + game filter)
└── MatchList   (flat rows with dividers)
    ├── Each row: opponent avatar, game chip, result chip (W/L), ±rating change, date
    └── Empty state: "No matches yet. Find someone to challenge."
```

Each row:
```tsx
<div className="flex items-center gap-3 border-b border-[var(--border-color)] py-3 last:border-0">
  <Initial name={opponentName} />
  <div className="min-w-0 flex-1">
    <div className="flex flex-wrap items-center gap-1.5">
      <p className="text-sm font-semibold text-[var(--text-primary)]">{opponentName}</p>
      <span className="brand-chip px-2 py-0.5 text-[10px]">{gameLabel}</span>
    </div>
    <p className="mt-0.5 text-[11px] text-[var(--text-soft)]">{formatTime(match.completed_at)}</p>
  </div>
  <div className="text-right">
    <span className={`text-sm font-black ${isWin ? 'text-[var(--accent-secondary-text)]' : 'text-red-400'}`}>
      {isWin ? 'W' : 'L'}
    </span>
    <p className="text-[11px] text-[var(--text-soft)]">
      {ratingChange >= 0 ? '+' : ''}{ratingChange}
    </p>
  </div>
</div>
```

### 6.3 Match page — show rank division change after result

When a match completes, if the player changed tier, show a brief promotion/demotion banner:

```tsx
{tierChanged && (
  <div className={`rounded-2xl border p-4 text-center ${promoted ? 'border-[var(--brand-teal)]/20 bg-[var(--brand-teal)]/5' : 'border-red-400/20 bg-red-500/10'}`}>
    <p className="text-sm font-black text-[var(--text-primary)]">
      {promoted ? `🎖️ Promoted to ${newTier}` : `⬇️ Dropped to ${newTier}`}
    </p>
    {promoted && protectionMatches > 0 && (
      <p className="mt-1 text-xs text-[var(--text-soft)]">
        Promotion protection active — {protectionMatches} matches before you can drop.
      </p>
    )}
  </div>
)}
```

---

## Section 7: Reward events — game-specific additions

Extend `REWARD_RULES` and `ways_to_earn` DB table with the following:

```ts
// Add to REWARD_RULES in src/lib/rewards.ts
tournament_win: 500,
tournament_runner_up: 200,
tournament_top_four: 75,
first_tournament_join: 100,
season_top_ten: 1000,            // End-of-season top 10 per game
perfect_bo3_sweep: 50,           // Win a BO3 without dropping a game
lobby_first_place: 30,           // First place in a lobby match
lobby_win_streak_3: 100,         // 3 consecutive first places in lobby
```

Seed these into the `ways_to_earn` table:

```sql
insert into public.ways_to_earn
  (id, title, description, rp_amount, category, frequency, sort_order) values
  ('tournament_win',        'Win a tournament',                    '+500 RP for winning any Mechi tournament.',                        500,  'match',   'per_event', 200),
  ('tournament_runner_up',  'Finish 2nd in a tournament',          '+200 RP for a runner-up finish.',                                  200,  'match',   'per_event', 210),
  ('tournament_top_four',   'Reach the semi-finals',               '+75 RP for a top-4 tournament placement.',                          75,  'match',   'per_event', 220),
  ('first_tournament_join', 'Join your first tournament',          '+100 RP the first time you enter any tournament.',                 100,  'match',   'once',      230),
  ('season_top_ten',        'Finish top 10 in season rankings',    '+1,000 RP per game where you finish in the top 10 at season end.', 1000, 'match',   'per_event', 240),
  ('perfect_bo3_sweep',     'Win a clean sweep (3-0 in BO3)',      '+50 RP for a flawless best-of-3.',                                  50,  'match',   'per_event', 250),
  ('lobby_first_place',     'Finish 1st in a lobby match',         '+30 RP for a first-place finish in any lobby game.',                30,  'match',   'per_event', 260),
  ('lobby_win_streak_3',    'Win 3 lobby matches in a row',        '+100 RP for 3 consecutive first-place lobby finishes.',            100,  'match',   'daily',     270);
```

Wire tournament completion reward events in the tournament advance API route (`POST /api/tournaments/[slug]/advance`): when a player wins the final, call `applyRewardEvent` with `event_type: 'tournament_win'` and `eventKey: \`reward:tournament-win:${userId}:${tournamentId}\``.

---

## Section 8: Share system — game-specific share cards

### 8.1 Rank card sharing

After each ranked match, the match result screen shows a "Share result" button. This generates an OG image showing:

- Player username + tier badge
- Game name + rating change
- Win/loss result
- Current win streak if ≥ 3

OG image route: `GET /api/share/rank-card?user=[id]&game=[game]&match=[id]`

### 8.2 Tournament bracket share

On the tournament detail page, add a "Share bracket" button that generates:

- Tournament title
- Game + format
- Current standing or final placement

OG image route: `GET /api/share/tournament?slug=[slug]&user=[id]`

### 8.3 Share RP reward — differentiate by content type

Currently all share actions earn 25 RP/day regardless of what was shared. Extend:

| Share type | RP |
|---|---|
| Profile share | 25 |
| Match result share | 40 |
| Tournament bracket share | 50 |
| Season rank share | 60 |

These are still capped at one reward per type per day. Update `/api/rewards/share-action` to accept `share_type: 'profile' | 'match' | 'tournament' | 'season'` and return the appropriate RP amount.

---

## Section 9: Profile — per-game stats display

### 9.1 Current profile shows no per-game breakdown

The profile page shows overall XP, level, win streak, and achievements. It does not show per-game rating or tier. Add a **Games** section to the profile.

**File:** `src/app/(app)/profile/page.tsx` (or the profile component) — add after the existing achievements section:

```tsx
function GameStats({ profile }: { profile: Profile }) {
  const trackedGames = TRACKED_RANKED_GAMES.filter((game) =>
    profile.selected_games.includes(game)
  );

  if (trackedGames.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold text-[var(--text-soft)]">Ranked games</span>
      </div>
      <div className="border-t border-[var(--border-color)]">
        {trackedGames.map((game) => {
          const rating = (profile as Record<string, unknown>)[`rating_${game}`] as number ?? 500;
          const wins   = (profile as Record<string, unknown>)[`wins_${game}`]   as number ?? 0;
          const losses = (profile as Record<string, unknown>)[`losses_${game}`] as number ?? 0;
          const division = getRankDivision(rating);
          const winRate = wins + losses > 0
            ? Math.round((wins / (wins + losses)) * 100)
            : 0;

          return (
            <div
              key={game}
              className="flex items-center justify-between gap-4 border-b border-[var(--border-color)] py-3 last:border-0"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="brand-chip shrink-0 px-2 py-0.5 text-[10px]">
                  {GAMES[game].label}
                </span>
              </div>
              <div className="flex items-center gap-3 text-right">
                <span className="text-[11px] text-[var(--text-soft)]">
                  {wins}W {losses}L · {winRate}%
                </span>
                <span
                  className="text-sm font-black"
                  style={{ color: division.color }}
                >
                  {division.label || 'Placement'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## Section 10: Achievements — extend for new events

Add new achievements to `ACHIEVEMENTS` in `src/lib/gamification.ts`:

```ts
// Rocket League
achievementReward('rl_ace', 'Supersonic Ace', 'Win 50 Rocket League matches', '🚀', 300, 200,
  (stats) => (stats.gameWins.rocketleague ?? 0) >= 50),

// Mario Kart
achievementReward('mk_podium', 'Podium Finish', 'Win 50 Mario Kart matches', '🏎️', 300, 200,
  (stats) => (stats.gameWins.mariokart ?? 0) >= 50),

// Smash Bros
achievementReward('sb_brawler', 'Main Brawler', 'Win 50 Super Smash Bros matches', '🥊', 300, 200,
  (stats) => (stats.gameWins.smashbros ?? 0) >= 50),

// Tournament achievements
achievementReward('tournament_debut', 'Tournament Debut', 'Join your first tournament', '🏆', 200, 150,
  (stats) => (stats.tournamentsJoined ?? 0) >= 1),

achievementReward('champion', 'Champion', 'Win a tournament', '👑', 500, 300,
  (stats) => (stats.tournamentsWon ?? 0) >= 1),

// Rank milestones (new tiers)
achievementReward('rookie_out', 'Out of Rookie', 'Reach Bronze rank', '🥉', 100, 75,
  (stats) => (stats.eloAfterWin ?? 0) >= 800),

achievementReward('silver_certified', 'Silver Certified', 'Reach Silver rank', '🥈', 200, 150,
  (stats) => (stats.eloAfterWin ?? 0) >= 1600),

achievementReward('gold_certified', 'Gold Certified', 'Reach Gold rank', '🥇', 300, 200,
  (stats) => (stats.eloAfterWin ?? 0) >= 2400),

achievementReward('diamond_certified', 'Diamond Certified', 'Reach Diamond rank', '💎', 400, 250,
  (stats) => (stats.eloAfterWin ?? 0) >= 4000),

achievementReward('master', 'Master', 'Reach Master rank', '💜', 500, 300,
  (stats) => (stats.eloAfterWin ?? 0) >= 5000),

achievementReward('grandmaster', 'Grandmaster', 'Reach Grandmaster rank', '🔴', 1000, 500,
  (stats) => (stats.eloAfterWin ?? 0) >= 6000),
```

Update `PlayerStats` interface to include:
```ts
interface PlayerStats {
  totalWins: number;
  winStreak: number;
  gameWins: Record<string, number>;
  totalMatches: number;
  achievementsUnlocked: string[];
  eloAfterWin?: number;
  tournamentsJoined?: number;   // NEW
  tournamentsWon?: number;      // NEW
}
```

Pass tournament data into `evaluateAchievements` calls from the tournament advance route.

---

## Section 11: Games page — add plan limits clarity

**File:** `src/app/(app)/games/page.tsx`

Current issue: the game limit (Free=1, Pro=3) is enforced silently. Players hit the limit without understanding why.

Add an inline plan gate message when a player tries to select more games than their plan allows:

```tsx
{isAtLimit && (
  <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
    <p className="text-sm text-amber-200">
      {plan === 'free'
        ? 'Free plan supports 1 game. Upgrade to Pro for 3 games.'
        : 'Pro plan supports 3 games. Upgrade to Elite for unlimited.'}
    </p>
    <Link href="/pricing" className="btn-primary shrink-0 text-xs">Upgrade</Link>
  </div>
)}
```

---

## Verification checklist

### Ranking
- [ ] New tier structure has 8 tiers (Rookie → Grandmaster) with wide bands
- [ ] `DEFAULT_RATING = 500` (Rookie II)
- [ ] Placement matches: 5 games before rated rank is shown
- [ ] Adaptive K-factor: 64 new players, 16 for Master+
- [ ] Promotion protection: 3 match buffer at new tier entry
- [ ] Inactivity decay: Platinum+ loses 15/day after 21 inactive days
- [ ] Season soft-reset: ratings compress 30% toward 1500
- [ ] `rank_seasons` table exists

### Games
- [ ] Rocket League, Mario Kart, Smash Bros, CS2, Valorant added to `TRACKED_RANKED_GAMES`
- [ ] DB columns for new game ratings/wins/losses exist
- [ ] NBA 2K26 added to `SCORE_REPORTED_GAMES`
- [ ] CODM, PUBG, Free Fire, Fortnite have `lobby_score_[game]` columns
- [ ] `customMatch` flag added to CS2 and Valorant
- [ ] `hasLobbyScore` flag added to lobby games

### Leaderboard
- [ ] All ranked games browsable regardless of user's profile games
- [ ] Lobby Rankings tab for CODM/PUBG/Free Fire/Fortnite
- [ ] User's own rank position shown if outside top 50
- [ ] Platform filter for multi-platform games
- [ ] No hero card / description paragraph / section-title kicker

### Tournaments
- [ ] `format`, `platform`, `region`, `current_round` columns added
- [ ] Tournament list: format + platform badge on each row
- [ ] Mobile rows: flat two-line layout, no nested stat boxes
- [ ] Prize pool shows "Community prize" not "KES 0" when no pool
- [ ] Bracket view on tournament detail page
- [ ] Tournament win/runner-up reward events wired in advance route

### Lobbies
- [ ] WhatsApp promo card removed from lobby list
- [ ] Hero card removed from lobby list
- [ ] Mobile rows: flat layout, no nested stat boxes
- [ ] Lobby result submission form for lobby-score games
- [ ] Lobby scores update `lobby_score_[game]` on profiles

### Matches
- [ ] Match notes field added (`matches.notes` column)
- [ ] Match history page exists at `/matches`
- [ ] Tier change banner shown after match completion
- [ ] Promotion protection message shown after tier promotion

### Rewards
- [ ] All 8 new earn methods seeded in `ways_to_earn` table
- [ ] Tournament win/runner-up events wired in tournament route
- [ ] Lobby first place event wired in lobby result route
- [ ] Season top 10 event wired in season reset cron
- [ ] Share action accepts `share_type` and returns correct RP per type

### Profile
- [ ] `GameStats` component renders per-game rating and division
- [ ] Shows "Placement" text when placement is incomplete

### Achievements
- [ ] 11 new achievements added (RL, MK, Smash, tournaments, new rank tiers)
- [ ] `PlayerStats.tournamentsJoined` and `tournamentsWon` used in evaluation

### General
- [ ] No TypeScript errors (`tsc --noEmit`)
- [ ] No ESLint errors
- [ ] All hero cards / `circuit-panel` wrappers removed from tournaments and lobbies list pages
- [ ] All mobile stat box grids replaced with flat divider rows
